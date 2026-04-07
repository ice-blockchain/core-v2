import type { NavigatorScreenParams } from '@react-navigation/native';

export type VerifyMethodType = 'Passkey' | 'Password' | 'Biometrics';

export interface VerifyNextRoute {
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
  'Sheet/Verify': { next: VerifyNextRoute; method?: VerifyMethodType };
  'Sheet/LinkDevice': undefined;
  'Sheet/VerifyOnOtherDevice': undefined;
  'Sheet/AddBiometrics': undefined;
  'Sheet/AddPasskeyCredentials': undefined;
  'Sheet/CreatePost': undefined;
  'Sheet/InvalidCredentials': undefined;
  'Sheet/ConfirmPassword': undefined;
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
