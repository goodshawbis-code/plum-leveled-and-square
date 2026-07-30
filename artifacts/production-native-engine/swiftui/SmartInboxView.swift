import SwiftUI

struct SmartInboxView: View {
    @State private var bids: [DetectedBid] = []
    
    var body: some View {
        NavigationStack {
            List(bids) { bid in
                NavigationLink(value: bid) {
                    HStack {
                        VStack(alignment: .leading) {
                            Text(bid.projectName).font(.headline).foregroundColor(.plsGold)
                            Text(bid.location).font(.subheadline).foregroundColor(.gray)
                        }
                        Spacer()
                        Text("$\(bid.estimatedValue)k").bold()
                    }
                }
            }
            .navigationTitle("SMART INBOX")
            .background(Color.plsBlack)
            .scrollContentBackground(.hidden)
        }
    }
}

struct DetectedBid: Identifiable, Hashable {
    let id = UUID()
    let projectName: String
    let location: String
    let estimatedValue: Int
}
