import ExpoModulesCore
import SwiftUI
import UIKit

// MARK: - Incoming data (from JS as JSON)

struct InOption: Codable {
  let key: String
  let label: String
  let selected: Bool
}

struct InSection: Codable {
  let key: String
  let title: String
  let options: [InOption]
}

// MARK: - Observable model bound to SwiftUI

final class FilterModel: ObservableObject {
  @Published var sections: [InSection] = []
  var onSelect: ((String, String) -> Void)?
}

// MARK: - SwiftUI list (Apple's native inset-grouped List)

struct FilterListView: View {
  @ObservedObject var model: FilterModel
  private let brand = Color(red: 49.0 / 255.0, green: 151.0 / 255.0, blue: 84.0 / 255.0)

  private var list: some View {
    List {
      ForEach(model.sections, id: \.key) { section in
        Section(header: Text(section.title)) {
          ForEach(section.options, id: \.key) { opt in
            Button {
              model.onSelect?(section.key, opt.key)
            } label: {
              HStack {
                Text(opt.label).foregroundColor(.primary)
                Spacer()
                if opt.selected {
                  Image(systemName: "checkmark")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(brand)
                }
              }
              .contentShape(Rectangle())
            }
          }
        }
      }
    }
    .listStyle(.insetGrouped)
  }

  var body: some View {
    if #available(iOS 16.0, *) {
      list.scrollContentBackground(.hidden) // let the Liquid Glass show through
    } else {
      list
    }
  }
}

// MARK: - Expo view hosting the SwiftUI list

final class AppleFilterListView: ExpoView {
  private let model = FilterModel()
  let onSelect = EventDispatcher()
  private var hosting: UIHostingController<FilterListView>?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    model.onSelect = { [weak self] group, key in
      self?.onSelect(["group": group, "key": key])
    }
    let host = UIHostingController(rootView: FilterListView(model: model))
    host.view.backgroundColor = .clear
    hosting = host
    addSubview(host.view)
    host.view.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      host.view.topAnchor.constraint(equalTo: topAnchor),
      host.view.bottomAnchor.constraint(equalTo: bottomAnchor),
      host.view.leadingAnchor.constraint(equalTo: leadingAnchor),
      host.view.trailingAnchor.constraint(equalTo: trailingAnchor),
    ])
  }

  func setData(_ json: String) {
    guard let data = json.data(using: .utf8) else { return }
    if let decoded = try? JSONDecoder().decode([InSection].self, from: data) {
      model.sections = decoded
    }
  }
}

// MARK: - Module

public class AppleFilterListModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AppleFilterList")

    View(AppleFilterListView.self) {
      Events("onSelect")
      Prop("data") { (view: AppleFilterListView, json: String) in
        view.setData(json)
      }
    }
  }
}
