Pod::Spec.new do |s|
  s.name           = 'AppleFilterList'
  s.version        = '1.0.0'
  s.summary        = 'Native SwiftUI inset-grouped filter list'
  s.description    = 'Renders an Apple-native SwiftUI List for product filtering.'
  s.author         = ''
  s.homepage       = 'https://example.com'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
