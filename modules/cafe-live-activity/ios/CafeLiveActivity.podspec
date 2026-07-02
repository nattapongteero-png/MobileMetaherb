Pod::Spec.new do |s|
  s.name           = 'CafeLiveActivity'
  s.version        = '1.0.0'
  s.summary        = 'META Caffe order Live Activity control'
  s.description    = 'Starts / ends the iOS Live Activity (Dynamic Island) for a café order.'
  s.author         = 'MetaHerb'
  s.homepage       = 'https://metaherb.app'
  s.license        = 'MIT'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift}"
end
