import type { AuthPhase } from './types';

const BACK_TARGETS: Partial<Record<AuthPhase, AuthPhase>> = {
  'register': 'get-started',
  'verify-password': 'get-started',
  'restore-menu': 'get-started',
  'restore-credentials': 'restore-menu',
  'set-new-password': 'restore-credentials',
};

export function resolveBackPhase(currentPhase: AuthPhase): AuthPhase | null {
  return BACK_TARGETS[currentPhase] ?? null;
}

const VALID_TRANSITIONS: Record<AuthPhase, readonly AuthPhase[]> = {
  'get-started': ['register', 'verify-password', 'restore-menu'],
  'register': ['get-started'],
  'verify-password': ['get-started'],
  'restore-menu': ['get-started', 'restore-credentials'],
  'restore-credentials': ['restore-menu', 'set-new-password', 'get-started'],
  'set-new-password': ['restore-credentials', 'get-started'],
};

export function isValidTransition(from: AuthPhase, to: AuthPhase): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
