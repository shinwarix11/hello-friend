// Implementation of the Aegis C++ client. Requires libcurl.
#include "aegis/aegis.hpp"

#include <curl/curl.h>

#include <array>
#include <cstdlib>
#include <functional>
#include <sstream>

#if defined(_WIN32)
#include <windows.h>
#else
#include <unistd.h>
#endif

namespace aegis {
namespace {

size_t writeCallback(char* ptr, size_t size, size_t nmemb, void* userdata) {
    auto* out = static_cast<std::string*>(userdata);
    out->append(ptr, size * nmemb);
    return size * nmemb;
}

std::string trimSlashes(std::string value) {
    while (!value.empty() && value.back() == '/') value.pop_back();
    return value;
}

/** FNV-1a based hex digest — stable across runs, never reveals raw machine facts. */
std::string digest(const std::string& input) {
    uint64_t h = 1469598103934665603ULL;
    for (unsigned char c : input) {
        h ^= c;
        h *= 1099511628211ULL;
    }
    std::ostringstream out;
    for (int round = 0; round < 4; ++round) {
        h ^= h >> 33;
        h *= 0xff51afd7ed558ccdULL;
        out << std::hex << h;
    }
    return out.str().substr(0, 64);
}

}  // namespace

Client::Client(Options options) : options_(std::move(options)) {
    if (options_.baseUrl.empty()) throw AegisError("invalid_options", "baseUrl is required.");
    if (options_.appKey.empty()) throw AegisError("invalid_options", "appKey is required.");
    options_.baseUrl = trimSlashes(options_.baseUrl);
    if (options_.hwid.empty()) options_.hwid = hardwareId();
    curl_global_init(CURL_GLOBAL_DEFAULT);
}

Client::~Client() {
    stopHeartbeat();
}

std::string Client::hardwareId() {
    std::string facts;
#if defined(_WIN32)
    char name[256] = {0};
    DWORD size = sizeof(name);
    GetComputerNameA(name, &size);
    facts += name;
    if (const char* user = std::getenv("USERNAME")) facts += user;
    facts += "windows";
#else
    std::array<char, 256> host{};
    if (gethostname(host.data(), host.size()) == 0) facts += host.data();
    if (const char* user = std::getenv("USER")) facts += user;
    facts += "posix";
#endif
    return digest(facts);
}

Json Client::request(const std::string& endpoint, const Json& body) {
    std::string url = options_.baseUrl + "/api/public/v1/" + endpoint;
    std::string payload = body.dump();
    std::string lastNetworkError;

    for (int attempt = 0; attempt <= options_.maxRetries; ++attempt) {
        CURL* curl = curl_easy_init();
        if (!curl) throw AegisError("network_error", "Unable to create an HTTP client.");

        curl_slist* headers = nullptr;
        headers = curl_slist_append(headers, "content-type: application/json");
        headers = curl_slist_append(headers, "user-agent: aegis-cpp-sdk/1.0.0");
        headers = curl_slist_append(headers, ("x-app-key: " + options_.appKey).c_str());
        if (!options_.apiKey.empty()) headers = curl_slist_append(headers, ("x-api-key: " + options_.apiKey).c_str());
        if (!sessionToken_.empty()) headers = curl_slist_append(headers, ("x-session-token: " + sessionToken_).c_str());

        std::string response;
        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_POST, 1L);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, payload.c_str());
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, writeCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, options_.timeoutSeconds);

        CURLcode code = curl_easy_perform(curl);
        long status = 0;
        curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &status);
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);

        if (code != CURLE_OK) {
            lastNetworkError = curl_easy_strerror(code);
            if (attempt < options_.maxRetries) {
                std::this_thread::sleep_for(std::chrono::milliseconds(250 * (attempt + 1)));
                continue;
            }
            break;
        }
        if (status >= 500 && attempt < options_.maxRetries) {
            std::this_thread::sleep_for(std::chrono::milliseconds(250 * (attempt + 1)));
            continue;
        }

        Json envelope = Json::parse(response.empty() ? "{}" : response);
        if (!envelope["success"].asBool()) {
            const Json& error = envelope["error"];
            throw AegisError(error["code"].asString("server_error"),
                             error["message"].asString("Request failed."), status);
        }
        return envelope["data"];
    }

    throw AegisError("network_error", lastNetworkError.empty() ? "Network request failed." : lastNetworkError);
}

void Client::storeSession(const Json& data) {
    std::string token = data["session"]["token"].asString();
    if (!token.empty()) sessionToken_ = token;
}

Json Client::init() {
    JsonObject body;
    body.emplace("version", Json(options_.version));
    return request("init", Json(body));
}

Json Client::status() { return request("status"); }

Json Client::appData() { return request("app/data"); }

Json Client::downloads() { return request("downloads"); }

Json Client::checkVersion(const std::string& version) {
    JsonObject body;
    body.emplace("version", Json(version.empty() ? options_.version : version));
    body.emplace("channel", Json(options_.channel));
    return request("version/check", Json(body));
}

Json Client::registerUser(const std::string& username, const std::string& password,
                          const std::string& email, const std::string& licenseKey) {
    JsonObject body;
    body.emplace("username", Json(username));
    body.emplace("password", Json(password));
    body.emplace("hwid", Json(options_.hwid));
    if (!email.empty()) body.emplace("email", Json(email));
    if (!licenseKey.empty()) body.emplace("license_key", Json(licenseKey));
    Json data = request("register", Json(body));
    storeSession(data);
    return data;
}

Json Client::login(const std::string& username, const std::string& password) {
    JsonObject body;
    body.emplace("username", Json(username));
    body.emplace("password", Json(password));
    body.emplace("hwid", Json(options_.hwid));
    Json data = request("login", Json(body));
    storeSession(data);
    return data;
}

void Client::logout() {
    try {
        request("logout");
    } catch (...) {
        sessionToken_.clear();
        throw;
    }
    sessionToken_.clear();
}

Json Client::heartbeat() { return request("heartbeat"); }

Json Client::checkSession() { return request("session/check"); }

bool Client::isAuthenticated() {
    if (sessionToken_.empty()) return false;
    try {
        return checkSession()["valid"].asBool();
    } catch (const AegisError&) {
        return false;
    }
}

Json Client::userData() { return request("user/data"); }

Json Client::validateLicense(const std::string& licenseKey) {
    JsonObject body;
    body.emplace("license_key", Json(licenseKey));
    body.emplace("hwid", Json(options_.hwid));
    return request("license/validate", Json(body));
}

Json Client::activateLicense(const std::string& licenseKey, const std::string& username) {
    JsonObject body;
    body.emplace("license_key", Json(licenseKey));
    body.emplace("hwid", Json(options_.hwid));
    if (!username.empty()) body.emplace("username", Json(username));
    return request("license/activate", Json(body));
}

Json Client::getVariables(const std::string& scope, const std::string& licenseKey) {
    JsonObject body;
    body.emplace("scope", Json(scope));
    if (!licenseKey.empty()) body.emplace("license_key", Json(licenseKey));
    return request("variables/get", Json(body));
}

Json Client::setVariable(const std::string& key, const std::string& value,
                         const std::string& scope, const std::string& licenseKey) {
    JsonObject body;
    body.emplace("scope", Json(scope));
    body.emplace("key", Json(key));
    body.emplace("value", Json(value));
    if (!licenseKey.empty()) body.emplace("license_key", Json(licenseKey));
    return request("variables/set", Json(body));
}

Json Client::triggerWebhook(const std::string& event, const Json& payload) {
    JsonObject body;
    body.emplace("event", Json(event));
    body.emplace("payload", payload);
    return request("webhook/trigger", Json(body));
}

void Client::startHeartbeat(std::chrono::seconds interval, std::function<void(const std::string&)> onRevoked) {
    stopHeartbeat();
    heartbeatRunning_ = true;
    heartbeatThread_ = std::thread([this, interval, onRevoked = std::move(onRevoked)]() {
        while (heartbeatRunning_) {
            std::this_thread::sleep_for(interval);
            if (!heartbeatRunning_) return;
            try {
                heartbeat();
            } catch (const AegisError& error) {
                heartbeatRunning_ = false;
                if (onRevoked) onRevoked(error.what());
                return;
            }
        }
    });
}

void Client::stopHeartbeat() {
    heartbeatRunning_ = false;
    if (heartbeatThread_.joinable()) heartbeatThread_.join();
}

}  // namespace aegis