import { getNativeIonConnectProxy } from './native-ion-connect-proxy';

export async function stopIonConnectProxy(): Promise<string> {
  return getNativeIonConnectProxy().stopProxy();
}
