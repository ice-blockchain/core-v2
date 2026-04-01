import NativeIonConnectProxy from './native-ion-connect-proxy';

export async function stopIonConnectProxy(): Promise<string> {
  return NativeIonConnectProxy.stopProxy();
}
