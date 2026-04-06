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
	"os"
	"path/filepath"
	"sync"
	"time"
	"unsafe"

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
	mu          sync.Mutex
	apiServer   *api.Server
	apiListener net.Listener
	database    *leveldb.DB
	gateMain    *adnl.Gateway
	gateDHT     *adnl.Gateway
	running     bool
)

//export StartStorage
func StartStorage(apiPort C.ushort, cDbPath *C.char, cGlobalConfigJSON *C.char) (result *C.char) {
	defer func() {
		if r := recover(); r != nil {
			result = C.CString(fmt.Sprintf("ERR: panic: %v", r))
		}
	}()
	mu.Lock()
	defer mu.Unlock()

	if running {
		return C.CString("ERR: Storage already running")
	}

	dbPath := C.GoString(cDbPath)
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
	mu.Lock()
	defer mu.Unlock()

	cleanupAll()
	return C.CString("OK")
}

//export CheckStorage
func CheckStorage() (result *C.char) {
	defer func() {
		if r := recover(); r != nil {
			result = C.CString(fmt.Sprintf("ERR: panic: %v", r))
		}
	}()
	mu.Lock()
	defer mu.Unlock()

	if !running {
		return C.CString("ERR: Storage not running")
	}
	return C.CString("OK")
}

func startStorageInternal(apiPort int, dbPath string, globalConfigJSON string) (string, error) {
	cfg, err := config.LoadConfig(dbPath)
	if err != nil {
		return "", fmt.Errorf("load config: %w", err)
	}

	database, err = leveldb.OpenFile(filepath.Join(dbPath, "db"), &opt.Options{WriteBuffer: 64 << 20})
	if err != nil {
		return "", fmt.Errorf("open leveldb: %w", err)
	}

	var lsCfg *liteclient.GlobalConfig
	if globalConfigJSON != "" {
		lsCfg, err = loadConfigFromJSON(dbPath, globalConfigJSON)
	} else {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		lsCfg, err = liteclient.GetConfigFromUrl(ctx, cfg.NetworkConfigUrl)
	}
	if err != nil {
		cleanupAll()
		return "", fmt.Errorf("load network config: %w", err)
	}

	dl, err := adnl.DefaultListener(cfg.ListenAddr)
	if err != nil {
		cleanupAll()
		return "", fmt.Errorf("create listener: %w", err)
	}
	netMgr := adnl.NewMultiNetReader(dl)

	gateMain = adnl.NewGatewayWithNetManager(cfg.Key, netMgr)
	gateMain.StartClient()

	_, dhtKey, err := ed25519.GenerateKey(nil)
	if err != nil {
		cleanupAll()
		return "", fmt.Errorf("generate DHT key: %w", err)
	}
	gateDHT = adnl.NewGatewayWithNetManager(dhtKey, netMgr)
	gateDHT.StartClient()

	dhtClient, err := dht.NewClientFromConfig(gateDHT, lsCfg)
	if err != nil {
		cleanupAll()
		return "", fmt.Errorf("init DHT: %w", err)
	}

	srv := storage.NewServer(dhtClient, gateMain, cfg.Key, false, 12)
	connector := storage.NewConnector(srv)

	store, err := db.NewStorage(database, connector, 0, true, false, false, nil)
	if err != nil {
		cleanupAll()
		return "", fmt.Errorf("init storage: %w", err)
	}
	srv.SetStorage(store)

	apiServer = api.NewServer(connector, store, cfg.DownloadsPath)

	addr := fmt.Sprintf("127.0.0.1:%d", apiPort)
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		cleanupAll()
		return "", fmt.Errorf("listen %s: %w", addr, err)
	}
	apiListener = ln
	go apiServer.Start(addr)

	running = true
	return "OK", nil
}

func loadConfigFromJSON(dbPath string, jsonData string) (*liteclient.GlobalConfig, error) {
	tmpPath := filepath.Join(dbPath, "network-config.json")
	if err := os.WriteFile(tmpPath, []byte(jsonData), 0600); err != nil {
		return nil, fmt.Errorf("write temp config: %w", err)
	}
	return liteclient.GetConfigFromFile(tmpPath)
}

func cleanupAll() {
	if apiListener != nil {
		apiListener.Close()
		apiListener = nil
	}
	apiServer = nil
	if database != nil {
		database.Close()
		database = nil
	}
	if gateMain != nil {
		gateMain.Close()
		gateMain = nil
	}
	if gateDHT != nil {
		gateDHT.Close()
		gateDHT = nil
	}
	running = false
}

// Required for C shared library
func main() {}

// Free C strings allocated by this library
//
//export FreeString
func FreeString(p unsafe.Pointer) {
	C.free(p)
}
