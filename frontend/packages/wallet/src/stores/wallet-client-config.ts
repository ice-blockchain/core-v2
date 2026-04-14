import type { IdentityClient } from "@ion/identity-client";
import { resetWalletViewStore } from "./wallet-view-store";

let identityClient: IdentityClient | null = null;
let currentUsername: string | null = null;

export function initializeWalletClient(client: IdentityClient, username: string): void {
  identityClient = client;
  currentUsername = username;
}

export function getWalletClient(): { client: IdentityClient; username: string } {
  if (!identityClient || !currentUsername) {
    throw new Error("Wallet client not initialized. Call initializeWalletClient first.");
  }
  return { client: identityClient, username: currentUsername };
}

export function resetWalletClient(): void {
  identityClient = null;
  currentUsername = null;
  resetWalletViewStore();
}
