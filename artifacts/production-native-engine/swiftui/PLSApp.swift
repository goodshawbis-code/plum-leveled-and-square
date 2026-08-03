// PLSApp.swift
// Plumb Leveled & Square — Main Application Entry Point
//
// APNs Credentials:
//   Key ID  : 524Q2C795M
//   Team ID : J63873JACF
//   Bundle  : com.brickoutdoorliving.plumbleveledandsquare
//
// Push capability must be enabled in App Store Connect for this bundle ID.
// Entitlements file: PlumbLeveledAndSquare.entitlements
// Swift Playgrounds note: SP4 supplies its own @main — remove this @main
// annotation and call PLSAppDelegate.setup() from the SP4 App's init() instead.

import SwiftUI
import UIKit
import UserNotifications

@main
struct PLSApp: App {

    // Bridge to UIApplicationDelegate so we can receive APNs token callbacks,
    // which have no SwiftUI-native equivalent in any current SwiftUI release.
    @UIApplicationDelegateAdaptor(PLSAppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup {
            SmartInboxView()
                // Inject the shared NotificationManager into the environment
                // so any child view can read authorizationStatus, deviceToken, etc.
                .environment(appDelegate.notificationManager)
        }
    }
}

// MARK: - PLSAppDelegate
// Sole purpose: bridge AppDelegate-only push callbacks into NotificationManager.
// Keep this class thin — business logic lives in NotificationManager.

final class PLSAppDelegate: NSObject, UIApplicationDelegate {

    /// Single source of truth for push notification state.
    /// Marked @Observable — changes propagate reactively to SwiftUI views.
    let notificationManager = NotificationManager()

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // Assign UNUserNotificationCenter delegate before any notification fires.
        UNUserNotificationCenter.current().delegate = notificationManager
        // Kick off the async permission request; does not block the launch.
        Task { await notificationManager.requestAuthorization() }
        return true
    }

    // MARK: APNs Token Callbacks

    /// APNs returns a valid device token — forward to the manager for storage & backend sync.
    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        notificationManager.handleDeviceToken(deviceToken)
    }

    /// APNs registration failed (common on Simulator or when entitlement is missing).
    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        notificationManager.handleRegistrationFailure(error)
    }
}
