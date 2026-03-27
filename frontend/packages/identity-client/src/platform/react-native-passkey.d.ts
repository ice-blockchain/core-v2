declare module 'react-native-passkey' {
  interface PasskeyCreateRequest {
    challenge: string;
    rp: { id: string; name: string };
    user: { id: string; name: string; displayName: string };
    pubKeyCredParams: Array<{ type: string; alg: number }>;
    authenticatorSelection?: Record<string, unknown>;
    attestation?: string;
    excludeCredentials?: Array<{ type: string; id: string }>;
  }

  interface PasskeyGetRequest {
    challenge: string;
    rpId: string;
    allowCredentials?: Array<{ type: string; id: string }>;
    userVerification?: string;
  }

  interface PasskeyCreateResult {
    rawId: string;
    response: {
      clientDataJSON: string;
      attestationObject: string;
    };
  }

  interface PasskeyGetResult {
    rawId: string;
    response: {
      clientDataJSON: string;
      authenticatorData: string;
      signature: string;
      userHandle: string | undefined;
    };
  }

  export const Passkey: {
    isSupported(): boolean;
    create(request: PasskeyCreateRequest): Promise<PasskeyCreateResult>;
    get(request: PasskeyGetRequest): Promise<PasskeyGetResult>;
  };
}
