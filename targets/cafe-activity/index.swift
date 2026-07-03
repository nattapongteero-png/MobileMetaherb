import ActivityKit
import WidgetKit
import SwiftUI

// Keep IDENTICAL to modules/cafe-live-activity/ios/CafeOrderAttributes.swift.
struct CafeOrderAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var startedAt: Date
    var readyAt: Date
    var queueAhead: Int
  }

  var orderId: String
  var queueNo: Int
  var itemsLabel: String
}

@main
struct CafeActivityBundle: WidgetBundle {
  var body: some Widget {
    CafeOrderLiveActivity()
  }
}

struct CafeOrderLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: CafeOrderAttributes.self) { context in
      // Lock Screen / banner presentation
      HStack(spacing: 14) {
        Image(systemName: "cup.and.saucer.fill")
          .font(.title2)
          .foregroundStyle(.green)
        VStack(alignment: .leading, spacing: 5) {
          Text("กำลังเตรียมออเดอร์")
            .font(.subheadline).bold()
          Text("คิว #\(context.attributes.queueNo) · \(context.attributes.itemsLabel)")
            .font(.caption).foregroundStyle(.secondary).lineLimit(1)
          ProgressView(timerInterval: context.state.startedAt...context.state.readyAt, countsDown: false)
            .tint(.green)
        }
        Text(timerInterval: context.state.startedAt...context.state.readyAt, countsDown: true)
          .font(.title3).monospacedDigit().bold()
          .frame(width: 62)
      }
      .padding()
      .activityBackgroundTint(Color(.systemGreen).opacity(0.12))
      .activitySystemActionForegroundColor(.green)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Label("คิว #\(context.attributes.queueNo)", systemImage: "cup.and.saucer.fill")
            .font(.caption).foregroundStyle(.green)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(timerInterval: context.state.startedAt...context.state.readyAt, countsDown: true)
            .monospacedDigit().multilineTextAlignment(.trailing)
            .frame(width: 60)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(spacing: 5) {
            ProgressView(timerInterval: context.state.startedAt...context.state.readyAt, countsDown: false)
              .tint(.green)
            Text(context.attributes.itemsLabel)
              .font(.caption2).foregroundStyle(.secondary).lineLimit(1)
          }
        }
      } compactLeading: {
        Image(systemName: "cup.and.saucer.fill").foregroundStyle(.green)
      } compactTrailing: {
        Text(timerInterval: context.state.startedAt...context.state.readyAt, countsDown: true)
          .monospacedDigit().frame(width: 44)
      } minimal: {
        Image(systemName: "cup.and.saucer.fill").foregroundStyle(.green)
      }
      .keylineTint(.green)
    }
  }
}
