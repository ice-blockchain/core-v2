import type { NavigatorScreenParams } from '@react-navigation/native';

export interface VerifyPasskeyNextRoute {
  name: string;
  params?: Record<string, unknown>;
}

export type RootStackParamList = {
  Splash: undefined;
  GetStarted: undefined;
  Onboarding: undefined;
  Catalog: undefined;
  ChatPreview: undefined;
  ProxyTest: undefined;
  StorageTest: undefined;
  'Sheet/Auth': NavigatorScreenParams<AuthStackParamList> | undefined;
  'Sheet/NicknameReserved': undefined;
  'Sheet/IdentityKeyNameNote': undefined;
  'Sheet/VerifyPasskey': { next: VerifyPasskeyNextRoute };
};

export type AuthStackParamList = {
  GetStarted: undefined;
  PasswordRegister: undefined;
  PasskeyRegister: undefined;
  ProfileSetup: undefined;
  SelectLanguages: undefined;
  DiscoverCreators: undefined;
  Notifications: undefined;
};
