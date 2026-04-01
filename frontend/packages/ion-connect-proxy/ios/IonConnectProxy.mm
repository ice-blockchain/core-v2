#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(IonConnectProxy, NSObject)

// Lifecycle
RCT_EXTERN_METHOD(startProxy:(double)port
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(startProxyWithConfig:(double)port
                  configJSON:(NSString *)configJSON
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stopProxy:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// HTTP bridge
RCT_EXTERN_METHOD(proxyRequest:(NSString *)method
                  url:(NSString *)url
                  headersJSON:(NSString *)headersJSON
                  body:(NSString *)body
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(proxyUpload:(NSString *)url
                  filePath:(NSString *)filePath
                  headersJSON:(NSString *)headersJSON
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(proxyDownload:(NSString *)url
                  destPath:(NSString *)destPath
                  headersJSON:(NSString *)headersJSON
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

@end
