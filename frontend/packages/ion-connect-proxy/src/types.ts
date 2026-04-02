export interface IonConnectProxyConfig {
  liteservers: Array<{ ip: number; port: number; id: { '@type': string; key: string } }>;
  dht?: {
    '@type': string;
    nodes: Array<{ '@type': string; id: { '@type': string; key: string }; addr_list: unknown }>;
  } | undefined;
}

export interface StartIonConnectProxyOptions {
  port?: number | undefined;
  config?: IonConnectProxyConfig | undefined;
}
