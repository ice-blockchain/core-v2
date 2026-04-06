#ifndef TONUTILS_STORAGE_EXPORT_H
#define TONUTILS_STORAGE_EXPORT_H

#ifdef __cplusplus
extern "C" {
#endif

extern char* StartStorage(unsigned short apiPort, char* dbPath, char* globalConfigJSON);
extern char* StopStorage(void);
extern char* CheckStorage(void);

#ifdef __cplusplus
}
#endif

#endif /* TONUTILS_STORAGE_EXPORT_H */
