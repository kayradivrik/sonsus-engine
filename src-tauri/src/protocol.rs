//! Asenkron çapraz platform yerel medya protokolü (`sonsusmedia://` & `krnlmedia://`).
//! Hem Linux (`/home/...`) hem Windows (`C:/...` / `C:\...`) mutlak yollarını destekler.

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

fn normalize_local_media_path(raw_uri_path: &str) -> String {
    let clean_raw = raw_uri_path.split('?').next().unwrap_or(raw_uri_path);
    let stripped = clean_raw.strip_prefix('/').unwrap_or(clean_raw);
    let decoded = percent_decode_str(stripped);

    // Windows sürücü harfi kontrolü (`C:/...` veya `C:\...`)
    let bytes = decoded.as_bytes();
    if bytes.len() >= 2 && bytes[0].is_ascii_alphabetic() && bytes[1] == b':' {
        return decoded;
    }
    if decoded.starts_with('/') || decoded.starts_with('\\') {
        decoded
    } else {
        format!("/{decoded}")
    }
}

pub fn handle_local_media_request(request: Request<Vec<u8>>, responder: UriSchemeResponder) {
    let raw_path = request.uri().path().to_string();

    tauri::async_runtime::spawn(async move {
        let file_path = normalize_local_media_path(&raw_path);

        if file_path.contains("..") {
            let resp = Response::builder()
                .status(StatusCode::FORBIDDEN)
                .header("Access-Control-Allow-Origin", "*")
                .body(Vec::new())
                .unwrap_or_else(|_| Response::new(Vec::new()));
            responder.respond(resp);
            return;
        }

        match tokio::fs::read(&file_path).await {
            Ok(bytes) => {
                let mime = sniff_image_mime(&bytes);
                let resp = Response::builder()
                    .status(StatusCode::OK)
                    .header("Content-Type", mime)
                    .header("Access-Control-Allow-Origin", "*")
                    .header("Cache-Control", "public, max-age=604800, immutable")
                    .body(bytes)
                    .unwrap_or_else(|_| Response::new(Vec::new()));
                responder.respond(resp);
            }
            Err(_) => {
                let resp = Response::builder()
                    .status(StatusCode::NOT_FOUND)
                    .header("Access-Control-Allow-Origin", "*")
                    .body(Vec::new())
                    .unwrap_or_else(|_| Response::new(Vec::new()));
                responder.respond(resp);
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_unix_and_windows_media_paths() {
        assert_eq!(
            normalize_local_media_path("/home/user/Masa%C3%BCst%C3%BC/cover.jpg?v=123"),
            "/home/user/Masaüstü/cover.jpg"
        );
        assert_eq!(
            normalize_local_media_path("/C%3A%5CGames%5CCover.png"),
            r"C:\Games\Cover.png"
        );
        assert_eq!(
            normalize_local_media_path("/D:/Games/Cover.jpg"),
            "D:/Games/Cover.jpg"
        );
    }
}
