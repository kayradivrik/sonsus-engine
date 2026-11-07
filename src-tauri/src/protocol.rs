//! Asenkron yerel medya protokolü (`krnlmedia://`).
//!
//! Görsel okumalarını GTK ana arayüz iş parçacığı (main thread) yerine Tokio arka plan
//! havuzunda çalıştırarak 500+ poster kaydırılırken sıfır takılma (zero UI stall) sağlar.

use tauri::{
    http::{Request, Response, StatusCode},
    UriSchemeResponder,
};

fn percent_decode_str(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let (Some(hi), Some(lo)) = (
                (bytes[i + 1] as char).to_digit(16),
                (bytes[i + 2] as char).to_digit(16),
            ) {
                out.push(((hi << 4) | lo) as u8);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn sniff_image_mime(bytes: &[u8]) -> &'static str {
    if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        "image/jpeg"
    } else if bytes.starts_with(&[0x89, b'P', b'N', b'G']) {
        "image/png"
    } else if bytes.len() >= 12 && &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        "image/webp"
    } else if bytes.starts_with(b"GIF8") {
        "image/gif"
    } else {
        "image/jpeg"
    }
}

pub fn handle_krnlmedia_request(request: Request<Vec<u8>>, responder: UriSchemeResponder) {
    let raw_path = request.uri().path().to_string();

    tauri::async_runtime::spawn(async move {
        // Olası `?t=...` önbellek yenileme sorgu parametrelerini ayıkla
        let clean_raw = raw_path.split('?').next().unwrap_or(&raw_path);
        let stripped = clean_raw.strip_prefix('/').unwrap_or(clean_raw);
        let decoded = percent_decode_str(stripped);
        let file_path = if decoded.starts_with('/') || decoded.contains(':') {
            decoded
        } else {
            format!("/{decoded}")
        };

        if file_path.contains("..") {
            responder.respond(
                Response::builder()
                    .status(StatusCode::FORBIDDEN)
                    .header("Access-Control-Allow-Origin", "*")
                    .body(Vec::new())
                    .unwrap(),
            );
            return;
        }

        match tokio::fs::read(&file_path).await {
            Ok(bytes) => {
                let mime = sniff_image_mime(&bytes);
                responder.respond(
                    Response::builder()
                        .status(StatusCode::OK)
                        .header("Content-Type", mime)
                        .header("Access-Control-Allow-Origin", "*")
                        .header("Cache-Control", "public, max-age=604800, immutable")
                        .body(bytes)
                        .unwrap(),
                );
            }
            Err(_) => {
                responder.respond(
                    Response::builder()
                        .status(StatusCode::NOT_FOUND)
                        .header("Access-Control-Allow-Origin", "*")
                        .body(Vec::new())
                        .unwrap(),
                );
            }
        }
    });
}

