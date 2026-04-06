#ifndef ION_NATIVE_BRIDGE_EXPORT_H
#define ION_NATIVE_BRIDGE_EXPORT_H

#ifdef __cplusplus
extern "C" {
#endif

/* tonutils-proxy */
extern char* StartProxy(unsigned short port);
extern char* StartProxyWithConfig(unsigned short port, char* configTextJSON);
extern char* StopProxy(void);

/* tonutils-storage */
extern char* StartStorage(unsigned short apiPort, char* dbPath, char* globalConfigJSON);
extern char* StopStorage(void);
extern char* CheckStorage(void);

#ifdef __cplusplus
}
#endif

#endif /* ION_NATIVE_BRIDGE_EXPORT_H */
