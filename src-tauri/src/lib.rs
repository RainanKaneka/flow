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
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            show_windows_toast,
            apply_inapp_update
        ])
        .setup(|_app| {
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
