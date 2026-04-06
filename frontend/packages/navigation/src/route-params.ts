import type { NavigatorScreenParams } from '@react-navigation/native';

export interface VerifyPasskeyNextRoute {
  name: string;
  params?: Record<string, unknown>;
  reset?: boolean;
}

export type RootStackParamList = {
  Splash: undefined;
  GetStarted: undefined;
  Main: undefined;
  Onboarding: undefined;
  Catalog: undefined;
  ProxyTest: undefined;
  StorageTest: undefined;
  AuthFlow: undefined;
  'Sheet/Auth': NavigatorScreenParams<AuthStackParamList> | undefined;
  'Sheet/NicknameReserved': undefined;
  'Sheet/IdentityKeyNameNote': undefined;
  'Sheet/VerifyPasskey': { next: VerifyPasskeyNextRoute };
  'Sheet/LinkDevice': undefined;
  'Sheet/VerifyOnOtherDevice': undefined;
  'Sheet/AddPasskeyCredentials': undefined;
  'Sheet/CreatePost': undefined;
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
