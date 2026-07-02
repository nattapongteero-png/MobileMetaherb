import Foundation
import ActivityKit

// NOTE: This struct must stay IDENTICAL (name + fields + order) to the copy in
// ios/CafeActivity/CafeActivityLiveActivity.swift — ActivityKit matches the Live
// Activity across the app and its widget extension by this type.
@available(iOS 16.2, *)
struct CafeOrderAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var startedAt: Date
    var readyAt: Date
    var queueAhead: Int
    var isReady: Bool = false
  }

  var orderId: String
  var queueNo: Int
  var itemsLabel: String
}
