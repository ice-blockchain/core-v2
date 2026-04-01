Pod::Spec.new do |s|
  s.name         = "IonConnectProxy"
  s.version      = "0.0.1"
  s.summary      = "ION Connect proxy TurboModule"
  s.homepage     = "https://github.com/nicetip/Tonutils-Proxy"
  s.license      = "Apache-2.0"
  s.author       = "ION"
  s.source       = { :git => "." }
  s.ios.deployment_target = "15.1"
  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.vendored_frameworks = "ios/tonutils-proxy.xcframework"

  install_modules_dependencies(s)
end
