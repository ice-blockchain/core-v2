import { ed25519 } from '@noble/curves/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { pbkdf2Async } from '@noble/hashes/pbkdf2';
import { bytesToHex, randomBytes } from '@noble/hashes/utils';
import { gcm } from '@noble/ciphers/aes';

export interface KeyPair {
  seed: Uint8Array;
  publicKey: Uint8Array;
  publicKeyPem: string;
  privateKeyPem: string;
}

export interface EncryptedPrivateKey {
  salt: string;
  nonce: string;
  ciphertext: string;
  mac: string;
}

export interface RegistrationSignatureResult {
  credId: string;
  clientData: string;
  attestationData: string;
  encryptedPrivateKey: string;
}

export interface LoginSignatureResult {
  credId: string;
  clientData: string;
  signature: string;
}

// Ed25519 SubjectPublicKeyInfo prefix (OID 1.3.101.112)
const SPKI_PREFIX = new Uint8Array([
  0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00,
]);

// Ed25519 PKCS#8 prefix (OID 1.3.101.112)
const PKCS8_PREFIX = new Uint8Array([
  0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20,
]);

const PBKDF2_ITERATIONS = 100_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function buildSortedJson(obj: Record<string, unknown>): string {
  const sorted = Object.keys(obj).sort().reduce<Record<string, unknown>>((acc, key) => {
    acc[key] = obj[key];
    return acc;
  }, {});
  return JSON.stringify(sorted);
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function toPem(tag: string, der: Uint8Array): string {
  return `-----BEGIN ${tag}-----\n${bytesToBase64(der)}\n-----END ${tag}-----`;
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(a.length + b.length);
  result.set(a);
  result.set(b, a.length);
  return result;
}

function toPublicKeyPem(publicKey: Uint8Array): string {
  return toPem('PUBLIC KEY', concatBytes(SPKI_PREFIX, publicKey));
}

function toPrivateKeyPem(seed: Uint8Array): string {
  return toPem('PRIVATE KEY', concatBytes(PKCS8_PREFIX, seed));
}

export function parseSeedFromPem(pem: string): Uint8Array {
  const b64 = pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s/g, '');
  const decoded = base64ToBytes(b64);
  if (decoded.length !== 48) {
    throw new Error('Invalid Ed25519 PKCS#8 key: expected 48 bytes');
  }
  for (let i = 0; i < PKCS8_PREFIX.length; i++) {
    if (decoded[i] !== PKCS8_PREFIX[i]) {
      throw new Error('Invalid Ed25519 PKCS#8 key: wrong prefix');
    }
  }
  return decoded.slice(16, 48);
}

export function generateKeyPair(): KeyPair {
  const seed = randomBytes(32);
  const publicKey = ed25519.getPublicKey(seed);
  return {
    seed,
    publicKey,
    publicKeyPem: toPublicKeyPem(publicKey),
    privateKeyPem: toPrivateKeyPem(seed),
  };
}

export function generateCredentialId(publicKey: Uint8Array): string {
  const hash = sha256(publicKey);
  const truncated = hash.slice(0, 16);
  const num = BigInt('0x' + bytesToHex(truncated));
  const raw = num.toString(36).toUpperCase().padStart(25, '0');
  const groups = raw.match(/.{5}/g);
  if (!groups) throw new Error('Failed to split credential ID into groups');
  return groups.join('-');
}

export async function encryptPrivateKey(
  privateKeyPem: string,
  password: string,
): Promise<EncryptedPrivateKey> {
  const salt = randomBytes(16);
  const key = await pbkdf2Async(sha256, password, salt, { c: PBKDF2_ITERATIONS, dkLen: 32 });
  const nonce = randomBytes(12);
  const encrypted = gcm(key, nonce).encrypt(encoder.encode(privateKeyPem));
  return {
    salt: bytesToBase64(salt),
    nonce: bytesToBase64(nonce),
    ciphertext: bytesToBase64(encrypted.slice(0, -16)),
    mac: bytesToBase64(encrypted.slice(-16)),
  };
}

export async function decryptPrivateKey(
  encrypted: EncryptedPrivateKey,
  password: string,
): Promise<string> {
  const salt = base64ToBytes(encrypted.salt);
  const key = await pbkdf2Async(sha256, password, salt, { c: PBKDF2_ITERATIONS, dkLen: 32 });
  const nonce = base64ToBytes(encrypted.nonce);
  const combined = concatBytes(base64ToBytes(encrypted.ciphertext), base64ToBytes(encrypted.mac));
  const decrypted = gcm(key, nonce).decrypt(combined);
  return decoder.decode(decrypted);
}

interface SignForRegistrationInput {
  challenge: string;
  origin: string;
  keyPair: KeyPair;
  password: string;
}

export async function signForRegistration(
  input: SignForRegistrationInput,
): Promise<RegistrationSignatureResult> {
  const { challenge, origin, keyPair, password } = input;

  const clientData = buildSortedJson({
    challenge, crossOrigin: false, origin, type: 'key.create',
  });
  const clientDataHash = bytesToHex(sha256(encoder.encode(clientData)));
  const fingerprint = buildSortedJson({
    clientDataHash, publicKey: keyPair.publicKeyPem,
  });
  const signatureHex = bytesToHex(
    ed25519.sign(encoder.encode(fingerprint), keyPair.seed),
  );
  const attestationData = buildSortedJson({
    publicKey: keyPair.publicKeyPem, signature: signatureHex,
  });
  const credId = generateCredentialId(keyPair.publicKey);
  const encrypted = await encryptPrivateKey(keyPair.privateKeyPem, password);

  return {
    credId,
    clientData: toBase64Url(encoder.encode(clientData)),
    attestationData: toBase64Url(encoder.encode(attestationData)),
    encryptedPrivateKey: JSON.stringify(encrypted),
  };
}

interface SignForLoginInput {
  challenge: string;
  origin: string;
  privateKeyPem: string;
  credentialId: string;
}

export function signForLogin(input: SignForLoginInput): LoginSignatureResult {
  const { challenge, origin, privateKeyPem, credentialId } = input;
  const seed = parseSeedFromPem(privateKeyPem);

  const clientData = buildSortedJson({
    challenge, crossOrigin: false, origin, type: 'key.get',
  });
  const signature = toBase64Url(ed25519.sign(encoder.encode(clientData), seed));

  return {
    credId: credentialId,
    clientData: toBase64Url(encoder.encode(clientData)),
    signature,
  };
}
