cmake_minimum_required(VERSION 3.22)
project(ion-connect-proxy-jni)

add_library(ion-connect-proxy-jni SHARED cpp/IonConnectProxyJNI.cpp)
target_include_directories(ion-connect-proxy-jni PRIVATE ${CMAKE_SOURCE_DIR}/cpp)

find_library(log-lib log)
target_link_directories(ion-connect-proxy-jni PRIVATE ${CMAKE_SOURCE_DIR}/src/main/jniLibs/${ANDROID_ABI})
target_link_libraries(ion-connect-proxy-jni tonutils-proxy ${log-lib})
