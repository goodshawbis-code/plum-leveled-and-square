// PLSConfig.swift
// Plumb Leveled & Square — Centralised App Configuration
//
// All Apple Developer credential constants live here so they can be
// verified in a single pre-flight audit without grepping the whole codebase.

import Foundation

enum PLSConfig {

    // MARK: - Apple Developer Credentials
    /// Numeric Apple Developer Team ID (also used in EAS / eas.json).
    static let teamID     = "J63873JACF"

    /// Key ID for the AuthKey_524Q2C795M.p8 APNs auth key.
    static let keyID      = "524Q2C795M"

    /// App bundle identifier registered in App Store Connect.
    static let bundleID   = "com.brickoutdoorliving.plumbleveledandsquare"

    // MARK: - APNs Environment
    /// "development" tokens route to the APNs sandbox server.
    /// "production"  tokens route to the live APNs server (App Store / TestFlight via ASC).
    /// Xcode automatically selects the correct entitlement per build configuration;
    /// keep this in sync so the backend routes the push to the right APNs host.
    #if DEBUG
    static let apnsEnvironment = "development"
    #else
    static let apnsEnvironment = "production"
    #endif

    // MARK: - Backend Base URL
    /// Override at runtime via the BACKEND_URL environment variable (Xcode scheme).
    /// Falls back to the Render production deployment URL.
    static let backendBaseURL: String = {
        ProcessInfo.processInfo.environment["BACKEND_URL"]
            ?? "https://pls-backend.onrender.com"
    }()
}

// MARK: - Custom Notification Names
extension Notification.Name {
    /// Posted when a push notification tap should navigate to a specific bid.
    /// Object: String bid ID (UUID).
    static let plsOpenBid = Notification.Name(
        "com.brickoutdoorliving.plumbleveledandsquare.openBid"
    )
}
