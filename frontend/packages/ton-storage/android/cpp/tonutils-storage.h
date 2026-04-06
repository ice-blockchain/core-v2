/* C header for tonutils-storage Go library */

#ifndef TONUTILS_STORAGE_H
#define TONUTILS_STORAGE_H

#ifdef __cplusplus
extern "C" {
#endif

extern char* StartStorage(unsigned short apiPort, char* dbPath, char* globalConfigJSON);
extern char* StopStorage(void);
extern char* CheckStorage(void);

#ifdef __cplusplus
}
#endif

#endif /* TONUTILS_STORAGE_H */
