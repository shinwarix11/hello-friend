package aegis

// User is an application end user.
type User struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	Email       string `json:"email,omitempty"`
	Status      string `json:"status,omitempty"`
	HWID        string `json:"hwid,omitempty"`
	CreatedAt   string `json:"created_at,omitempty"`
	LastLoginAt string `json:"last_login_at,omitempty"`
}

// License describes a license and its activation state.
type License struct {
	Key            string `json:"key,omitempty"`
	Status         string `json:"status,omitempty"`
	ExpiresAt      string `json:"expires_at,omitempty"`
	Activations    int    `json:"activations,omitempty"`
	MaxActivations int    `json:"max_activations,omitempty"`
	Level          int    `json:"level,omitempty"`
}

// Session is an issued session token.
type Session struct {
	Token     string `json:"token"`
	ExpiresAt string `json:"expires_at,omitempty"`
}

// VersionInfo is the result of a version check.
type VersionInfo struct {
	Latest          string `json:"latest,omitempty"`
	Current         string `json:"current,omitempty"`
	UpdateAvailable bool   `json:"update_available,omitempty"`
	UpdateRequired  bool   `json:"update_required,omitempty"`
	DownloadURL     string `json:"download_url,omitempty"`
	Changelog       string `json:"changelog,omitempty"`
}

// InitResult is returned by Init.
type InitResult struct {
	Status      string                 `json:"status,omitempty"`
	Application map[string]interface{} `json:"application,omitempty"`
	Version     *VersionInfo           `json:"version,omitempty"`
}

// AuthResult is returned by Login and Register.
type AuthResult struct {
	User    User     `json:"user"`
	License *License `json:"license,omitempty"`
	Session *Session `json:"session,omitempty"`
}

// LicenseResult is returned by license validation and activation.
type LicenseResult struct {
	Valid     bool     `json:"valid,omitempty"`
	Activated bool     `json:"activated,omitempty"`
	Status    string   `json:"status,omitempty"`
	License   *License `json:"license,omitempty"`
}

// SessionCheck is returned by Heartbeat and CheckSession.
type SessionCheck struct {
	Valid     bool     `json:"valid,omitempty"`
	Alive     bool     `json:"alive,omitempty"`
	User      *User    `json:"user,omitempty"`
	License   *License `json:"license,omitempty"`
	ExpiresAt string   `json:"expires_at,omitempty"`
}

// Variables is a scoped key/value bag.
type Variables struct {
	Scope     string            `json:"scope"`
	Variables map[string]string `json:"variables"`
}