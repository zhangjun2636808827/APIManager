#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![save_text_file_to_desktop])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn save_text_file_to_desktop(file_name: String, contents: String) -> Result<String, String> {
    let safe_file_name = sanitize_file_name(&file_name);

    if safe_file_name.is_empty() {
        return Err("File name cannot be empty.".to_string());
    }

    let user_profile = std::env::var_os("USERPROFILE")
        .ok_or_else(|| "Cannot find USERPROFILE environment variable.".to_string())?;
    let desktop_path = std::path::PathBuf::from(user_profile).join("Desktop");

    std::fs::create_dir_all(&desktop_path)
        .map_err(|error| format!("Failed to create desktop folder: {error}"))?;

    let output_path = desktop_path.join(safe_file_name);

    std::fs::write(&output_path, contents)
        .map_err(|error| format!("Failed to write export file: {error}"))?;

    Ok(output_path.display().to_string())
}

fn sanitize_file_name(file_name: &str) -> String {
    file_name
        .chars()
        .map(|character| match character {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            _ => character,
        })
        .collect::<String>()
        .trim()
        .trim_matches('.')
        .to_string()
}
