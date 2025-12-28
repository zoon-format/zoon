use crate::{Result, ZoonError};
use serde::Serialize;
use std::collections::{BTreeMap, HashMap, HashSet};

pub fn encode<T: Serialize>(value: &T) -> Result<String> {
    let json_value = serde_json::to_value(value).map_err(|e| ZoonError::UnsupportedType(e.to_string()))?;
    encode_value(&json_value)
}

fn encode_value(value: &serde_json::Value) -> Result<String> {
    match value {
        serde_json::Value::Array(arr) => encode_tabular(arr),
        serde_json::Value::Object(obj) => encode_inline(obj),
        _ => Err(ZoonError::InvalidFormat("top level must be object or array".into())),
    }
}

fn flatten_object(
    prefix: &str,
    value: &serde_json::Value,
    result: &mut BTreeMap<String, serde_json::Value>,
) {
    if let serde_json::Value::Object(obj) = value {
        for (k, v) in obj {
            let new_key = if prefix.is_empty() {
                k.clone()
            } else {
                format!("{}.{}", prefix, k)
            };
            flatten_object(&new_key, v, result);
        }
    } else {
        result.insert(prefix.to_string(), value.clone());
    }
}

fn detect_aliases(keys: &[String]) -> HashMap<String, String> {
    let mut prefix_counts: HashMap<String, usize> = HashMap::new();
    
    for key in keys {
        let parts: Vec<&str> = key.split('.').collect();
        if parts.len() > 1 {
            for i in 1..parts.len() {
                let prefix = parts[..i].join(".");
                *prefix_counts.entry(prefix).or_insert(0) += 1;
            }
        }
    }

    let mut savings: Vec<(String, isize)> = Vec::new();

    for (prefix, count) in &prefix_counts {
        let prefix_len = prefix.len() as isize;
        let count = *count as isize;
        // Formula: (prefix - 2) * count - (prefix + 4)
        let score = (prefix_len - 2) * count - (prefix_len + 4);
        if score > 0 {
            savings.push((prefix.clone(), score));
        }
    }
    
    savings.sort_by(|a, b| b.1.cmp(&a.1));
    
    let mut aliases = HashMap::new();
    let mut used_aliases = HashSet::new();
    let mut alias_idx = 0;
    
    for (prefix, _) in savings {
        // Simple alias assignment
        let parts: Vec<&str> = prefix.split('.').collect();
        let name = parts.last().unwrap();
        let mut candidate = name.chars().next().unwrap().to_lowercase().to_string();
        
        // Find valid alias
        loop {
            if !used_aliases.contains(&candidate) {
                break;
            }
            if candidate.len() == 1 {
                // a, b, c...
                let c = (b'a' + alias_idx) as char;
                candidate = c.to_string();
                alias_idx += 1;
                if alias_idx > 25 { break; } // safety
            } else {
                // give up or try something else?
                break;
            }
        }
        
        if !used_aliases.contains(&candidate) {
            aliases.insert(prefix, candidate.clone());
            used_aliases.insert(candidate);
        }
        if aliases.len() >= 10 { break; }
    }
    
    aliases
}

fn apply_alias(name: &str, aliases: &HashMap<String, String>) -> String {
    for (prefix, alias) in aliases {
        if name == prefix {
            return format!("%{}", alias);
        }
        if name.starts_with(&format!("{}.", prefix)) {
            return format!("%{}.{}", alias, &name[prefix.len() + 1..]);
        }
    }
    name.to_string()
}

fn encode_tabular(arr: &[serde_json::Value]) -> Result<String> {
    if arr.is_empty() {
        return Ok(String::new());
    }

    // 1. Flatten
    let mut flattened_rows = Vec::new();
    let mut all_keys_set = HashSet::new();

    for item in arr {
        let mut flat_map = BTreeMap::new();
        flatten_object("", item, &mut flat_map);
        for k in flat_map.keys() {
            all_keys_set.insert(k.clone());
        }
        flattened_rows.push(flat_map);
    }
    
    let mut all_keys: Vec<String> = all_keys_set.into_iter().collect();
    all_keys.sort();
    
    // 2. Constants
    let mut constants = BTreeMap::new();
    let mut active_keys = Vec::new();
    
    if arr.len() > 1 {
        for key in &all_keys {
            let first_val = flattened_rows[0].get(key).unwrap_or(&serde_json::Value::Null);
            let mut is_const = true;
            for row in &flattened_rows {
                let val = row.get(key).unwrap_or(&serde_json::Value::Null);
                if val != first_val {
                    is_const = false;
                    break;
                }
            }
            if is_const && !first_val.is_null() {
                constants.insert(key.clone(), first_val.clone());
            } else {
                active_keys.push(key.clone());
            }
        }
    } else {
        active_keys = all_keys;
    }
    
    // 3. Aliases
    let aliases = detect_aliases(&active_keys);

    // 4. Stats
    let mut stats: BTreeMap<String, ColumnStats> = BTreeMap::new();
    for key in &active_keys {
        stats.insert(key.clone(), ColumnStats::default());
    }
    
    for row in &flattened_rows {
        for key in &active_keys {
            let val = row.get(key).unwrap_or(&serde_json::Value::Null);
            let s = serialize_value(val);
            let stat = stats.get_mut(key).unwrap();
            
            stat.values.push(s.clone());
            stat.unique_vals.insert(s);
            
            // Guess is likely ID (simplified logic)
            if key.to_lowercase() == "id" {
                if let serde_json::Value::Number(_) = val {
                    stat.is_seq = true;
                }
            }
        }
    }
    
    // Build Header
    let mut header_parts = vec!["#".to_string()];
    
    // Alias definitions
    let mut alias_defs: Vec<String> = Vec::new();
    for (prefix, alias) in &aliases {
        alias_defs.push(format!("%{}={}", alias, prefix));
    }
    alias_defs.sort(); // Deterministic
    
    // Combine alias defs into lines before header?
    // Spec: "%a=... # ..." or separate lines.
    // ZOON 1.1 spec usually puts alias defs on new line or same line.
    // My Go/Python impl use separate lines if aliases exist.
    // But function returns one String.
    
    let mut lines = Vec::new();
    if !alias_defs.is_empty() {
        lines.push(alias_defs.join(" "));
    }

    // Constants
    for (k, v) in &constants {
        let aliased = apply_alias(k, &aliases).replace(" ", "_");
        let s_val = serialize_value(v);
        let mut type_code = ":";
        
        if let serde_json::Value::String(_) = v {
            type_code = "=";
        } else if let serde_json::Value::Bool(b) = v {
             if *b {
                 // s_val is "1", but for constant display "y" is nicer or standard?
                 // Spec: @active:y or @active:n
                 // serialize_value returns "1" or "0".
                 // We should fix this.
             }
        }
        
        let display_val = if let serde_json::Value::Bool(b) = v {
            if *b { "y".to_string() } else { "n".to_string() }
        } else {
            s_val
        };
        
        let sep = if let serde_json::Value::String(_) = v { "=" } else { ":" };
        header_parts.push(format!("@{}{}{}", aliased, sep, display_val));
    }

    let mut skip_indices = HashSet::new();
    
    for (i, key) in active_keys.iter().enumerate() {
        let stat = stats.get(key).unwrap();
        let aliased = apply_alias(key, &aliases).replace(" ", "_");
        let type_code = infer_type(stat, arr.len(), key);
        
        if type_code == "i+" {
            skip_indices.insert(i);
        }
        
        if type_code.starts_with('=') {
            header_parts.push(format!("{}{}", aliased, type_code));
        } else {
            header_parts.push(format!("{}:{}", aliased, type_code));
        }
    }

    // +N Check
    // Check if all active columns are skipped (i+)
    let mut all_skipped = true;
    if active_keys.is_empty() {
        // all implicit
    } else {
        for i in 0..active_keys.len() {
            if !skip_indices.contains(&i) {
                all_skipped = false;
                break;
            }
        }
    }
    
    if all_skipped && !arr.is_empty() {
        header_parts.push(format!("+{}", arr.len()));
    }

    lines.push(header_parts.join(" "));
    
    if all_skipped {
        return Ok(lines.join("\n"));
    }
    
    // Rows
    for row in &flattened_rows {
        let mut out_row = Vec::new();
        for (i, key) in active_keys.iter().enumerate() {
            if skip_indices.contains(&i) { continue; }
            
            let val = row.get(key).unwrap_or(&serde_json::Value::Null);
            let mut s = serialize_value(val);
            
            let stat = stats.get(key).unwrap();
            let type_code = infer_type(stat, arr.len(), key);
            
            if type_code == "b" {
                 if s == "true" { s = "1".into(); }
                 else if s == "false" { s = "0".into(); }
            }
            out_row.push(s);
        }
        lines.push(out_row.join(" "));
    }

    Ok(lines.join("\n"))
}

fn encode_inline(obj: &serde_json::Map<String, serde_json::Value>) -> Result<String> {
    let parts: Vec<String> = obj.iter().map(|(k, v)| format_inline_pair(k, v)).collect();
    Ok(parts.join(" "))
}

fn format_inline_pair(key: &str, value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(s) => format!("{}={}", key, s.replace(' ', "_")),
        serde_json::Value::Bool(b) => format!("{}:{}", key, if *b { "y" } else { "n" }),
        serde_json::Value::Number(n) => format!("{}:{}", key, n),
        serde_json::Value::Null => format!("{}:~", key),
        serde_json::Value::Object(obj) => {
            let inner = encode_inline(obj).unwrap_or_default();
            format!("{}:{{{}}}", key, inner)
        }
        serde_json::Value::Array(_) => format!("{}:[...]", key),
    }
}

fn serialize_value(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(s) => s.replace(' ', "_"),
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::Bool(b) => if *b { "1".into() } else { "0".into() },
        serde_json::Value::Null => "~".into(),
        serde_json::Value::Object(obj) => {
            let inner = encode_inline(obj).unwrap_or_default();
            format!("{{{}}}", inner)
        }
        serde_json::Value::Array(_) => "[...]".into(),
    }
}

#[derive(Default)]
struct ColumnStats {
    values: Vec<String>,
    unique_vals: std::collections::HashSet<String>,
    is_seq: bool,
}

fn infer_type(stat: &ColumnStats, arr_len: usize, key: &str) -> String {
    if key.to_lowercase() == "id" && stat.is_seq && check_sequence(&stat.values) {
        return "i+".into();
    }

    let all_nums = stat.values.iter().all(|v| v.parse::<i64>().is_ok() || v == "~");
    if all_nums && !stat.values.iter().all(|v| v == "~") {
        return "i".into();
    }

    let all_bools = stat.values.iter().all(|v| v == "0" || v == "1" || v == "~"); // bools serialized as 0/1 for stats check?
    // Actually serialize_value returns 1/0 for bools.
    
    if all_bools {
        return "b".into();
    }

    if stat.unique_vals.len() <= 10 && stat.unique_vals.len() < arr_len {
        let mut vals: Vec<_> = stat.unique_vals.iter().filter(|v| *v != "~").cloned().collect();
        vals.sort();
        if !vals.is_empty() {
             // ensure no pipe/equals in keys?
             let escaped: Vec<String> = vals.iter().map(|v| v.clone()).collect();
            return format!("={}", escaped.join("|"));
        }
    }

    "s".into()
}

fn check_sequence(values: &[String]) -> bool {
    for (i, v) in values.iter().enumerate() {
        if v != &(i + 1).to_string() {
            return false;
        }
    }
    true
}
