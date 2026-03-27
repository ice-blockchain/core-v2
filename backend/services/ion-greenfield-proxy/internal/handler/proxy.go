package handler

// Proxy is the catch-all reverse proxy handler.
// Phase 5: forwards all non-intercepted requests to the upstream
// Greenfield RPC/SP endpoints using httputil.ReverseProxy.
