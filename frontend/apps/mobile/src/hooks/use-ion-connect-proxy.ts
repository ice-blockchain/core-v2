import { useEffect, useState } from 'react';
import { startIonConnectProxy, stopIonConnectProxy, createIonConnectProxyClient } from '@ion/ion-connect-proxy';
import type { HttpClient } from '@ion/network';

type ProxyStatus = 'stopped' | 'starting' | 'ready' | 'error';

interface IonConnectProxyState {
  status: ProxyStatus;
  proxyPort: number;
  error: string | null;
  createClient: (baseUrl: string) => HttpClient;
}

export function useIonConnectProxy(port: number): IonConnectProxyState {
  const [status, setStatus] = useState<ProxyStatus>('stopped');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setStatus('starting');
    setError(null);

    startIonConnectProxy({ port })
      .then(() => { if (!cancelled) setStatus('ready'); })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setStatus('error');
      });

    return () => {
      cancelled = true;
      stopIonConnectProxy().catch(() => {});
      setStatus('stopped');
    };
  }, [port]);

  const createClient = (baseUrl: string) => createIonConnectProxyClient({ baseUrl });

  return { status, proxyPort: port, error, createClient };
}
