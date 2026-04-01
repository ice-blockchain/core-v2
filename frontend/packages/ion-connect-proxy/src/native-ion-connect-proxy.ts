import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  startProxy(port: number): Promise<string>;
  startProxyWithConfig(port: number, configJSON: string): Promise<string>;
  stopProxy(): Promise<string>;
  proxyRequest(method: string, url: string, headersJSON: string, body: string): Promise<string>;
  proxyUpload(url: string, filePath: string, headersJSON: string): Promise<string>;
  proxyDownload(url: string, destPath: string, headersJSON: string): Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('IonConnectProxy');
