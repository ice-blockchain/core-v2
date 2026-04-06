export const Routes = {
  Splash: 'Splash',
  GetStarted: 'GetStarted',
  Main: 'Main',
  Catalog: 'Catalog',
  ChatPreview: 'ChatPreview',
  ProxyTest: 'ProxyTest',
  StorageTest: 'StorageTest',

  Sheet: {
    Auth: 'Sheet/Auth',
    NicknameReserved: 'Sheet/NicknameReserved',
    IdentityKeyNameNote: 'Sheet/IdentityKeyNameNote',
    VerifyPasskey: 'Sheet/VerifyPasskey',
  },

  Auth: {
    GetStarted: 'GetStarted',
    PasswordRegister: 'PasswordRegister',
    PasskeyRegister: 'PasskeyRegister',
    ProfileSetup: 'ProfileSetup',
    SelectLanguages: 'SelectLanguages',
    DiscoverCreators: 'DiscoverCreators',
    Notifications: 'Notifications',
  },
} as const;
