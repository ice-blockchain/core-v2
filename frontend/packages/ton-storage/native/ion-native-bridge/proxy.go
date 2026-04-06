package main

/*
#include <stdlib.h>
*/
import "C"

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/xssnick/tonutils-go/liteclient"
	"github.com/xssnick/tonutils-proxy/proxy"
)

var (
	proxyMu      sync.Mutex
	activeProxy  context.Context
	proxyStopper context.CancelFunc
)

func init() {
	activeProxy, proxyStopper = context.WithCancel(context.Background())
	proxyStopper()
}

//export StartProxy
func StartProxy(port C.ushort) (result *C.char) {
	defer func() {
		if r := recover(); r != nil {
			result = C.CString(fmt.Sprintf("ERR: panic: %v", r))
		}
	}()
	return C.CString(startProxyInternal(uint16(port), nil))
}

//export StartProxyWithConfig
func StartProxyWithConfig(port C.ushort, configTextJSON *C.char) (result *C.char) {
	defer func() {
		if r := recover(); r != nil {
			result = C.CString(fmt.Sprintf("ERR: panic: %v", r))
		}
	}()
	var cfg liteclient.GlobalConfig
	if err := json.Unmarshal([]byte(C.GoString(configTextJSON)), &cfg); err != nil {
		log.Println("failed to parse config:", err.Error())
		return C.CString("PARSE_CONFIG_ERR: " + err.Error())
	}
	return C.CString(startProxyInternal(uint16(port), &cfg))
}

//export StopProxy
func StopProxy() (result *C.char) {
	defer func() {
		if r := recover(); r != nil {
			result = C.CString(fmt.Sprintf("ERR: panic: %v", r))
		}
	}()
	proxyMu.Lock()
	defer proxyMu.Unlock()
	proxyStopper()
	return C.CString("OK")
}

const proxyStartTimeout = 60 * time.Second

func startProxyInternal(port uint16, cfg *liteclient.GlobalConfig) string {
	proxyMu.Lock()
	defer proxyMu.Unlock()

	select {
	case <-activeProxy.Done():
	default:
		return "ALREADY_STARTED"
	}

	activeProxy, proxyStopper = context.WithCancel(context.Background())
	ch := make(chan proxy.State, 1)

	go func() {
		var err error
		if cfg != nil {
			err = proxy.RunProxyWithConfig(activeProxy, "127.0.0.1:"+fmt.Sprint(port), nil, nil, false, "LIB", cfg, nil, nil)
		} else {
			err = proxy.RunProxy(activeProxy, "127.0.0.1:"+fmt.Sprint(port), nil, ch, "LIB", false, "", nil, nil)
		}
		if err != nil {
			log.Println("failed to start proxy:", err.Error())
			ch <- proxy.State{Type: "error", State: err.Error(), Stopped: true}
		}
	}()

	res := make(chan string, 1)
	go func() {
		for {
			select {
			case <-activeProxy.Done():
				return
			case state := <-ch:
				var msg string
				if state.Stopped {
					proxyStopper()
					msg = "ERR: " + state.State
				} else if state.Type == "ready" {
					msg = "OK"
				}
				select {
				case res <- msg:
				default:
				}
			}
		}
	}()

	select {
	case r := <-res:
		return r
	case <-time.After(proxyStartTimeout):
		proxyStopper()
		return "ERR: proxy start timed out"
	}
}
