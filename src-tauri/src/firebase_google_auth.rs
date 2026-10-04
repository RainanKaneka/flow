use serde::Serialize;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use std::time::{Duration, Instant};

#[derive(Default)]
pub struct FirebaseGoogleAuthState(pub Mutex<Option<Session>>);

pub struct Session {
    state: String,
    result: Arc<Mutex<Option<String>>>,
    cancelled: Arc<AtomicBool>,
    started: Instant,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PendingAuth {
    port: u16,
}

fn valid_origin(origin: &str) -> bool {
    let Some(host) = origin.strip_prefix("https://") else {
        return false;
    };
    !host.contains(['/', ':', '?', '#', '@'])
        && (host.ends_with(".web.app") || host.ends_with(".firebaseapp.com"))
}

fn valid_state(state: &str) -> bool {
    state.len() == 64 && state.bytes().all(|b| b.is_ascii_hexdigit())
}

fn decode_form(value: &str) -> Option<String> {
    let mut bytes = Vec::new();
    let mut chars = value.bytes();
    while let Some(byte) = chars.next() {
        match byte {
            b'+' => bytes.push(b' '),
            b'%' => {
                let a = (chars.next()? as char).to_digit(16)?;
                let b = (chars.next()? as char).to_digit(16)?;
                bytes.push((a * 16 + b) as u8);
            }
            other => bytes.push(other),
        }
    }
    String::from_utf8(bytes).ok()
}

fn parse_callback(body: &str, expected_state: &str) -> Option<String> {
    let mut state = None;
    let mut token = None;
    for field in body.split('&') {
        let (key, value) = field.split_once('=')?;
        match key {
            "state" if state.is_none() => state = Some(decode_form(value)?),
            "id_token" if token.is_none() => token = Some(decode_form(value)?),
            _ => return None,
        }
    }
    let token = token?;
    if state.as_deref() != Some(expected_state)
        || token.len() > 16000
        || token.split('.').count() != 3
        || !token
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"._-".contains(&b))
    {
        return None;
    }
    Some(token)
}

fn respond(stream: &mut TcpStream, success: bool) {
    let (status, body) = if success {
        (
            "200 OK",
            "Conexao concluida. Pode fechar esta aba e voltar ao Flow.",
        )
    } else {
        (
            "400 Bad Request",
            "Esta tentativa de conexao nao e valida. Volte ao Flow e tente novamente.",
        )
    };
    let response = format!(
        "HTTP/1.1 {status}\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: {}\r\nCache-Control: no-store\r\nReferrer-Policy: no-referrer\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    let _ = stream.write_all(response.as_bytes());
}

fn read_callback(stream: &mut TcpStream, origin: &str, port: u16, state: &str) -> Option<String> {
    stream.set_read_timeout(Some(Duration::from_secs(3))).ok()?;
    stream
        .set_write_timeout(Some(Duration::from_secs(3)))
        .ok()?;
    let mut request = Vec::new();
    let mut chunk = [0; 2048];
    let header_end = loop {
        if request.len() > 32768 {
            return None;
        }
        let count = stream.read(&mut chunk).ok()?;
        if count == 0 {
            return None;
        }
        request.extend_from_slice(&chunk[..count]);
        if let Some(pos) = request.windows(4).position(|part| part == b"\r\n\r\n") {
            break pos;
        }
    };
    let header = std::str::from_utf8(&request[..header_end]).ok()?;
    let mut lines = header.split("\r\n");
    if lines.next()? != "POST /callback HTTP/1.1" {
        return None;
    }
    let mut length = None;
    let mut host = None;
    let mut request_origin = None;
    let mut content_type = None;
    for line in lines {
        let (key, value) = line.split_once(':')?;
        let value = value.trim();
        match key.to_ascii_lowercase().as_str() {
            "content-length" => length = value.parse::<usize>().ok(),
            "host" => host = Some(value),
            "origin" => request_origin = Some(value),
            "content-type" => content_type = Some(value),
            "transfer-encoding" => return None,
            _ => {}
        }
    }
    let expected_host = format!("127.0.0.1:{port}");
    // Uma navegação HTTPS -> loopback com no-referrer pode serializar Origin como null.
    // O state aleatório de uso único continua obrigatório em ambos os casos.
    if host != Some(expected_host.as_str())
        || (request_origin != Some(origin) && request_origin != Some("null"))
        || !content_type?.starts_with("application/x-www-form-urlencoded")
    {
        return None;
    }
    let length = length?;
    if length == 0 || length > 24576 {
        return None;
    }
    let body_start = header_end + 4;
    while request.len() < body_start + length {
        let count = stream.read(&mut chunk).ok()?;
        if count == 0 || request.len() + count > 32768 {
            return None;
        }
        request.extend_from_slice(&chunk[..count]);
    }
    parse_callback(
        std::str::from_utf8(&request[body_start..body_start + length]).ok()?,
        state,
    )
}

#[tauri::command]
pub fn start_firebase_google_auth(
    origin: String,
    state: String,
    sessions: tauri::State<'_, FirebaseGoogleAuthState>,
) -> Result<PendingAuth, String> {
    if !valid_origin(&origin) || !valid_state(&state) {
        return Err("Configuracao de login Google invalida.".into());
    }
    let listener =
        TcpListener::bind("127.0.0.1:0").map_err(|_| "Nao foi possivel iniciar o login local.")?;
    listener
        .set_nonblocking(true)
        .map_err(|_| "Nao foi possivel iniciar o login local.")?;
    let port = listener
        .local_addr()
        .map_err(|_| "Nao foi possivel iniciar o login local.")?
        .port();
    let result = Arc::new(Mutex::new(None));
    let cancelled = Arc::new(AtomicBool::new(false));
    let started = Instant::now();
    let mut active = sessions
        .0
        .lock()
        .map_err(|_| "Nao foi possivel iniciar o login.")?;
    if let Some(previous) = active.take() {
        previous.cancelled.store(true, Ordering::Relaxed);
    }
    *active = Some(Session {
        state: state.clone(),
        result: result.clone(),
        cancelled: cancelled.clone(),
        started,
    });
    std::thread::spawn(move || {
        while !cancelled.load(Ordering::Relaxed) && started.elapsed() < Duration::from_secs(300) {
            match listener.accept() {
                Ok((mut stream, peer)) => {
                    let token = if peer.ip().is_loopback() {
                        read_callback(&mut stream, &origin, port, &state)
                    } else {
                        None
                    };
                    respond(&mut stream, token.is_some());
                    if let Some(token) = token {
                        if let Ok(mut value) = result.lock() {
                            *value = Some(token);
                        }
                        break;
                    }
                }
                Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                    std::thread::sleep(Duration::from_millis(50))
                }
                Err(_) => break,
            }
        }
    });
    Ok(PendingAuth { port })
}

#[tauri::command]
pub fn poll_firebase_google_auth(
    state: String,
    sessions: tauri::State<'_, FirebaseGoogleAuthState>,
) -> Result<Option<String>, String> {
    let mut active = sessions
        .0
        .lock()
        .map_err(|_| "Nao foi possivel verificar o login.")?;
    let session = active
        .as_ref()
        .ok_or("Esta tentativa de login foi encerrada.")?;
    if session.state != state {
        return Err("Esta tentativa de login foi substituida.".into());
    }
    if session.started.elapsed() >= Duration::from_secs(300) {
        if let Some(session) = active.take() {
            session.cancelled.store(true, Ordering::Relaxed);
        }
        return Err("Tempo esgotado. Inicie o login com Google novamente.".into());
    }
    let token = session
        .result
        .lock()
        .map_err(|_| "Nao foi possivel verificar o login.")?
        .take();
    if token.is_some() {
        active.take();
    }
    Ok(token)
}

#[tauri::command]
pub fn cancel_firebase_google_auth(
    state: String,
    sessions: tauri::State<'_, FirebaseGoogleAuthState>,
) -> Result<(), String> {
    let mut active = sessions
        .0
        .lock()
        .map_err(|_| "Nao foi possivel cancelar o login.")?;
    if active
        .as_ref()
        .is_some_and(|session| session.state == state)
    {
        if let Some(session) = active.take() {
            session.cancelled.store(true, Ordering::Relaxed);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_only_hosting_origins_and_secure_states() {
        assert!(valid_origin("https://flow-app-prod.web.app"));
        assert!(!valid_origin("https://flow-app-prod.web.app.evil.example"));
        assert!(!valid_origin("http://flow-app-prod.web.app"));
        assert!(!valid_origin("https://flow-app-prod.web.app/path"));
        assert!(valid_state(&"a".repeat(64)));
        assert!(!valid_state("short"));
    }

    #[test]
    fn validates_state_and_never_accepts_duplicate_fields() {
        let state = "a".repeat(64);
        assert_eq!(
            parse_callback(
                &format!("state={state}&id_token=header.payload.signature"),
                &state
            ),
            Some("header.payload.signature".into())
        );
        assert!(parse_callback("state=wrong&id_token=header.payload.signature", &state).is_none());
        assert!(parse_callback(
            &format!("state={state}&state={state}&id_token=h.p.s"),
            &state
        )
        .is_none());
        assert!(parse_callback(&format!("state={state}&id_token=not-a-token"), &state).is_none());
        assert_eq!(decode_form("hello%20world"), Some("hello world".into()));
        assert!(decode_form("%XX").is_none());
    }

    fn http_callback(origin: &str, host: &str, body: &str, extra: &str) -> Option<String> {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        let address = listener.local_addr().unwrap();
        let request = format!("POST /callback HTTP/1.1\r\nHost: {}\r\nOrigin: {origin}\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: {}\r\n{extra}\r\n{body}", if host.is_empty() { format!("127.0.0.1:{port}") } else { host.into() }, body.len());
        let writer = std::thread::spawn(move || {
            TcpStream::connect(address)
                .unwrap()
                .write_all(request.as_bytes())
                .unwrap();
        });
        let (mut stream, _) = listener.accept().unwrap();
        let token = read_callback(
            &mut stream,
            "https://flow-rainan-prod.web.app",
            port,
            &"a".repeat(64),
        );
        writer.join().unwrap();
        token
    }

    #[test]
    fn callback_requires_loopback_host_origin_state_and_bounded_post() {
        let body = format!("state={}&id_token=h.p.s", "a".repeat(64));
        assert_eq!(
            http_callback("https://flow-rainan-prod.web.app", "", &body, ""),
            Some("h.p.s".into())
        );
        assert_eq!(http_callback("null", "", &body, ""), Some("h.p.s".into()));
        assert!(http_callback("https://evil.example", "", &body, "").is_none());
        assert!(http_callback("null", "evil.example", &body, "").is_none());
        assert!(http_callback("null", "", "state=wrong&id_token=h.p.s", "").is_none());
        assert!(http_callback("null", "", &"x".repeat(24577), "").is_none());
        assert!(http_callback("null", "", &body, "Transfer-Encoding: chunked\r\n").is_none());
    }
}
