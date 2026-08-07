// Aegis Authentication API client for C++17.
// Requires libcurl. Header declares the full public surface.
#pragma once

#include <atomic>
#include <chrono>
#include <functional>
#include <memory>
#include <stdexcept>
#include <string>
#include <thread>

#include "aegis/json.hpp"

namespace aegis {

/** Every Aegis failure surfaces as this exception. */
class AegisError : public std::runtime_error {
public:
    AegisError(std::string code, const std::string& message, long status = 0)
        : std::runtime_error(message), code_(std::move(code)), status_(status) {}

    const std::string& code() const noexcept { return code_; }
    long status() const noexcept { return status_; }
    bool isNetworkError() const noexcept { return status_ == 0; }
    bool isAuthError() const noexcept { return code_ == "unauthorized" || code_ == "invalid_credentials"; }
    bool isLicenseError() const noexcept { return code_.rfind("license", 0) == 0 || code_ == "hwid_mismatch"; }

private:
    std::string code_;
    long status_;
};

/** Client configuration. */
struct Options {
    std::string baseUrl;
    std::string appKey;
    std::string apiKey;
    std::string version = "1.0.0";
    std::string channel = "stable";
    std::string hwid;              ///< Defaults to Client::hardwareId().
    long timeoutSeconds = 20;
    int maxRetries = 2;
};

/** Thread-safe client for the Aegis Authentication API. */
class Client {
public:
    explicit Client(Options options);
    ~Client();

    Client(const Client&) = delete;
    Client& operator=(const Client&) = delete;

    /** Stable, non-reversible machine identifier. */
    static std::string hardwareId();

    const std::string& sessionToken() const { return sessionToken_; }
    /** Restores a token persisted by the host application. */
    void useSession(std::string token) { sessionToken_ = std::move(token); }

    /** Calls any endpoint and returns its `data` payload. */
    Json request(const std::string& endpoint, const Json& body = Json(JsonObject{}));

    // Application
    Json init();
    Json status();
    Json appData();
    Json checkVersion(const std::string& version = "");
    Json downloads();

    // Authentication
    Json registerUser(const std::string& username, const std::string& password,
                      const std::string& email = "", const std::string& licenseKey = "");
    Json login(const std::string& username, const std::string& password);
    void logout();
    Json heartbeat();
    Json checkSession();
    bool isAuthenticated();
    Json userData();

    // Licensing
    Json validateLicense(const std::string& licenseKey);
    Json activateLicense(const std::string& licenseKey, const std::string& username = "");

    // Variables
    Json getVariables(const std::string& scope = "application", const std::string& licenseKey = "");
    Json setVariable(const std::string& key, const std::string& value,
                     const std::string& scope = "user", const std::string& licenseKey = "");

    Json triggerWebhook(const std::string& event, const Json& payload = Json(JsonObject{}));

    /** Starts a background heartbeat; `onRevoked` fires once when the session dies. */
    void startHeartbeat(std::chrono::seconds interval, std::function<void(const std::string&)> onRevoked);
    void stopHeartbeat();

private:
    void storeSession(const Json& data);

    Options options_;
    std::string sessionToken_;
    std::atomic<bool> heartbeatRunning_{false};
    std::thread heartbeatThread_;
};

}  // namespace aegis