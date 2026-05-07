use std::collections::{BTreeMap, HashMap};
use std::io::Cursor;

use calamine::{DataType, Ods, Reader, Xlsx};
use rust_xlsxwriter::Workbook;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeaderGuard {
  pub source: String,
  pub target: String,
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedPair {
  pub source: String,
  pub target: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub section: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub subsection: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub disabled: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportWordPair {
  pub source: String,
  pub target: String,
  pub level_id: i64,
  pub section_id: Option<i64>,
  pub disabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportSection {
  pub id: i64,
  pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportLevel {
  pub id: i64,
  pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportConjugation {
  pub tense: String,
  pub person: String,
  pub form: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportVerb {
  pub infinitive_source: String,
  pub infinitive_target: String,
  pub level_id: i64,
  pub section_id: Option<i64>,
  pub disabled: bool,
  pub conjugations: Vec<ExportConjugation>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedConjugation {
  pub tense: String,
  pub person: String,
  pub form: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedVerb {
  pub infinitive_source: String,
  pub infinitive_target: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub section: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub subsection: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub disabled: Option<bool>,
  pub conjugations: Vec<ParsedConjugation>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedSpreadsheetResult {
  pub pairs: Vec<ParsedPair>,
  pub verbs: Vec<ParsedVerb>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportPayload {
  pub word_pairs: Vec<ExportWordPair>,
  pub sections: Vec<ExportSection>,
  pub levels: Vec<ExportLevel>,
  pub file_label: String,
  pub source_label: String,
  pub target_label: String,
  pub verbs: Option<Vec<ExportVerb>>,
}

fn eq_guard(source: &str, target: &str, guard: &HeaderGuard) -> bool {
  source.trim().eq_ignore_ascii_case(guard.source.trim()) && target.trim().eq_ignore_ascii_case(guard.target.trim())
}

fn cell_to_string(cell: &dyn DataType) -> String {
  if cell.is_empty() {
    return "".to_string();
  }
  if let Some(s) = cell.get_string() {
    return s.to_string();
  }
  if let Some(i) = cell.get_int() {
    return i.to_string();
  }
  if let Some(f) = cell.get_float() {
    if f.fract() == 0.0 {
      return (f as i64).to_string();
    }
    return f.to_string();
  }
  if let Some(b) = cell.get_bool() {
    return b.to_string();
  }
  if let Some(e) = cell.get_error() {
    return format!("{e:?}");
  }
  cell.as_string().unwrap_or_default()
}

fn normalize_rows(mut rows: Vec<Vec<String>>) -> Vec<Vec<String>> {
  // Make all rows at least 5 cols to simplify indexing.
  for r in rows.iter_mut() {
    if r.len() < 5 {
      r.resize(5, "".to_string());
    }
  }
  rows
}

fn parse_rows(rows: Vec<Vec<String>>, header_guard: Option<HeaderGuard>) -> Vec<ParsedPair> {
  let rows = normalize_rows(rows);

  let data_rows: Vec<&Vec<String>> = rows
    .iter()
    .filter(|row| {
      let source = row.get(0).map(|s| s.trim()).unwrap_or("");
      let target = row.get(1).map(|s| s.trim()).unwrap_or("");
      if source.is_empty() && target.is_empty() {
        return false;
      }
      if let Some(ref guard) = header_guard {
        if eq_guard(source, target, guard) {
          return false;
        }
      }
      true
    })
    .collect();

  let is_four_col = data_rows.iter().any(|row| row.get(3).map(|s| !s.trim().is_empty()).unwrap_or(false));
  let has_five_col = data_rows.iter().any(|row| row.get(4).map(|s| !s.trim().is_empty()).unwrap_or(false));

  let mut pairs: Vec<ParsedPair> = Vec::new();
  for row in rows.iter() {
    let source = row.get(0).map(|s| s.trim()).unwrap_or("").to_string();
    let target = row.get(1).map(|s| s.trim()).unwrap_or("").to_string();
    let col_c = row.get(2).map(|s| s.trim()).unwrap_or("").to_string();
    let col_d = row.get(3).map(|s| s.trim()).unwrap_or("").to_string();
    let col_e = row.get(4).map(|s| s.trim()).unwrap_or("").to_string();

    if let Some(ref guard) = header_guard {
      if eq_guard(&source, &target, guard) {
        continue;
      }
    }

    if !source.is_empty() && !target.is_empty() {
      let disabled = if has_five_col && col_e.eq_ignore_ascii_case("hidden") {
        Some(true)
      } else {
        None
      };

      if is_four_col {
        pairs.push(ParsedPair {
          source,
          target,
          section: if col_c.is_empty() { None } else { Some(col_c) },
          subsection: if col_d.is_empty() { None } else { Some(col_d) },
          disabled,
        });
      } else {
        pairs.push(ParsedPair {
          source,
          target,
          section: None,
          subsection: if col_c.is_empty() { None } else { Some(col_c) },
          disabled,
        });
      }
    }
  }

  pairs
}

fn read_xlsx_all(bytes: Vec<u8>) -> Result<Vec<(String, Vec<Vec<String>>)>, String> {
  let mut workbook: Xlsx<Cursor<Vec<u8>>> = Xlsx::new(Cursor::new(bytes)).map_err(|e| e.to_string())?;
  let sheet_names = workbook.sheet_names().to_owned();
  let mut sheets: Vec<(String, Vec<Vec<String>>)> = Vec::new();
  for name in sheet_names {
    let range = workbook.worksheet_range(&name).map_err(|e| e.to_string())?;
    let mut rows: Vec<Vec<String>> = Vec::new();
    for row in range.rows() {
      rows.push(row.iter().map(|c| cell_to_string(c)).collect());
    }
    sheets.push((name, rows));
  }
  Ok(sheets)
}

fn read_ods_all(bytes: Vec<u8>) -> Result<Vec<(String, Vec<Vec<String>>)>, String> {
  let mut workbook: Ods<Cursor<Vec<u8>>> = Ods::new(Cursor::new(bytes)).map_err(|e| e.to_string())?;
  let sheet_names = workbook.sheet_names().to_owned();
  let mut sheets: Vec<(String, Vec<Vec<String>>)> = Vec::new();
  for name in sheet_names {
    let range = workbook.worksheet_range(&name).map_err(|e| e.to_string())?;
    let mut rows: Vec<Vec<String>> = Vec::new();
    for row in range.rows() {
      rows.push(row.iter().map(|c| cell_to_string(c)).collect());
    }
    sheets.push((name, rows));
  }
  Ok(sheets)
}

fn read_csv(bytes: Vec<u8>) -> Result<Vec<Vec<String>>, String> {
  let text = String::from_utf8(bytes).map_err(|e| e.to_string())?;
  let mut rdr = csv::ReaderBuilder::new()
    .has_headers(false)
    .from_reader(text.as_bytes());

  let mut out: Vec<Vec<String>> = Vec::new();
  for rec in rdr.records() {
    let rec = rec.map_err(|e| e.to_string())?;
    out.push(rec.iter().map(|s| s.to_string()).collect());
  }
  Ok(out)
}

fn is_verb_sheet(rows: &[Vec<String>]) -> bool {
  for row in rows.iter().take(3) {
    let lower: Vec<String> = row.iter().map(|c| c.trim().to_lowercase()).collect();
    // New format: "tense" header; old format: "conjugations" header (backward compat)
    if lower.contains(&"tense".to_string()) || lower.contains(&"conjugations".to_string()) {
      return true;
    }
  }
  false
}

fn is_old_json_verb_format(rows: &[Vec<String>]) -> bool {
  // Old format had "Conjugations" as header in col 2; new format has "Tense"
  for row in rows.iter().take(3) {
    let col2 = row.get(2).map(|s| s.trim().to_lowercase()).unwrap_or_default();
    if col2 == "conjugations" {
      return true;
    }
    if col2 == "tense" {
      return false;
    }
  }
  false
}

fn parse_verb_rows(rows: Vec<Vec<String>>, header_guard: &Option<HeaderGuard>) -> Vec<ParsedVerb> {
  if is_old_json_verb_format(&rows) {
    return parse_verb_rows_json_legacy(rows, header_guard);
  }

  // New flat tense-row format:
  // Col 0: Source Infinitive, Col 1: Target Infinitive, Col 2: Tense
  // Cols 3..end-3: Person/Form pairs
  // Last 3 cols: Section, Subsection, Hidden

  // Find the trailing column positions by detecting the header row
  let mut section_col_offset: Option<usize> = None;
  for row in rows.iter().take(3) {
    for (i, cell) in row.iter().enumerate() {
      if cell.trim().eq_ignore_ascii_case("section") {
        section_col_offset = Some(i);
        break;
      }
    }
    if section_col_offset.is_some() { break; }
  }

  // Collect data rows (skip headers and empty rows)
  struct TenseRow {
    inf_src: String,
    inf_tgt: String,
    tense: String,
    pairs: Vec<(String, String)>,
    section: String,
    subsection: String,
    hidden: String,
  }

  let mut tense_rows: Vec<TenseRow> = Vec::new();

  for row in &rows {
    let inf_src = row.get(0).map(|s| s.trim()).unwrap_or("").to_string();
    let inf_tgt = row.get(1).map(|s| s.trim()).unwrap_or("").to_string();

    // Skip header rows
    if inf_src.eq_ignore_ascii_case("source infinitive") {
      continue;
    }
    if let Some(ref guard) = header_guard {
      if eq_guard(&inf_src, &inf_tgt, guard) {
        continue;
      }
    }
    if inf_src.is_empty() && inf_tgt.is_empty() {
      continue;
    }

    let tense = row.get(2).map(|s| s.trim()).unwrap_or("").to_string();

    // Determine where section/subsection/hidden are (last 3 meaningful cols)
    let sec_idx = section_col_offset.unwrap_or_else(|| if row.len() >= 3 { row.len().saturating_sub(3) } else { 3 });

    // Read conjugation cells from col 3 to sec_idx (each cell is "person - form")
    let mut pairs: Vec<(String, String)> = Vec::new();
    let mut i = 3;
    while i < sec_idx && i < row.len() {
      let cell = row.get(i).map(|s| s.trim()).unwrap_or("");
      if let Some((person, form)) = cell.split_once(" - ") {
        pairs.push((person.trim().to_string(), form.trim().to_string()));
      }
      i += 1;
    }

    let section = row.get(sec_idx).map(|s| s.trim()).unwrap_or("").to_string();
    let subsection = row.get(sec_idx + 1).map(|s| s.trim()).unwrap_or("").to_string();
    let hidden = row.get(sec_idx + 2).map(|s| s.trim()).unwrap_or("").to_string();

    tense_rows.push(TenseRow { inf_src, inf_tgt, tense, pairs, section, subsection, hidden });
  }

  // Group tense rows by (inf_src, inf_tgt) to reconstruct verbs
  let mut verbs: Vec<ParsedVerb> = Vec::new();

  let mut i = 0;
  while i < tense_rows.len() {
    let key_src = &tense_rows[i].inf_src;
    let key_tgt = &tense_rows[i].inf_tgt;

    let section = tense_rows[i].section.clone();
    let subsection = tense_rows[i].subsection.clone();
    let hidden = tense_rows[i].hidden.clone();

    let mut conjugations: Vec<ParsedConjugation> = Vec::new();

    // Collect all consecutive rows with the same infinitive pair
    while i < tense_rows.len() && tense_rows[i].inf_src == *key_src && tense_rows[i].inf_tgt == *key_tgt {
      let tr = &tense_rows[i];
      for (person, form) in &tr.pairs {
        conjugations.push(ParsedConjugation {
          tense: tr.tense.clone(),
          person: person.clone(),
          form: form.clone(),
        });
      }
      i += 1;
    }

    let disabled = if hidden.eq_ignore_ascii_case("hidden") { Some(true) } else { None };

    verbs.push(ParsedVerb {
      infinitive_source: key_src.clone(),
      infinitive_target: key_tgt.clone(),
      section: if section.is_empty() { None } else { Some(section) },
      subsection: if subsection.is_empty() { None } else { Some(subsection) },
      disabled,
      conjugations,
    });
  }

  verbs
}

/// Backward-compatible parser for old JSON conjugation format
fn parse_verb_rows_json_legacy(rows: Vec<Vec<String>>, header_guard: &Option<HeaderGuard>) -> Vec<ParsedVerb> {
  let rows: Vec<Vec<String>> = rows
    .into_iter()
    .map(|mut r| {
      if r.len() < 6 {
        r.resize(6, "".to_string());
      }
      r
    })
    .collect();

  let mut verbs: Vec<ParsedVerb> = Vec::new();
  for row in &rows {
    let inf_src = row[0].trim().to_string();
    let inf_tgt = row[1].trim().to_string();
    let conj_json = row[2].trim().to_string();
    let section = row[3].trim().to_string();
    let subsection = row[4].trim().to_string();
    let hidden_str = row[5].trim().to_string();

    if inf_src.eq_ignore_ascii_case("source infinitive") || inf_src.eq_ignore_ascii_case("conjugations") {
      continue;
    }
    if let Some(ref guard) = header_guard {
      if eq_guard(&inf_src, &inf_tgt, guard) {
        continue;
      }
    }
    if inf_src.is_empty() && inf_tgt.is_empty() {
      continue;
    }

    let disabled = if hidden_str.eq_ignore_ascii_case("hidden") { Some(true) } else { None };

    // Parse JSON conjugations into structured vec
    let conjugations: Vec<ParsedConjugation> = if conj_json.is_empty() || conj_json == "[]" {
      Vec::new()
    } else {
      serde_json::from_str::<Vec<ParsedConjugation>>(&conj_json).unwrap_or_default()
    };

    verbs.push(ParsedVerb {
      infinitive_source: inf_src,
      infinitive_target: inf_tgt,
      conjugations,
      section: if section.is_empty() { None } else { Some(section) },
      subsection: if subsection.is_empty() { None } else { Some(subsection) },
      disabled,
    });
  }

  verbs
}

#[tauri::command]
pub fn parse_spreadsheet(bytes: Vec<u8>, filename: String, header_guard: Option<HeaderGuard>) -> Result<ParsedSpreadsheetResult, String> {
  let ext = filename
    .rsplit('.')
    .next()
    .unwrap_or("")
    .to_ascii_lowercase();

  let sheets: Vec<(String, Vec<Vec<String>>)> = match ext.as_str() {
    "xlsx" => read_xlsx_all(bytes)?,
    "ods" => read_ods_all(bytes)?,
    "csv" => {
      let rows = read_csv(bytes)?;
      vec![("".to_string(), rows)]
    }
    other => return Err(format!("Unsupported file extension: {other}")),
  };

  let mut all_pairs: Vec<ParsedPair> = Vec::new();
  let mut all_verbs: Vec<ParsedVerb> = Vec::new();

  for (_name, rows) in sheets {
    if is_verb_sheet(&rows) {
      all_verbs.extend(parse_verb_rows(rows, &header_guard));
    } else {
      all_pairs.extend(parse_rows(rows, header_guard.clone()));
    }
  }

  Ok(ParsedSpreadsheetResult {
    pairs: all_pairs,
    verbs: all_verbs,
  })
}

fn write_level_sheet(
  workbook: &mut Workbook,
  sheet_name: &str,
  header: &[String],
  rows: &[Vec<String>],
) -> Result<(), rust_xlsxwriter::XlsxError> {
  let worksheet = workbook.add_worksheet().set_name(sheet_name)?;
  for (c, v) in header.iter().enumerate() {
    worksheet.write_string(0, c as u16, v)?;
  }
  for (r_idx, row) in rows.iter().enumerate() {
    let r = (r_idx + 1) as u32;
    for (c_idx, v) in row.iter().enumerate() {
      worksheet.write_string(r, c_idx as u16, v)?;
    }
  }
  Ok(())
}

#[tauri::command]
pub fn build_xlsx(payload: ExportPayload) -> Result<Vec<u8>, String> {
  let mut section_map: HashMap<i64, String> = HashMap::new();
  for s in payload.sections.iter() {
    section_map.insert(s.id, s.name.clone());
  }
  let mut level_map: HashMap<i64, String> = HashMap::new();
  for l in payload.levels.iter() {
    level_map.insert(l.id, l.name.clone());
  }

  let header = vec![
    payload.source_label.clone(),
    payload.target_label.clone(),
    "Section".to_string(),
    "Subsection".to_string(),
    "Hidden".to_string(),
  ];

  let make_rows = |pairs: &[ExportWordPair]| -> Vec<Vec<String>> {
    pairs
      .iter()
      .map(|p| {
        let lvl = level_map.get(&p.level_id).cloned().unwrap_or_default();
        let sub = p.section_id.and_then(|id| section_map.get(&id).cloned()).unwrap_or_default();
        let hidden = if p.disabled { "Hidden" } else { "Shown" };
        vec![p.source.clone(), p.target.clone(), lvl, sub, hidden.to_string()]
      })
      .collect()
  };

  let mut workbook = Workbook::new();

  let mut unique_level_ids: Vec<i64> = payload.word_pairs.iter().map(|p| p.level_id).collect();
  unique_level_ids.sort();
  unique_level_ids.dedup();

  if unique_level_ids.len() > 1 {
    for lvl_id in unique_level_ids.iter() {
      let pairs: Vec<ExportWordPair> = payload.word_pairs.iter().filter(|p| p.level_id == *lvl_id).cloned().collect();
      let sheet_name_raw = level_map.get(lvl_id).cloned().unwrap_or_else(|| lvl_id.to_string());
      let sheet_name = sheet_name_raw.chars().take(31).collect::<String>();
      write_level_sheet(&mut workbook, &sheet_name, &header, &make_rows(&pairs)).map_err(|e| e.to_string())?;
    }
  } else {
    let name = payload.file_label.chars().take(31).collect::<String>();
    write_level_sheet(&mut workbook, &name, &header, &make_rows(&payload.word_pairs)).map_err(|e| e.to_string())?;
  }

  // Write verb sheets (one row per tense, with dynamic Person/Form column pairs)
  if let Some(ref verbs) = payload.verbs {
    if !verbs.is_empty() {
      let mut verb_level_ids: Vec<i64> = verbs.iter().map(|v| v.level_id).collect();
      verb_level_ids.sort();
      verb_level_ids.dedup();

      let mut used_sheet_names: Vec<String> = Vec::new();

      for lvl_id in &verb_level_ids {
        let lvl_verbs: Vec<&ExportVerb> = verbs.iter().filter(|v| v.level_id == *lvl_id).collect();
        let lvl_label = level_map.get(lvl_id).cloned().unwrap_or_else(|| lvl_id.to_string());
        let mut sheet_name = format!("Verbs - {}", lvl_label).chars().take(31).collect::<String>();

        // Deduplicate sheet names
        let base = sheet_name.clone();
        let mut counter = 2u32;
        while used_sheet_names.contains(&sheet_name) {
          let suffix = format!(" {counter}");
          sheet_name = format!("{}{}", &base[..std::cmp::min(base.len(), 31 - suffix.len())], suffix);
          counter += 1;
        }
        used_sheet_names.push(sheet_name.clone());

        // Find max conjugations per tense across all verbs in this level
        let mut max_conjs: usize = 0;
        for v in &lvl_verbs {
          let mut by_tense: BTreeMap<&str, usize> = BTreeMap::new();
          for c in &v.conjugations {
            *by_tense.entry(c.tense.as_str()).or_insert(0) += 1;
          }
          for count in by_tense.values() {
            if *count > max_conjs {
              max_conjs = *count;
            }
          }
        }

        // Build header: each conjugation is a single column ("person - form")
        let mut header: Vec<String> = vec![
          "Source Infinitive".to_string(),
          "Target Infinitive".to_string(),
          "Tense".to_string(),
        ];
        for i in 1..=max_conjs {
          header.push(format!("Person/Form {i}"));
        }
        header.push("Section".to_string());
        header.push("Subsection".to_string());
        header.push("Hidden".to_string());

        let total_cols = header.len();

        // Build rows
        let mut rows: Vec<Vec<String>> = Vec::new();
        for v in &lvl_verbs {
          let sec = level_map.get(&v.level_id).cloned().unwrap_or_default();
          let sub = v.section_id.and_then(|id| section_map.get(&id).cloned()).unwrap_or_default();
          let hidden = if v.disabled { "Hidden".to_string() } else { "Shown".to_string() };

          if v.conjugations.is_empty() {
            let mut row = vec![
              v.infinitive_source.clone(),
              v.infinitive_target.clone(),
              String::new(), // empty tense
            ];
            // Pad person/form columns
            row.resize(total_cols - 3, String::new());
            row.push(sec);
            row.push(sub);
            row.push(hidden);
            rows.push(row);
          } else {
            // Group conjugations by tense, preserving order
            let mut by_tense: BTreeMap<String, Vec<(&str, &str)>> = BTreeMap::new();
            for c in &v.conjugations {
              by_tense.entry(c.tense.clone()).or_default().push((c.person.as_str(), c.form.as_str()));
            }
            for (tense, pairs) in &by_tense {
              let mut row = vec![
                v.infinitive_source.clone(),
                v.infinitive_target.clone(),
                tense.clone(),
              ];
              for (person, form) in pairs {
                row.push(format!("{} - {}", person, form));
              }
              // Pad to match total columns
              while row.len() < total_cols - 3 {
                row.push(String::new());
              }
              row.push(sec.clone());
              row.push(sub.clone());
              row.push(hidden.clone());
              rows.push(row);
            }
          }
        }

        write_level_sheet(&mut workbook, &sheet_name, &header, &rows).map_err(|e| e.to_string())?;
      }
    }
  }

  // Ensure at least one sheet exists.
  if workbook.worksheets().is_empty() {
    let name = payload.file_label.chars().take(31).collect::<String>();
    write_level_sheet(&mut workbook, &name, &header, &[]).map_err(|e| e.to_string())?;
  }

  workbook.save_to_buffer().map_err(|e| e.to_string())
}

