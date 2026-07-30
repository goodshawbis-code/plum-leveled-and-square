import SwiftUI

struct ServiceSettingsView: View {
    var body: some View {
        Form {
            Section("SYNDICATE HANDSHAKE") {
                Button(action: { /* Start OAuth Flow */ }) {
                    HStack {
                        Image(systemName: "envelope.fill")
                        Text("Connect Business Email")
                    }
                }.foregroundColor(.plsGold)
            }
            
            Section("AUTO-ESTIMATOR") {
                Toggle("Scan Inbox for Blueprints", isOn: .constant(true))
                Toggle("Push Notifications for New Bids", isOn: .constant(true))
            }
        }
        .preferredColorScheme(.dark)
    }
}
