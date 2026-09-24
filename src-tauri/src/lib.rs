use std::process::Command;

#[tauri::command]
async fn show_windows_toast(title: String, body: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;

        let escaped_title = title.replace('\'', "''").replace('\"', "\\\"");
        let escaped_body = body.replace('\'', "''").replace('\"', "\\\"");

        let script = format!(
            "[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null; \
             $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02); \
             $xml = [xml]$template.GetXml(); \
             $xml.toast.visual.binding.text[0].InnerText = '{escaped_title}'; \
             $xml.toast.visual.binding.text[1].InnerText = '{escaped_body}'; \
             $newXml = New-Object Windows.Data.Xml.Dom.XmlDocument; \
             $newXml.LoadXml($xml.OuterXml); \
             $toast = [Windows.UI.Notifications.ToastNotification]::new($newXml); \
             try {{ [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Flow').Show($toast) }} \
             catch {{ [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('{{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}}\\WindowsPowerShell\\v1.0\\powershell.exe').Show($toast) }}"
        );

        let _ = Command::new("powershell")
            .args(["-NoProfile", "-WindowStyle", "Hidden", "-ExecutionPolicy", "Bypass", "-Command", &script])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .spawn();
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (title, body);
    }
    Ok(())
}

#[tauri::command]
async fn apply_inapp_update(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;

        let temp_installer = std::env::temp_dir().join("Flow_latest_update_setup.exe");
        let temp_installer_str = temp_installer.to_string_lossy().to_string();

        let status = Command::new("curl.exe")
            .args(["-s", "-L", "-o", &temp_installer_str, &url])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .status()
            .map_err(|e| format!("Falha ao baixar instalador via curl: {}", e))?;

        if !status.success() {
            return Err("Download da atualização falhou".into());
        }

        // Executa instalador NSIS com /S (silencioso) e /R (reiniciar após instalação)
        let _ = Command::new(&temp_installer)
            .args(["/S", "/R"])
            .spawn()
            .map_err(|e| format!("Falha ao executar instalador: {}", e))?;

        // Aguarda brevemente e fecha a instância antiga
        std::thread::sleep(std::time::Duration::from_millis(800));
        std::process::exit(0);
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = url;
        Ok(())
    }
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct BackupInfo {
    pub file_path: String,
    pub file_name: String,
    pub file_size_bytes: u64,
    pub created_at: String,
}

#[tauri::command]
async fn get_default_backup_dir(app: tauri::AppHandle) -> Result<String, String> {
    use tauri::Manager;
    if let Ok(doc_dir) = app.path().document_dir() {
        let backup_dir = doc_dir.join("FlowBackups");
        return Ok(backup_dir.to_string_lossy().to_string());
    }
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(app_dir.join("backups").to_string_lossy().to_string())
}

#[tauri::command]
async fn pick_backup_folder() -> Result<Option<String>, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let script = r#"
            Add-Type -AssemblyName System.Windows.Forms
            $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
            $dialog.Description = 'Selecione a pasta onde os backups diários do Flow serão salvos'
            $dialog.ShowNewFolderButton = $true
            if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
                [Console]::Out.Write($dialog.SelectedPath)
            }
        "#;
        let output = std::process::Command::new("powershell")
            .args(["-NoProfile", "-STA", "-Command", script])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .output()
            .map_err(|e| format!("Falha ao abrir seletor de pastas: {}", e))?;

        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if path.is_empty() {
            Ok(None)
        } else {
            Ok(Some(path))
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(None)
    }
}

#[tauri::command]
async fn create_database_backup(
    app: tauri::AppHandle,
    target_dir: String,
    file_name: Option<String>,
) -> Result<BackupInfo, String> {
    use tauri::Manager;
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data_dir.join("flow.db");

    if !db_path.exists() {
        return Err(format!("Banco de dados SQLite não encontrado em {:?}", db_path));
    }

    let target_path = std::path::PathBuf::from(&target_dir);
    std::fs::create_dir_all(&target_path)
        .map_err(|e| format!("Falha ao criar diretório de destino de backup: {}", e))?;

    let name = file_name.unwrap_or_else(|| {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        format!("flow_backup_{}.db", timestamp)
    });

    let dest_file = target_path.join(&name);

    std::fs::copy(&db_path, &dest_file)
        .map_err(|e| format!("Falha ao copiar banco SQLite para backup: {}", e))?;

    let metadata = std::fs::metadata(&dest_file)
        .map_err(|e| format!("Falha ao ler dados do arquivo de backup: {}", e))?;

    Ok(BackupInfo {
        file_path: dest_file.to_string_lossy().to_string(),
        file_name: name,
        file_size_bytes: metadata.len(),
        created_at: format!("{:?}", std::time::SystemTime::now()),
    })
}

#[tauri::command]
async fn list_database_backups(target_dir: String) -> Result<Vec<BackupInfo>, String> {
    let target_path = std::path::PathBuf::from(&target_dir);
    if !target_path.exists() {
        return Ok(vec![]);
    }

    let mut list = Vec::new();
    if let Ok(entries) = std::fs::read_dir(target_path) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_file() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    if name.starts_with("flow_backup_") && name.ends_with(".db") {
                        list.push(BackupInfo {
                            file_path: entry.path().to_string_lossy().to_string(),
                            file_name: name,
                            file_size_bytes: metadata.len(),
                            created_at: "".into(),
                        });
                    }
                }
            }
        }
    }
    list.sort_by(|a, b| b.file_name.cmp(&a.file_name));
    Ok(list)
}

#[tauri::command]
async fn open_backup_folder(folder_path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("explorer.exe")
            .arg(&folder_path)
            .creation_flags(0x08000000)
            .spawn()
            .map_err(|e| format!("Falha ao abrir pasta no Windows Explorer: {}", e))?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = folder_path;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            show_windows_toast,
            apply_inapp_update,
            get_default_backup_dir,
            pick_backup_folder,
            create_database_backup,
            list_database_backups,
            open_backup_folder
        ])
        .setup(|_app| {
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
