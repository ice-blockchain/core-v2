#include <jni.h>
#include <cstdlib>
#include <cstring>
#include "tonutils-proxy.h"

static jstring toJStringAndFree(JNIEnv *env, char *cstr) {
    if (!cstr) return env->NewStringUTF("");
    jstring result = env->NewStringUTF(cstr);
    free(cstr);
    return result;
}

extern "C" JNIEXPORT jstring JNICALL
Java_io_ion_ionconnectproxy_IonConnectProxyModule_nativeStartProxy(
    JNIEnv *env, jobject /* this */, jint port) {
    return toJStringAndFree(env, StartProxy(static_cast<unsigned short>(port)));
}

extern "C" JNIEXPORT jstring JNICALL
Java_io_ion_ionconnectproxy_IonConnectProxyModule_nativeStartProxyWithConfig(
    JNIEnv *env, jobject /* this */, jint port, jstring configJSON) {
    const char *config = env->GetStringUTFChars(configJSON, nullptr);
    if (!config) return env->NewStringUTF("ERR: Out of memory");
    char *configCopy = strdup(config);
    env->ReleaseStringUTFChars(configJSON, config);
    if (!configCopy) return env->NewStringUTF("ERR: Out of memory");
    jstring result = toJStringAndFree(env, StartProxyWithConfig(static_cast<unsigned short>(port), configCopy));
    free(configCopy);
    return result;
}

extern "C" JNIEXPORT jstring JNICALL
Java_io_ion_ionconnectproxy_IonConnectProxyModule_nativeStopProxy(
    JNIEnv *env, jobject /* this */) {
    return toJStringAndFree(env, StopProxy());
}
