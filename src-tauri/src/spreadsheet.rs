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
  pub form_type: String,
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
  pub auxiliary: Option<String>,
  pub case_preposition: Option<String>,
  pub conjugations: Vec<ExportConjugation>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedConjugation {
  pub form_type: String,
  pub person: String,
  pub form: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedVerb {
  pub infinitive_source: String,
  pub infinitive_target: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub auxiliary: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub case_preposition: Option<String>,
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
    if lower.contains(&"form type".to_string()) {
      return true;
    }
  }
  false
}

fn parse_verb_rows(rows: Vec<Vec<String>>, header_guard: &Option<HeaderGuard>) -> Vec<ParsedVerb> {
  // Fixed 14-column format:
  // 0: Source Infinitive, 1: Target Infinitive, 2: Section, 3: Subsection,
  // 4: Form Type, 5-10: Person/Form 1-6, 11: Auxiliary, 12: Case/Preposition, 13: Hidden
  const FORM_TYPE_COL: usize = 4;
  const PAIRS_START: usize = 5;
  const PAIRS_END: usize = 11;
  const SEC_COL: usize = 2;
  const SUB_COL: usize = 3;
  const AUX_COL: usize = 11;
  const CASE_PREP_COL: usize = 12;
  const HIDDEN_COL: usize = 13;

  struct FormTypeRow {
    inf_src: String,
    inf_tgt: String,
    auxiliary: String,
    case_preposition: String,
    form_type: String,
    pairs: Vec<(String, String)>,
    section: String,
    subsection: String,
    hidden: String,
  }

  let mut form_type_rows: Vec<FormTypeRow> = Vec::new();

  for row in &rows {
    let inf_src = row.get(0).map(|s| s.trim()).unwrap_or("").to_string();
    let inf_tgt = row.get(1).map(|s| s.trim()).unwrap_or("").to_string();

    if inf_src.eq_ignore_ascii_case("source infinitive") { continue; }
    if let Some(ref guard) = header_guard {
      if eq_guard(&inf_src, &inf_tgt, guard) { continue; }
    }
    if inf_src.is_empty() && inf_tgt.is_empty() { continue; }

    let form_type    = row.get(FORM_TYPE_COL).map(|s| s.trim()).unwrap_or("").to_string();
    let section      = row.get(SEC_COL).map(|s| s.trim()).unwrap_or("").to_string();
    let subsection   = row.get(SUB_COL).map(|s| s.trim()).unwrap_or("").to_string();
    let auxiliary    = row.get(AUX_COL).map(|s| s.trim()).unwrap_or("").to_string();
    let case_preposition = row.get(CASE_PREP_COL).map(|s| s.trim()).unwrap_or("").to_string();
    let hidden       = row.get(HIDDEN_COL).map(|s| s.trim()).unwrap_or("").to_string();

    let mut pairs: Vec<(String, String)> = Vec::new();
    let mut i = PAIRS_START;
    while i < PAIRS_END && i < row.len() {
      let cell = row.get(i).map(|s| s.trim()).unwrap_or("");
      if !cell.is_empty() {
        if let Some((person, form)) = cell.split_once(" - ") {
          pairs.push((person.trim().to_string(), form.trim().to_string()));
        }
      }
      i += 1;
    }

    form_type_rows.push(FormTypeRow { inf_src, inf_tgt, auxiliary, case_preposition, form_type, pairs, section, subsection, hidden });
  }

  // Group by (inf_src, inf_tgt)
  let mut verbs: Vec<ParsedVerb> = Vec::new();
  let mut i = 0;
  while i < form_type_rows.len() {
    let key_src = form_type_rows[i].inf_src.clone();
    let key_tgt = form_type_rows[i].inf_tgt.clone();
    let auxiliary        = form_type_rows[i].auxiliary.clone();
    let case_preposition = form_type_rows[i].case_preposition.clone();
    let section          = form_type_rows[i].section.clone();
    let subsection       = form_type_rows[i].subsection.clone();
    let hidden           = form_type_rows[i].hidden.clone();

    let mut conjugations: Vec<ParsedConjugation> = Vec::new();
    while i < form_type_rows.len() && form_type_rows[i].inf_src == key_src && form_type_rows[i].inf_tgt == key_tgt {
      let tr = &form_type_rows[i];
      for (person, form) in &tr.pairs {
        conjugations.push(ParsedConjugation {
          form_type: tr.form_type.clone(),
          person: person.clone(),
          form: form.clone(),
        });
      }
      i += 1;
    }

    let disabled = if hidden.eq_ignore_ascii_case("hidden") { Some(true) } else { None };
    verbs.push(ParsedVerb {
      infinitive_source: key_src,
      infinitive_target: key_tgt,
      auxiliary: if auxiliary.is_empty() { None } else { Some(auxiliary) },
      case_preposition: if case_preposition.is_empty() { None } else { Some(case_preposition) },
      section: if section.is_empty() { None } else { Some(section) },
      subsection: if subsection.is_empty() { None } else { Some(subsection) },
      disabled,
      conjugations,
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

        // Fixed 14-column verb format:
        // 0: Source Infinitive, 1: Target Infinitive, 2: Section, 3: Subsection,
        // 4: Form Type, 5-10: Person/Form 1-6, 11: Auxiliary, 12: Case/Preposition, 13: Hidden
        let header: Vec<String> = vec![
          "Source Infinitive".to_string(),
          "Target Infinitive".to_string(),
          "Section".to_string(),
          "Subsection".to_string(),
          "Form Type".to_string(),
          "Person/Form 1".to_string(),
          "Person/Form 2".to_string(),
          "Person/Form 3".to_string(),
          "Person/Form 4".to_string(),
          "Person/Form 5".to_string(),
          "Person/Form 6".to_string(),
          "Auxiliary".to_string(),
          "Case/Preposition".to_string(),
          "Hidden".to_string(),
        ];

        // Build rows
        let mut rows: Vec<Vec<String>> = Vec::new();
        for v in &lvl_verbs {
          let sec = level_map.get(&v.level_id).cloned().unwrap_or_default();
          let sub = v.section_id.and_then(|id| section_map.get(&id).cloned()).unwrap_or_default();
          let hidden = if v.disabled { "Hidden".to_string() } else { "Shown".to_string() };
          let aux = v.auxiliary.clone().unwrap_or_default();
          let case_prep = v.case_preposition.clone().unwrap_or_default();

          if v.conjugations.is_empty() {
            let row = vec![
              v.infinitive_source.clone(),
              v.infinitive_target.clone(),
              sec, sub,
              String::new(), // empty form_type
              String::new(), String::new(), String::new(),
              String::new(), String::new(), String::new(),
              aux, case_prep, hidden,
            ];
            rows.push(row);
          } else {
            // Group conjugations by form_type, preserving order
            let mut by_form_type: BTreeMap<String, Vec<(&str, &str)>> = BTreeMap::new();
            for c in &v.conjugations {
              by_form_type.entry(c.form_type.clone()).or_default().push((c.person.as_str(), c.form.as_str()));
            }
            for (form_type, pairs) in &by_form_type {
              let mut row = vec![
                v.infinitive_source.clone(),
                v.infinitive_target.clone(),
                sec.clone(),
                sub.clone(),
                form_type.clone(),
              ];
              // Write up to 6 person/form cells (cols 5-10)
              for i in 0..6usize {
                if let Some((person, form)) = pairs.get(i) {
                  row.push(format!("{} - {}", person, form));
                } else {
                  row.push(String::new());
                }
              }
              row.push(aux.clone());
              row.push(case_prep.clone());
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

