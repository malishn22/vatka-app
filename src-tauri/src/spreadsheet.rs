use std::collections::HashMap;
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
pub struct ExportPayload {
  pub word_pairs: Vec<ExportWordPair>,
  pub sections: Vec<ExportSection>,
  pub levels: Vec<ExportLevel>,
  pub file_label: String,
  pub source_label: String,
  pub target_label: String,
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

fn read_xlsx(bytes: Vec<u8>) -> Result<Vec<Vec<String>>, String> {
  let mut workbook: Xlsx<Cursor<Vec<u8>>> = Xlsx::new(Cursor::new(bytes)).map_err(|e| e.to_string())?;
  let sheet_names = workbook.sheet_names().to_owned();
  let first = sheet_names.get(0).ok_or_else(|| "Workbook has no sheets".to_string())?.to_string();
  let range = workbook.worksheet_range(&first).map_err(|e| e.to_string())?;

  let mut out: Vec<Vec<String>> = Vec::new();
  for row in range.rows() {
    out.push(row.iter().map(|c| cell_to_string(c)).collect());
  }
  Ok(out)
}

fn read_ods(bytes: Vec<u8>) -> Result<Vec<Vec<String>>, String> {
  let mut workbook: Ods<Cursor<Vec<u8>>> = Ods::new(Cursor::new(bytes)).map_err(|e| e.to_string())?;
  let sheet_names = workbook.sheet_names().to_owned();
  let first = sheet_names.get(0).ok_or_else(|| "Workbook has no sheets".to_string())?.to_string();
  let range = workbook.worksheet_range(&first).map_err(|e| e.to_string())?;

  let mut out: Vec<Vec<String>> = Vec::new();
  for row in range.rows() {
    out.push(row.iter().map(|c| cell_to_string(c)).collect());
  }
  Ok(out)
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

#[tauri::command]
pub fn parse_spreadsheet(bytes: Vec<u8>, filename: String, header_guard: Option<HeaderGuard>) -> Result<Vec<ParsedPair>, String> {
  let ext = filename
    .rsplit('.')
    .next()
    .unwrap_or("")
    .to_ascii_lowercase();

  let rows = match ext.as_str() {
    "xlsx" => read_xlsx(bytes)?,
    "ods" => read_ods(bytes)?,
    "csv" => read_csv(bytes)?,
    other => return Err(format!("Unsupported file extension: {other}")),
  };

  Ok(parse_rows(rows, header_guard))
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

  // Ensure at least one sheet exists.
  if workbook.worksheets().is_empty() {
    let name = payload.file_label.chars().take(31).collect::<String>();
    write_level_sheet(&mut workbook, &name, &header, &[]).map_err(|e| e.to_string())?;
  }

  workbook.save_to_buffer().map_err(|e| e.to_string())
}

