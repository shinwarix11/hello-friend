// Runnable quickstart for the Aegis C++ SDK.
//
//   cmake -B build && cmake --build build
//   AEGIS_APP_KEY=... ./build/aegis_quickstart
#include <cstdlib>
#include <iostream>

#include "aegis/aegis.hpp"

static std::string envOr(const char* key, const std::string& fallback) {
    const char* value = std::getenv(key);
    return (value && *value) ? std::string(value) : fallback;
}

int main() {
    aegis::Options options;
    options.baseUrl = envOr("AEGIS_BASE_URL", "http://localhost:8080");
    options.appKey = envOr("AEGIS_APP_KEY", "");
    options.version = "1.0.0";

    try {
        aegis::Client client(options);

        auto info = client.init();
        std::cout << "initialized: " << info["status"].asString() << "\n";

        if (info["version"]["update_required"].asBool()) {
            std::cout << "mandatory update: " << info["version"]["latest"].asString() << "\n";
            return 0;
        }

        auto auth = client.login(envOr("AEGIS_USERNAME", "demo"), envOr("AEGIS_PASSWORD", "demo-password"));
        std::cout << "signed in as " << auth["user"]["username"].asString() << "\n";

        client.setVariable("last_seen", "now");
        std::cout << "variables: " << client.getVariables("user").dump() << "\n";
        std::cout << "downloads: " << client.downloads().dump() << "\n";

        client.startHeartbeat(std::chrono::seconds(60), [](const std::string& reason) {
            std::cout << "session revoked: " << reason << "\n";
        });

        client.logout();
        std::cout << "signed out.\n";
        return 0;
    } catch (const aegis::AegisError& error) {
        std::cerr << "Aegis error [" << error.code() << "] " << error.what() << "\n";
        return 1;
    }
}