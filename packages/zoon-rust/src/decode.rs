use crate::{Result, ZoonError};
use serde::de::DeserializeOwned;
use std::collections::{HashMap, BTreeMap};

pub fn decode<T: DeserializeOwned>(input: &str) -> Result<T> {
    let input = input.trim();
    if input.is_empty() {
        let empty_json = if std::any::type_name::<T>().contains("Vec") {
            "[]"
        } else {
            "{}"
        };
        return serde_json::from_str(empty_json).map_err(|e| ZoonError::ParseError(e.to_string()));
    }

    let json_value = if input.starts_with('#') || input.starts_with('%') {
        decode_tabular(input)?
    } else {
        decode_inline(input)?
    };

    serde_json::from_value(json_value).map_err(|e| ZoonError::ParseError(e.to_string()))
}

fn decode_tabular(input: &str) -> Result<serde_json::Value> {
    let mut lines = input.lines();
    let mut aliases = HashMap::new();
    let mut header_line = String::new();
    
    // Parse aliases until header
    while let Some(line) = lines.next() {
        let line = line.trim();
        if line.is_empty() { continue; }
        
        if line.starts_with('%') {
            for part in line.split_whitespace() {
                if let Some(idx) = part.find('=') {
                     let alias = &part[1..idx]; // skip %
                     let prefix = &part[idx+1..];
                     aliases.insert(alias.to_string(), prefix.to_string());
                }
            }
        } else if line.starts_with('#') {
            header_line = line.to_string();
            break;
        } else {
             // Maybe implicit header not supported or error?
             return Err(ZoonError::InvalidFormat("expected header starting with #".into()));
        }
    }
    
    if header_line.is_empty() {
        return Err(ZoonError::InvalidFormat("missing header".into()));
    }

    let header_parts: Vec<&str> = header_line[2..].split_whitespace().collect();
    let mut fields: Vec<HeaderField> = Vec::new();
    let mut constants: Vec<ConstantField> = Vec::new();
    let mut explicit_rows = -1;

    for part in header_parts {
        if part.starts_with('+') {
            if let Ok(n) = part[1..].parse::<i32>() {
                explicit_rows = n;
            }
            continue;
        }

        let is_const = part.starts_with('@');
        let clean_part = if is_const { &part[1..] } else { part };
        
        // Find separator : or =
        let sep_idx = clean_part.find(|c| c == ':' || c == '=');
        if sep_idx.is_none() { continue; }
        let idx = sep_idx.unwrap();
        
        let raw_name = &clean_part[..idx];
        let suffix = &clean_part[idx+1..]; // includes type or value
        let sep = clean_part.chars().nth(idx).unwrap();
        
        // Unalias
        let mut name = raw_name.to_string();
        if name.starts_with('%') {
             if let Some(dot_idx) = name.find('.') {
                 let alias = &name[1..dot_idx];
                 if let Some(prefix) = aliases.get(alias) {
                     name = format!("{}.{}", prefix, &name[dot_idx+1..]);
                 }
             } else {
                 let alias = &name[1..];
                 if let Some(prefix) = aliases.get(alias) {
                     name = prefix.clone();
                 }
             }
        }
        
        if is_const {
            let mut val_str = suffix.to_string();
            let typ;
            if sep == '=' {
                typ = "s".to_string();
                val_str = val_str.replace('_', " ");
            } else {
                // inferred type from suffix? 
                // Currently suffix IS the value for constants usually?
                // Syntax: @name=value (string) or @name:value (inferred)
                typ = "auto".to_string();
            }
            
            // Fix boolean constant display (y/n -> 1/0 or boolean)
            if sep == ':' && (val_str == "y" || val_str == "n") {
                 // handle in parse_value
            }
            
            constants.push(ConstantField {
                name,
                val: val_str,
                typ,
            });
        } else {
            let typ = if sep == '=' { "s".to_string() } else { suffix.to_string() };
            fields.push(HeaderField {
                name,
                typ,
            });
        }
    }
    
    let mut result = Vec::new();
    let mut auto_inc = 0;

    // Helper to process row values
    let mut process_row = |values: Vec<&str>| -> Result<serde_json::Value> {
        let mut flat_obj = serde_json::Map::new();
        
        // Apply constants
        for c in &constants {
            let val = parse_value(&c.val, &c.typ);
            flat_obj.insert(c.name.clone(), val);
        }
        
        let mut val_idx = 0;
        for field in &fields {
            let value_str = if field.typ == "i+" {
                auto_inc += 1;
                auto_inc.to_string()
            } else {
                 // If values missing?
                 if val_idx >= values.len() {
                     "~".to_string()
                 } else {
                     let v = values[val_idx].to_string();
                     val_idx += 1;
                     v
                 }
            };
            
            if value_str != "~" {
                let json_val = parse_value(&value_str, &field.typ);
                flat_obj.insert(field.name.clone(), json_val);
            }
        }
        
        // Unflatten
        unflatten_object(flat_obj)
    };

    if explicit_rows > 0 {
        for _ in 0..explicit_rows {
            result.push(process_row(Vec::new())?);
        }
    }

    for line in lines {
        let line = line.trim();
        if line.is_empty() { continue; }
        
        let values: Vec<&str> = line.split_whitespace().collect();
        result.push(process_row(values)?);
    }

    Ok(serde_json::Value::Array(result))
}

fn unflatten_object(flat: serde_json::Map<String, serde_json::Value>) -> Result<serde_json::Value> {
    let mut root = serde_json::Map::new();
    
    for (key, value) in flat {
        insert_nested(&mut root, &key, value)?;
    }
    
    Ok(serde_json::Value::Object(root))
}

fn insert_nested(
    obj: &mut serde_json::Map<String, serde_json::Value>,
    path: &str,
    value: serde_json::Value
) -> Result<()> {
    let parts: Vec<&str> = path.split('.').collect();
    if parts.len() == 1 {
        obj.insert(parts[0].to_string(), value);
        return Ok(());
    }
    
    let current_key = parts[0];
    let remaining_path = parts[1..].join(".");
    
    let entry = obj.entry(current_key.to_string()).or_insert_with(|| serde_json::Value::Object(serde_json::Map::new()));
    
    if let serde_json::Value::Object(inner_obj) = entry {
        insert_nested(inner_obj, &remaining_path, value)?;
    } else {
        // Conflict: trying to insert into non-object? 
        // Or mixed types.
        // For unflattening, assume consistent structure.
        return Err(ZoonError::ParseError(format!("conflict at key {}", current_key)));
    }
    
    Ok(())
}

fn decode_inline(input: &str) -> Result<serde_json::Value> {
    let mut obj = serde_json::Map::new();
    let mut pos = 0;
    let chars: Vec<char> = input.chars().collect();

    while pos < chars.len() {
        while pos < chars.len() && chars[pos].is_whitespace() {
            pos += 1;
        }
        if pos >= chars.len() {
            break;
        }

        let key_start = pos;
        while pos < chars.len() && chars[pos] != ':' && chars[pos] != '=' {
            pos += 1;
        }
        let mut key: String = chars[key_start..pos].iter().collect();
        
        if pos >= chars.len() {
            break;
        }

        let sep = chars[pos];
        pos += 1;

        let val_start = pos;
        if pos < chars.len() && chars[pos] == '{' {
            let mut depth = 1;
            pos += 1;
            while pos < chars.len() && depth > 0 {
                if chars[pos] == '{' {
                    depth += 1;
                }
                if chars[pos] == '}' {
                    depth -= 1;
                }
                pos += 1;
            }
        } else {
            while pos < chars.len() && !chars[pos].is_whitespace() {
                pos += 1;
            }
        }
        
        let value_str: String = chars[val_start..pos].iter().collect();
        
        let json_val = if value_str.starts_with('{') && value_str.ends_with('}') {
            let inner = &value_str[1..value_str.len() - 1];
            decode_inline(inner)?
        } else if sep == '=' {
            serde_json::Value::String(value_str.replace('_', " "))
        } else {
            parse_value(&value_str, "auto")
        };
        
        // Handle nested keys in inline? e.g. server.host=...
        // Spec implies inline uses { } nesting usually, but key could be dot-notated?
        // Assuming dot-notation is allowed in inline keys too.
        if key.contains('.') {
             // unflatten handling
             // We can't use insert_nested easily on 'obj' while iterating?
             // Actually 'obj' is the map we are building.
             insert_nested(&mut obj, &key, json_val)?;
        } else {
             obj.insert(key, json_val);
        }
    }

    Ok(serde_json::Value::Object(obj))
}

struct HeaderField {
    name: String,
    typ: String,
}

struct ConstantField {
    name: String,
    val: String,
    typ: String,
}

fn parse_value(s: &str, typ: &str) -> serde_json::Value {
    if s == "~" {
        return serde_json::Value::Null;
    }

    match typ {
        "i" | "i+" => {
            if let Ok(n) = s.parse::<i64>() {
                return serde_json::Value::Number(n.into());
            }
        }
        "b" => {
            return serde_json::Value::Bool(s == "1" || s == "y" || s == "true");
        }
        _ => {}
    }

    if s == "y" || s == "n" {
        return serde_json::Value::Bool(s == "y");
    }
    if let Ok(n) = s.parse::<i64>() {
        return serde_json::Value::Number(n.into());
    }
    if s == "true" || s == "false" {
        return serde_json::Value::Bool(s == "true");
    }

    serde_json::Value::String(s.replace('_', " "))
}
