import type { NavigatorScreenParams } from '@react-navigation/native';
import type { DeviceAsset } from '@ion/feed';

export type VerifyMethodType = 'Passkey' | 'Password' | 'Biometrics';

export interface VerifyNextRoute {
  name: string;
  params?: Record<string, unknown>;
  reset?: boolean;
}

export type WalletViewSheetParamList = {
  WalletViewSwitcher: undefined;
  WalletViewManage: undefined;
  WalletViewCreate: undefined;
  WalletViewEdit: { walletId: string };
  WalletViewDeleteConfirm: { walletId: string };
};

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
  EditProfile: undefined;
  'Sheet/Auth': NavigatorScreenParams<AuthStackParamList> | undefined;
  'Sheet/WalletViewManagement': NavigatorScreenParams<WalletViewSheetParamList> | undefined;
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
  'Sheet/MediaPicker': { onComplete?: (assets: DeviceAsset[]) => void } | undefined;
  'Sheet/GalleryPermissionDenied': undefined;
  'Sheet/CameraPermissionDenied': undefined;
  'Sheet/CancelPost': undefined;
  'Sheet/Settings': NavigatorScreenParams<SettingsStackParamList> | undefined;
};

export type SettingsStackParamList = {
  'Settings/Home': undefined;
  'Settings/Account': undefined;
};

export type TwoFaType = 'auth' | 'email' | 'sms';

export interface TwoFaOption {
  type: TwoFaType;
  label: string;
}

export type AuthStackParamList = {
  GetStarted: undefined;
  PasswordRegister: undefined;
  PasskeyRegister: undefined;
  RestoreIdentity: undefined;
  RestoreFromCloud: undefined;
  RestoreWithRecoveryCreds: undefined;
  TfaOptions: { optionsCount: 1 | 2 };
  TfaVerification: { selectedMethods: TwoFaOption[] };
  RestoreSetNewPassword: undefined;
  ProfileSetup: undefined;
  SelectLanguages: undefined;
  DiscoverCreators: undefined;
  Notifications: undefined;
};
