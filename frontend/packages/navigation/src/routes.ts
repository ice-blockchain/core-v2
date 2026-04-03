export const Routes = {
  Splash: 'Splash',
  GetStarted: 'GetStarted',
  Catalog: 'Catalog',
  ChatPreview: 'ChatPreview',
  ProxyTest: 'ProxyTest',

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
