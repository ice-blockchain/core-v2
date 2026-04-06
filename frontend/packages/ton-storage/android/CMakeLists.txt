cmake_minimum_required(VERSION 3.22)
project(ton-storage-jni)

add_library(ton-storage-jni SHARED cpp/TonStorageJNI.cpp)
target_include_directories(ton-storage-jni PRIVATE ${CMAKE_SOURCE_DIR}/cpp)

find_library(log-lib log)
target_link_directories(ton-storage-jni PRIVATE ${CMAKE_SOURCE_DIR}/src/main/jniLibs/${ANDROID_ABI})
target_link_libraries(ton-storage-jni tonutils-storage ${log-lib})
