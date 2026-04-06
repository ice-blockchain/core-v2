Pod::Spec.new do |s|
  s.name         = "FileStorageOps"
  s.version      = "0.0.1"
  s.summary      = "File operations TurboModule for file-storage"
  s.homepage     = "https://github.com/nicememes"
  s.license      = "Apache-2.0"
  s.author       = "ION"
  s.source       = { :git => "." }
  s.ios.deployment_target = "15.1"
  s.source_files = "ios/**/*.{h,m,mm,swift}"

  install_modules_dependencies(s)
end
