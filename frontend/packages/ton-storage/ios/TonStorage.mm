#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(TonStorage, NSObject)

// Lifecycle
RCT_EXTERN_METHOD(startStorage:(double)apiPort
                  dbPath:(NSString *)dbPath
                  globalConfigJSON:(NSString *)globalConfigJSON
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stopStorage:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// Health check
RCT_EXTERN_METHOD(checkStorage:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

@end
