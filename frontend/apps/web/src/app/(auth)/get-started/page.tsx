"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { FormInput } from "@/components/form-input";
import { PrimaryButton } from "@/components/primary-button";
import { SecondaryButton } from "@/components/secondary-button";
import { TextButton } from "@/components/text-button";
import { SecuredByFooter } from "@/components/secured-by-footer";
import { TermsFooter } from "@/components/terms-footer";
import { IceLogoIcon } from "@/components/ice-logo-icon";
import { IdentityKeyIcon } from "@/components/identity-key-icon";
import { InfoIcon } from "@/components/info-icon";
import { CreateAccountIcon } from "@/components/create-account-icon";
import { RestoreKeyIcon } from "@/components/restore-key-icon";

const pageStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: "100%",
  flex: 1,
  paddingTop: 50,
};

const iconStyle: CSSProperties = {
  width: 65,
  height: 65,
  borderRadius: "50%",
  backgroundColor: "#0166FF",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 20,
};

const titleStyle: CSSProperties = {
  fontWeight: 700,
  fontSize: 28,
  color: "#0E0E0E",
  margin: "0 0 8px",
};

const subtitleStyle: CSSProperties = {
  fontWeight: 400,
  fontSize: 13,
  color: "#9A9A9A",
  textAlign: "center",
  maxWidth: 320,
  margin: "0 0 40px",
};

const orStyle: CSSProperties = {
  fontWeight: 500,
  fontSize: 12,
  color: "#9A9A9A",
  margin: "16px 0",
};

const footerStyle: CSSProperties = {
  marginTop: "auto",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
  paddingBottom: 40,
};

function GetStartedHeader() {
  return (
    <>
      <div style={iconStyle}>
        <IceLogoIcon />
      </div>
      <h1 style={titleStyle}>Get started</h1>
      <p style={subtitleStyle}>
        Enter your identity key name to log in into your account
      </p>
    </>
  );
}

export default function GetStartedPage() {
  const [identityKeyName, setIdentityKeyName] = useState("");
  const router = useRouter();

  return (
    <div style={pageStyle}>
      <GetStartedHeader />
      <FormInput
        placeholder="Identity key name"
        value={identityKeyName}
        onChange={setIdentityKeyName}
        leftIcon={<IdentityKeyIcon />}
        rightIcon={<InfoIcon />}
      />
      <div style={{ marginTop: 16 }}>
        <PrimaryButton label="Continue" onClick={() => router.push("/verify-passkey")} />
      </div>
      <span style={orStyle}>or</span>
      <SecondaryButton label="Register" onClick={() => router.push("/register")} leftIcon={<CreateAccountIcon />} />
      <TextButton label="Restore identity key" leftIcon={<RestoreKeyIcon />} />
      <div style={footerStyle}>
        <SecuredByFooter />
        <TermsFooter />
      </div>
    </div>
  );
}
