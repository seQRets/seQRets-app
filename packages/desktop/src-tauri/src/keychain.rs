//! OS-native credential storage for seQRets desktop.
//!
//! Wraps the `keyring` crate to provide Tauri IPC commands for
//! storing, retrieving, and deleting secrets in the OS keychain
//! (macOS Keychain / Windows Credential Store / Linux Secret Service).

use keyring::Entry;

const SERVICE_NAME: &str = "com.seqrets.desktop";

/// Only these entries may be touched from the webview. A compromised
/// renderer must not be able to read, overwrite, or delete arbitrary
/// credentials under the service namespace — only the one key the app uses.
const ALLOWED_KEYS: &[&str] = &["gemini-api-key"];

fn ensure_allowed(key: &str) -> Result<(), String> {
    if ALLOWED_KEYS.contains(&key) {
        Ok(())
    } else {
        Err("Unauthorized keychain key.".to_string())
    }
}

/// Retrieve a secret from the OS keychain.
/// Returns `Ok(None)` if the entry does not exist.
#[tauri::command]
pub fn keychain_get(key: String) -> Result<Option<String>, String> {
    ensure_allowed(&key)?;
    let entry = Entry::new(SERVICE_NAME, &key)
        .map_err(|e| format!("Keychain error: {e}"))?;
    match entry.get_password() {
        Ok(val) => Ok(Some(val)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Keychain read error: {e}")),
    }
}

/// Store a secret in the OS keychain.
#[tauri::command]
pub fn keychain_set(key: String, value: String) -> Result<(), String> {
    ensure_allowed(&key)?;
    let entry = Entry::new(SERVICE_NAME, &key)
        .map_err(|e| format!("Keychain error: {e}"))?;
    entry
        .set_password(&value)
        .map_err(|e| format!("Keychain write error: {e}"))
}

/// Delete a secret from the OS keychain.
/// Silently succeeds if the entry does not exist.
#[tauri::command]
pub fn keychain_delete(key: String) -> Result<(), String> {
    ensure_allowed(&key)?;
    let entry = Entry::new(SERVICE_NAME, &key)
        .map_err(|e| format!("Keychain error: {e}"))?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("Keychain delete error: {e}")),
    }
}
