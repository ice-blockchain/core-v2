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
  ChatPreview: undefined;
  ProxyTest: undefined;
  StorageTest: undefined;
  AuthFlow: undefined;
  'Sheet/Auth': NavigatorScreenParams<AuthStackParamList> | undefined;
  'Sheet/NicknameReserved': undefined;
  'Sheet/IdentityKeyNameNote': undefined;
  'Sheet/Verify': { next: VerifyNextRoute; method?: VerifyMethodType; identityKeyName?: string };
  'Sheet/LinkDevice': undefined;
  'Sheet/VerifyOnOtherDevice': undefined;
  'Sheet/AddBiometrics': undefined;
  'Sheet/AddPasskeyCredentials': undefined;
  'Sheet/CreatePost': undefined;
  'Sheet/InvalidCredentials': undefined;
  'Sheet/ConfirmPassword': undefined;
  'Sheet/RestoreSuccess': undefined;
  'Sheet/GeneralError': { errorCode: string };
  'Sheet/MediaPicker': { onComplete?: (assets: unknown[]) => void } | undefined;
  'Sheet/GalleryPermissionDenied': undefined;
  'Sheet/CameraPermissionDenied': undefined;
};

export type AuthStackParamList = {
  GetStarted: undefined;
  PasswordRegister: undefined;
  PasskeyRegister: undefined;
  RestoreIdentity: undefined;
  RestoreWithRecoveryCreds: undefined;
  RestoreSetNewPassword: undefined;
  ProfileSetup: undefined;
  SelectLanguages: undefined;
  DiscoverCreators: undefined;
  Notifications: undefined;
};
