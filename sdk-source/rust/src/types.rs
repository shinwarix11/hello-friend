use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct User {
    pub id: String,
    pub username: String,
    #[serde(default)]
    pub email: Option<String>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub hwid: Option<String>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub last_login_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct License {
    #[serde(default)]
    pub key: Option<String>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub expires_at: Option<String>,
    #[serde(default)]
    pub activations: Option<u32>,
    #[serde(default)]
    pub max_activations: Option<u32>,
    #[serde(default)]
    pub level: Option<u32>,
}

#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct Session {
    pub token: String,
    #[serde(default)]
    pub expires_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct VersionInfo {
    #[serde(default)]
    pub latest: Option<String>,
    #[serde(default)]
    pub current: Option<String>,
    #[serde(default)]
    pub update_available: bool,
    #[serde(default)]
    pub update_required: bool,
    #[serde(default)]
    pub download_url: Option<String>,
    #[serde(default)]
    pub changelog: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct InitResult {
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub application: Option<serde_json::Value>,
    #[serde(default)]
    pub version: Option<VersionInfo>,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct AuthResult {
    pub user: User,
    #[serde(default)]
    pub license: Option<License>,
    #[serde(default)]
    pub session: Option<Session>,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct LicenseResult {
    #[serde(default)]
    pub valid: bool,
    #[serde(default)]
    pub activated: bool,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub license: Option<License>,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct SessionCheck {
    #[serde(default)]
    pub valid: bool,
    #[serde(default)]
    pub alive: bool,
    #[serde(default)]
    pub user: Option<User>,
    #[serde(default)]
    pub license: Option<License>,
    #[serde(default)]
    pub expires_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct Variables {
    #[serde(default)]
    pub scope: String,
    #[serde(default)]
    pub variables: HashMap<String, String>,
}

/// Variable scope accepted by the API.
#[derive(Debug, Clone, Copy)]
pub enum Scope {
    Application,
    User,
    LicenseScope,
}

impl Scope {
    pub fn as_str(self) -> &'static str {
        match self {
            Scope::Application => "application",
            Scope::User => "user",
            Scope::LicenseScope => "license",
        }
    }
}