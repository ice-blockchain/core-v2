import { createContext, useContext } from 'react';

export interface AuthError {
  code: string;
  userMessage: string;
}

export type LoginAttemptResult =
  | { outcome: 'authenticated' }
  | { outcome: 'needs-password'; identityKeyName: string }
  | { outcome: 'error'; error: AuthError };

export type RegisterResult =
  | { outcome: 'authenticated' }
  | { outcome: 'cancelled' }
  | { outcome: 'error'; error: AuthError };

export type PasswordLoginResult =
  | { outcome: 'authenticated' }
  | { outcome: 'error'; error: AuthError };

export interface AuthActions {
  attemptLogin: (identityKeyName: string) => Promise<LoginAttemptResult>;
  registerAccount: (data: { identityKeyName: string; password?: string }) => Promise<RegisterResult>;
  loginWithPassword: (identityKeyName: string, password: string) => Promise<PasswordLoginResult>;
  onAuthSuccess: (username: string) => void;
}

export const AuthActionsContext = createContext<AuthActions | null>(null);

export function useAuthActions(): AuthActions {
  const context = useContext(AuthActionsContext);
  if (!context) {
    throw new Error('useAuthActions must be used within an AuthActionsProvider');
  }
  return context;
}
