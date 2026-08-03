// NotificationManager.swift
// Plumb Leveled & Square — Push Notification State Manager
//
// @MainActor @Observable: all state mutations happen on the main thread.
// Inject at the root via .environment(appDelegate.notificationManager)
// and read in child views with @Environment(NotificationManager.self).
//
// Device-to-backend flow:
//   1. App launches → requestAuthorization() prompts the user.
//   2. User taps Allow → UIKit calls didRegisterForRemoteNotificationsWithDeviceToken.
//   3. AppDelegate forwards the raw Data to handleDeviceToken(_:).
//   4. handleDeviceToken converts to hex and calls registerTokenWithBackend(_:).
//   5. Backend stores token in Supabase device_tokens table (UPSERT).

import Foundation
import UserNotifications
import UIKit

@MainActor
@Observable
final class NotificationManager: NSObject {

    // MARK: - Observable State

    /// Current system authorisation status (.notDetermined / .authorized / .denied / .provisional)
    var authorizationStatus: UNAuthorizationStatus = .notDetermined

    /// Lowercase hex APNs device token (64 characters). nil until APNs responds.
    var deviceToken: String?

    /// Non-nil if any step of the registration pipeline failed.
    var registrationError: String?

    /// True once the backend has confirmed receipt of the device token.
    var isRegisteredWithBackend = false

    // MARK: - Authorization + Remote Registration

    /// Request user permission and, if granted, register for APNs remote notifications.
    /// Safe to call multiple times; OS caches the grant decision.
    func requestAuthorization() async {
        let center = UNUserNotificationCenter.current()

        do {
            let granted = try await center.requestAuthorization(
                options: [.alert, .sound, .badge]
            )
            // Re-read the full settings object to capture the canonical status.
            let settings = await center.notificationSettings()
            authorizationStatus = settings.authorizationStatus

            if granted {
                // registerForRemoteNotifications() must be called on the main thread.
                UIApplication.shared.registerForRemoteNotifications()
            }
        } catch {
            registrationError = "Permission request failed: \(error.localizedDescription)"
        }
    }

    // MARK: - Token Handling (called by PLSAppDelegate)

    /// Converts the raw binary APNs token to a lowercase hex string, stores it,
    /// and initiates an async backend registration call.
    func handleDeviceToken(_ tokenData: Data) {
        // Standard industry format: lowercase hex, no spaces.
        let hex = tokenData.map { String(format: "%02.2hhx", $0) }.joined()
        deviceToken = hex
        registrationError = nil
        Task { await registerTokenWithBackend(hex) }
    }

    /// Stores the error message so the UI can surface a retry prompt if needed.
    func handleRegistrationFailure(_ error: Error) {
        registrationError = "APNs registration failed: \(error.localizedDescription)"
    }

    // MARK: - Backend Sync

    private func registerTokenWithBackend(_ token: String) async {
        guard let url = URL(string: "\(PLSConfig.backendBaseURL)/api/notifications/register") else {
            registrationError = "Invalid backend URL: \(PLSConfig.backendBaseURL)"
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 15.0

        let payload: [String: String] = [
            "device_token": token,
            "platform":     "ios",
            "bundle_id":    PLSConfig.bundleID,
            "environment":  PLSConfig.apnsEnvironment
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
            let (_, response) = try await URLSession.shared.data(for: request)

            if let http = response as? HTTPURLResponse, http.statusCode == 200 {
                isRegisteredWithBackend = true
            } else if let http = response as? HTTPURLResponse {
                registrationError = "Backend registration returned HTTP \(http.statusCode)"
            }
        } catch {
            registrationError = "Backend sync failed: \(error.localizedDescription)"
        }
    }
}

// MARK: - UNUserNotificationCenterDelegate
extension NotificationManager: UNUserNotificationCenterDelegate {

    /// Display notifications as banners even when the app is in the foreground.
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .badge])
    }

    /// Handle the user tapping a push notification banner.
    /// Posts a Notification.Name.plsOpenBid local notification carrying the bid ID,
    /// allowing any SwiftUI view to navigate without a direct coupling.
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo

        if let bidId = userInfo["bid_id"] as? String {
            DispatchQueue.main.async {
                NotificationCenter.default.post(
                    name: .plsOpenBid,
                    object: bidId
                )
            }
        }
        completionHandler()
    }
}
