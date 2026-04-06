#include <jni.h>
#include <cstdlib>
#include <cstring>
#include "tonutils-storage.h"

static jstring toJStringAndFree(JNIEnv *env, char *cstr) {
    if (!cstr) return env->NewStringUTF("");
    jstring result = env->NewStringUTF(cstr);
    free(cstr);
    return result;
}

extern "C" JNIEXPORT jstring JNICALL
Java_io_ion_tonstorage_TonStorageModule_nativeStartStorage(
    JNIEnv *env, jobject /* this */, jint apiPort, jstring dbPath, jstring globalConfigJSON) {
    const char *db = env->GetStringUTFChars(dbPath, nullptr);
    if (!db) return env->NewStringUTF("ERR: Out of memory");
    char *dbCopy = strdup(db);
    env->ReleaseStringUTFChars(dbPath, db);
    if (!dbCopy) return env->NewStringUTF("ERR: Out of memory");

    char *configCopy = nullptr;
    const char *config = env->GetStringUTFChars(globalConfigJSON, nullptr);
    if (config && strlen(config) > 0) {
        configCopy = strdup(config);
        if (!configCopy) {
            env->ReleaseStringUTFChars(globalConfigJSON, config);
            free(dbCopy);
            return env->NewStringUTF("ERR: Out of memory");
        }
    }
    if (config) env->ReleaseStringUTFChars(globalConfigJSON, config);

    jstring result = toJStringAndFree(
        env, StartStorage(static_cast<unsigned short>(apiPort), dbCopy, configCopy));
    free(dbCopy);
    free(configCopy);
    return result;
}

extern "C" JNIEXPORT jstring JNICALL
Java_io_ion_tonstorage_TonStorageModule_nativeStopStorage(
    JNIEnv *env, jobject /* this */) {
    return toJStringAndFree(env, StopStorage());
}

extern "C" JNIEXPORT jstring JNICALL
Java_io_ion_tonstorage_TonStorageModule_nativeCheckStorage(
    JNIEnv *env, jobject /* this */) {
    return toJStringAndFree(env, CheckStorage());
}
