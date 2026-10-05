use std::process::Command;

mod firebase_google_auth;
use firebase_google_auth::{
    cancel_firebase_google_auth, poll_firebase_google_auth, start_firebase_google_auth,
    FirebaseGoogleAuthState,
};

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
            .args([
                "-NoProfile",
                "-WindowStyle",
                "Hidden",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                &script,
            ])
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
#[serde(rename_all = "camelCase")]
pub struct BackupInfo {
    pub file_path: String,
    pub file_name: String,
    pub file_size_bytes: u64,
    pub created_at: String,
    pub includes_rewards: bool,
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
    let name = file_name.unwrap_or_else(|| {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        format!("flow_backup_{}.db", timestamp)
    });

    create_backup_set(&app_data_dir, std::path::Path::new(&target_dir), &name).await
}

async fn snapshot_sqlite(
    source: &std::path::Path,
    destination: &std::path::Path,
) -> Result<(), String> {
    use sqlx::sqlite::SqliteConnectOptions;
    use sqlx::{Connection, SqliteConnection};
    let options = SqliteConnectOptions::new()
        .filename(source)
        .create_if_missing(false)
        .busy_timeout(std::time::Duration::from_secs(10));
    let mut connection = SqliteConnection::connect_with(&options)
        .await
        .map_err(|e| format!("Falha ao abrir {}: {e}", source.display()))?;
    let copied = sqlx::query("VACUUM INTO ?")
        .bind(destination.to_string_lossy().to_string())
        .execute(&mut connection)
        .await;
    connection.close().await.map_err(|e| e.to_string())?;
    copied.map_err(|e| format!("Falha ao copiar {}: {e}", source.display()))?;

    let mut copy = SqliteConnection::connect_with(
        &SqliteConnectOptions::new()
            .filename(destination)
            .read_only(true)
            .create_if_missing(false),
    )
    .await
    .map_err(|e| format!("Falha ao verificar {}: {e}", destination.display()))?;
    let check: Result<String, _> = sqlx::query_scalar("PRAGMA quick_check")
        .fetch_one(&mut copy)
        .await;
    copy.close().await.map_err(|e| e.to_string())?;
    let check = check.map_err(|e| e.to_string())?;
    if check != "ok" {
        return Err(format!(
            "O backup {} falhou na verificação SQLite: {check}",
            destination.display()
        ));
    }
    Ok(())
}

async fn create_backup_set(
    source_dir: &std::path::Path,
    target_dir: &std::path::Path,
    file_name: &str,
) -> Result<BackupInfo, String> {
    let source = source_dir.join("flow.db");
    if !source.is_file() {
        return Err(format!(
            "Banco de dados SQLite não encontrado em {}",
            source.display()
        ));
    }
    let rewards = source_dir.join("flow-rewards.db");
    if !rewards.is_file() {
        return Err(
            "O Refúgio ainda está carregando. Tente o backup novamente em alguns segundos.".into(),
        );
    }
    let stem = file_name
        .strip_suffix(".db")
        .ok_or("Nome de backup inválido.")?;
    if !stem.starts_with("flow_backup_")
        || !stem
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
    {
        return Err("Nome de backup inválido.".into());
    }
    std::fs::create_dir_all(target_dir)
        .map_err(|e| format!("Falha ao criar pasta de backup: {e}"))?;
    let mut name = format!("{stem}.flowbackup");
    let mut index = 2;
    while target_dir.join(&name).exists() {
        name = format!("{stem}_{index}.flowbackup");
        index += 1;
    }
    let final_dir = target_dir.join(&name);
    let unique = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let staging = target_dir.join(format!(".{stem}-{}-{unique}.tmp", std::process::id()));
    std::fs::create_dir(&staging).map_err(|e| format!("Falha ao preparar backup: {e}"))?;

    let result = async {
        snapshot_sqlite(&source, &staging.join("flow.db")).await?;
        snapshot_sqlite(&rewards, &staging.join("flow-rewards.db")).await?;
        let includes_rewards = true;
        let manifest = serde_json::json!({ "version": 2, "includesRewards": includes_rewards });
        std::fs::write(
            staging.join("manifest.json"),
            serde_json::to_vec_pretty(&manifest).map_err(|e| e.to_string())?,
        )
        .map_err(|e| format!("Falha ao registrar backup: {e}"))?;
        std::fs::rename(&staging, &final_dir)
            .map_err(|e| format!("Falha ao concluir backup: {e}"))?;
        backup_info(&final_dir, includes_rewards)
    }
    .await;
    if result.is_err() {
        let _ = std::fs::remove_dir_all(&staging);
    }
    result
}

fn backup_info(path: &std::path::Path, includes_rewards: bool) -> Result<BackupInfo, String> {
    let size = if path.is_dir() {
        let mut total = 0;
        for name in ["flow.db", "flow-rewards.db"] {
            let file = path.join(name);
            if file.exists() {
                total += std::fs::metadata(&file).map_err(|e| e.to_string())?.len();
            }
        }
        total
    } else {
        std::fs::metadata(path).map_err(|e| e.to_string())?.len()
    };
    Ok(BackupInfo {
        file_path: path.to_string_lossy().to_string(),
        file_name: path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        file_size_bytes: size,
        created_at: format!(
            "{:?}",
            std::fs::metadata(path)
                .and_then(|m| m.modified())
                .unwrap_or(std::time::SystemTime::now())
        ),
        includes_rewards,
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
                let name = entry.file_name().to_string_lossy().to_string();
                if !name.starts_with("flow_backup_") {
                    continue;
                }
                if metadata.is_file() && name.ends_with(".db") {
                    if let Ok(info) = backup_info(&entry.path(), false) {
                        list.push(info);
                    }
                } else if metadata.is_dir() && name.ends_with(".flowbackup") {
                    let manifest = std::fs::read(entry.path().join("manifest.json"))
                        .ok()
                        .and_then(|bytes| serde_json::from_slice::<serde_json::Value>(&bytes).ok());
                    if let Some(manifest) = manifest {
                        let includes_rewards = manifest
                            .get("includesRewards")
                            .and_then(|value| value.as_bool())
                            .unwrap_or(false);
                        if manifest.get("version").and_then(|value| value.as_u64()) == Some(2)
                            && entry.path().join("flow.db").is_file()
                            && (!includes_rewards || entry.path().join("flow-rewards.db").is_file())
                        {
                            if let Ok(info) = backup_info(&entry.path(), includes_rewards) {
                                list.push(info);
                            }
                        }
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
        .manage(FirebaseGoogleAuthState::default())
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
            open_backup_folder,
            start_firebase_google_auth,
            poll_firebase_google_auth,
            cancel_firebase_google_auth
        ])
        .setup(|_app| Ok(()))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod backup_tests {
    use super::*;
    use sqlx::sqlite::SqliteConnectOptions;
    use sqlx::{Connection, SqliteConnection};

    #[test]
    fn captures_both_live_sqlite_databases_and_preserves_existing_backups() {
        let unique = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let root =
            std::env::temp_dir().join(format!("flow-backup-test-{}-{unique}", std::process::id()));
        let source = root.join("source");
        let destination = root.join("backups");
        std::fs::create_dir_all(&source).unwrap();
        tauri::async_runtime::block_on(async {
            let mut routine = SqliteConnection::connect_with(
                &SqliteConnectOptions::new()
                    .filename(source.join("flow.db"))
                    .create_if_missing(true),
            )
            .await
            .unwrap();
            let mut rewards = SqliteConnection::connect_with(
                &SqliteConnectOptions::new()
                    .filename(source.join("flow-rewards.db"))
                    .create_if_missing(true),
            )
            .await
            .unwrap();
            sqlx::query("PRAGMA journal_mode=WAL")
                .execute(&mut routine)
                .await
                .unwrap();
            sqlx::query("PRAGMA journal_mode=WAL")
                .execute(&mut rewards)
                .await
                .unwrap();
            sqlx::query("CREATE TABLE tasks (title TEXT)")
                .execute(&mut routine)
                .await
                .unwrap();
            sqlx::query("INSERT INTO tasks VALUES ('rotina')")
                .execute(&mut routine)
                .await
                .unwrap();
            sqlx::query("CREATE TABLE fish (species TEXT)")
                .execute(&mut rewards)
                .await
                .unwrap();
            sqlx::query("INSERT INTO fish VALUES ('goldfish')")
                .execute(&mut rewards)
                .await
                .unwrap();

            let first = create_backup_set(&source, &destination, "flow_backup_2026-10-05.db")
                .await
                .unwrap();
            assert!(first.includes_rewards);
            assert_eq!(first.file_name, "flow_backup_2026-10-05.flowbackup");
            let serialized = serde_json::to_value(&first).unwrap();
            assert_eq!(serialized["includesRewards"], true);
            assert_eq!(serialized["fileName"], first.file_name);
            let copied = std::path::Path::new(&first.file_path);
            let mut routine_copy = SqliteConnection::connect_with(
                &SqliteConnectOptions::new()
                    .filename(copied.join("flow.db"))
                    .read_only(true),
            )
            .await
            .unwrap();
            let mut rewards_copy = SqliteConnection::connect_with(
                &SqliteConnectOptions::new()
                    .filename(copied.join("flow-rewards.db"))
                    .read_only(true),
            )
            .await
            .unwrap();
            let task: String = sqlx::query_scalar("SELECT title FROM tasks")
                .fetch_one(&mut routine_copy)
                .await
                .unwrap();
            let fish: String = sqlx::query_scalar("SELECT species FROM fish")
                .fetch_one(&mut rewards_copy)
                .await
                .unwrap();
            assert_eq!(task, "rotina");
            assert_eq!(fish, "goldfish");
            let restored = root.join("restored");
            std::fs::create_dir(&restored).unwrap();
            std::fs::copy(copied.join("flow.db"), restored.join("flow.db")).unwrap();
            std::fs::copy(
                copied.join("flow-rewards.db"),
                restored.join("flow-rewards.db"),
            )
            .unwrap();
            let mut restored_rewards = SqliteConnection::connect_with(
                &SqliteConnectOptions::new()
                    .filename(restored.join("flow-rewards.db"))
                    .read_only(true),
            )
            .await
            .unwrap();
            let restored_fish: String = sqlx::query_scalar("SELECT species FROM fish")
                .fetch_one(&mut restored_rewards)
                .await
                .unwrap();
            assert_eq!(restored_fish, "goldfish");

            let second = create_backup_set(&source, &destination, "flow_backup_2026-10-05.db")
                .await
                .unwrap();
            assert_eq!(second.file_name, "flow_backup_2026-10-05_2.flowbackup");
            assert!(copied.exists());
            std::fs::write(destination.join("flow_backup_2026-09-01.db"), b"legacy").unwrap();
            let listed = list_database_backups(destination.to_string_lossy().to_string())
                .await
                .unwrap();
            assert_eq!(listed.len(), 3);
            assert_eq!(
                listed.iter().filter(|info| info.includes_rewards).count(),
                2
            );
            assert_eq!(
                listed.iter().filter(|info| !info.includes_rewards).count(),
                1
            );
            routine_copy.close().await.unwrap();
            rewards_copy.close().await.unwrap();
            restored_rewards.close().await.unwrap();
            routine.close().await.unwrap();
            rewards.close().await.unwrap();
        });
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn never_publishes_a_partial_backup_when_rewards_are_missing_or_corrupt() {
        let unique = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let root = std::env::temp_dir().join(format!(
            "flow-backup-failure-test-{}-{unique}",
            std::process::id()
        ));
        let source = root.join("source");
        let destination = root.join("backups");
        std::fs::create_dir_all(&source).unwrap();
        tauri::async_runtime::block_on(async {
            let mut routine = SqliteConnection::connect_with(
                &SqliteConnectOptions::new()
                    .filename(source.join("flow.db"))
                    .create_if_missing(true),
            )
            .await
            .unwrap();
            sqlx::query("CREATE TABLE tasks (title TEXT)")
                .execute(&mut routine)
                .await
                .unwrap();
            routine.close().await.unwrap();
            assert!(
                create_backup_set(&source, &destination, "flow_backup_2026-10-05.db")
                    .await
                    .is_err()
            );
            std::fs::write(source.join("flow-rewards.db"), b"not a sqlite database").unwrap();
            assert!(
                create_backup_set(&source, &destination, "flow_backup_2026-10-05.db")
                    .await
                    .is_err()
            );
            assert!(
                list_database_backups(destination.to_string_lossy().to_string())
                    .await
                    .unwrap()
                    .is_empty()
            );
        });
        std::fs::remove_dir_all(root).unwrap();
    }
}
