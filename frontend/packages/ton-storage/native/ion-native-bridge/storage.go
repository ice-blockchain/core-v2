package main

/*
#include <stdlib.h>
*/
import "C"

import (
	"context"
	"crypto/ed25519"
	"fmt"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/syndtr/goleveldb/leveldb"
	"github.com/syndtr/goleveldb/leveldb/opt"
	"github.com/xssnick/tonutils-go/adnl"
	"github.com/xssnick/tonutils-go/adnl/dht"
	"github.com/xssnick/tonutils-go/liteclient"
	"github.com/xssnick/tonutils-storage/api"
	"github.com/xssnick/tonutils-storage/config"
	"github.com/xssnick/tonutils-storage/db"
	"github.com/xssnick/tonutils-storage/storage"
)

var (
	storageMu        sync.Mutex
	storageApiServer *api.Server
	storageHttpSrv   *http.Server
	storageDatabase  *leveldb.DB
	storageGateMain  *adnl.Gateway
	storageGateDHT   *adnl.Gateway
	storageRunning   bool
)

//export StartStorage
func StartStorage(apiPort C.ushort, cDbPath *C.char, cGlobalConfigJSON *C.char) (result *C.char) {
	defer func() {
		if r := recover(); r != nil {
			result = C.CString(fmt.Sprintf("ERR: panic: %v", r))
		}
	}()
	storageMu.Lock()
	defer storageMu.Unlock()

	if storageRunning {
		return C.CString("ERR: Storage already running")
	}

	dbPath := C.GoString(cDbPath)
	if err := validateDbPath(dbPath); err != nil {
		return C.CString(fmt.Sprintf("ERR: %s", err.Error()))
	}

	globalConfigJSON := ""
	if cGlobalConfigJSON != nil {
		globalConfigJSON = C.GoString(cGlobalConfigJSON)
	}

	out, err := startStorageInternal(int(apiPort), dbPath, globalConfigJSON)
	if err != nil {
		return C.CString(fmt.Sprintf("ERR: %s", err.Error()))
	}
	return C.CString(out)
}

//export StopStorage
func StopStorage() (result *C.char) {
	defer func() {
		if r := recover(); r != nil {
			result = C.CString(fmt.Sprintf("ERR: panic: %v", r))
		}
	}()
	storageMu.Lock()
	defer storageMu.Unlock()
	cleanupStorage()
	return C.CString("OK")
}

//export CheckStorage
func CheckStorage() (result *C.char) {
	defer func() {
		if r := recover(); r != nil {
			result = C.CString(fmt.Sprintf("ERR: panic: %v", r))
		}
	}()
	storageMu.Lock()
	defer storageMu.Unlock()
	if !storageRunning {
		return C.CString("ERR: Storage not running")
	}
	return C.CString("OK")
}

func validateDbPath(dbPath string) error {
	for _, seg := range strings.Split(dbPath, string(filepath.Separator)) {
		if seg == ".." {
			return fmt.Errorf("dbPath must not contain path traversal")
		}
	}
	cleaned := filepath.Clean(dbPath)
	if !filepath.IsAbs(cleaned) {
		return fmt.Errorf("dbPath must be absolute")
	}
	return nil
}

func startStorageInternal(apiPort int, dbPath string, globalConfigJSON string) (string, error) {
	cfg, err := config.LoadConfig(dbPath)
	if err != nil {
		return "", fmt.Errorf("load config: %w", err)
	}

	storageDatabase, err = leveldb.OpenFile(filepath.Join(dbPath, "db"), &opt.Options{WriteBuffer: 64 << 20})
	if err != nil {
		return "", fmt.Errorf("open leveldb: %w", err)
	}

	var lsCfg *liteclient.GlobalConfig
	if globalConfigJSON != "" {
		lsCfg, err = loadStorageConfig(dbPath, globalConfigJSON)
	} else {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		lsCfg, err = liteclient.GetConfigFromUrl(ctx, cfg.NetworkConfigUrl)
	}
	if err != nil {
		cleanupStorage()
		return "", fmt.Errorf("load network config: %w", err)
	}

	dl, err := adnl.DefaultListener(cfg.ListenAddr)
	if err != nil {
		cleanupStorage()
		return "", fmt.Errorf("create listener: %w", err)
	}
	netMgr := adnl.NewMultiNetReader(dl)

	storageGateMain = adnl.NewGatewayWithNetManager(cfg.Key, netMgr)
	storageGateMain.StartClient()

	_, dhtKey, err := ed25519.GenerateKey(nil)
	if err != nil {
		cleanupStorage()
		return "", fmt.Errorf("generate DHT key: %w", err)
	}
	storageGateDHT = adnl.NewGatewayWithNetManager(dhtKey, netMgr)
	storageGateDHT.StartClient()

	dhtClient, err := dht.NewClientFromConfig(storageGateDHT, lsCfg)
	if err != nil {
		cleanupStorage()
		return "", fmt.Errorf("init DHT: %w", err)
	}

	srv := storage.NewServer(dhtClient, storageGateMain, cfg.Key, false, 12)
	connector := storage.NewConnector(srv)

	store, err := db.NewStorage(storageDatabase, connector, 0, true, false, false, nil)
	if err != nil {
		cleanupStorage()
		return "", fmt.Errorf("init storage: %w", err)
	}
	srv.SetStorage(store)

	storageApiServer = api.NewServer(connector, store, cfg.DownloadsPath)
	addr := fmt.Sprintf("127.0.0.1:%d", apiPort)
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		cleanupStorage()
		return "", fmt.Errorf("listen %s: %w", addr, err)
	}
	storageHttpSrv = &http.Server{Handler: storageApiServer}
	go storageHttpSrv.Serve(ln)

	storageRunning = true
	return "OK", nil
}

func loadStorageConfig(dbPath string, jsonData string) (*liteclient.GlobalConfig, error) {
	tmpPath := filepath.Join(dbPath, "network-config.json")
	if err := os.WriteFile(tmpPath, []byte(jsonData), 0600); err != nil {
		return nil, fmt.Errorf("write temp config: %w", err)
	}
	return liteclient.GetConfigFromFile(tmpPath)
}

func cleanupStorage() {
	if storageHttpSrv != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		storageHttpSrv.Shutdown(ctx)
		storageHttpSrv = nil
	}
	storageApiServer = nil
	if storageDatabase != nil {
		storageDatabase.Close()
		storageDatabase = nil
	}
	if storageGateMain != nil {
		storageGateMain.Close()
		storageGateMain = nil
	}
	if storageGateDHT != nil {
		storageGateDHT.Close()
		storageGateDHT = nil
	}
	storageRunning = false
}
