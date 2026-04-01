import { useEffect, useRef, useState } from 'react';
import { startIonConnectProxy, stopIonConnectProxy, createIonConnectProxyTransport } from '@ion/ion-connect-proxy';
import type { Transport } from '@ion/network';

type ProxyStatus = 'stopped' | 'starting' | 'ready' | 'error';

interface IonConnectProxyState {
  status: ProxyStatus;
  proxyPort: number;
  transport: Transport | null;
  error: string | null;
}

export function useIonConnectProxy(port: number): IonConnectProxyState {
  const [status, setStatus] = useState<ProxyStatus>('stopped');
  const [error, setError] = useState<string | null>(null);
  const transportRef = useRef<Transport | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('starting');
    setError(null);

    startIonConnectProxy({ port })
      .then(() => {
        if (cancelled) return;
        transportRef.current = createIonConnectProxyTransport({ port });
        setStatus('ready');
      })
      .catch((err: Error) => {
        if (cancelled) return;
        transportRef.current = null;
        setError(err.message);
        setStatus('error');
      });

    return () => {
      cancelled = true;
      transportRef.current = null;
      stopIonConnectProxy().catch(() => {});
      setStatus('stopped');
    };
  }, [port]);

  return { status, proxyPort: port, transport: transportRef.current, error };
}
