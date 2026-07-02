import ExpoModulesCore
import ActivityKit

public class CafeLiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CafeLiveActivity")

    // start(orderId, queueNo, queueAhead, itemsLabel, startedAt(sec), readyAt(sec))
    Function("start") { (orderId: String, queueNo: Int, queueAhead: Int, itemsLabel: String, startedAt: Double, readyAt: Double) in
      guard #available(iOS 16.2, *) else { return }
      guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

      // Keep only one café activity — end any existing ones before starting.
      for activity in Activity<CafeOrderAttributes>.activities {
        Task { await activity.end(nil, dismissalPolicy: .immediate) }
      }

      let readyDate = Date(timeIntervalSince1970: readyAt)
      let attributes = CafeOrderAttributes(orderId: orderId, queueNo: queueNo, itemsLabel: itemsLabel)
      let state = CafeOrderAttributes.ContentState(
        startedAt: Date(timeIntervalSince1970: startedAt),
        readyAt: readyDate,
        queueAhead: queueAhead,
        isReady: readyDate <= Date()   // already past = start ready
      )

      do {
        // staleDate = readyAt is the FINAL fallback; the primary flip is the
        // scheduled update below + the widget's own clock comparison.
        let activity = try Activity.request(
          attributes: attributes,
          content: ActivityContent(state: state, staleDate: readyDate)
        )

        // PRIMARY fast path: schedule an in-process local update at readyAt.
        // Fires promptly while the app is alive (foreground, or the brief grace
        // window right after backgrounding). If the process is suspended it just
        // won't run — the widget clock flip + reconcile() cover that case.
        let delay = readyDate.timeIntervalSinceNow
        Task { [weak activity] in
          if delay > 0 {
            try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
          }
          guard let activity else { return }
          await Self.markReadyIfDue(activity)
        }
      } catch {
        NSLog("CafeLiveActivity start error: \(error.localizedDescription)")
      }
    }

    // reconcile() — call from JS on AppState 'active'. Flips any due order to
    // ready. This is the reliable no-push trigger for the "phone reopened" case.
    Function("reconcile") {
      guard #available(iOS 16.2, *) else { return }
      for activity in Activity<CafeOrderAttributes>.activities {
        Task { await Self.markReadyIfDue(activity) }
      }
    }

    // end(orderId)
    Function("end") { (orderId: String) in
      guard #available(iOS 16.2, *) else { return }
      for activity in Activity<CafeOrderAttributes>.activities where activity.attributes.orderId == orderId {
        Task { await activity.end(nil, dismissalPolicy: .immediate) }
      }
    }
  }

  // Idempotent: only pushes a ready update if the order is due and not already
  // flipped. Safe to call from all three triggers without double-alerting.
  @available(iOS 16.2, *)
  private static func markReadyIfDue(_ activity: Activity<CafeOrderAttributes>) async {
    let s = activity.content.state
    guard !s.isReady, s.readyAt <= Date() else { return }
    var next = s
    next.isReady = true
    next.queueAhead = 0
    await activity.update(
      ActivityContent(state: next, staleDate: nil),
      alertConfiguration: AlertConfiguration(
        title: "ออเดอร์พร้อมแล้ว!",
        body: "รับได้ที่เคาน์เตอร์ META Caffe",
        sound: .default
      )
    )
  }
}
