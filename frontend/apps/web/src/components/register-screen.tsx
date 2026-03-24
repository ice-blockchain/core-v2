"use client";

import { useCallback, useState } from "react";
import type { CSSProperties } from "react";
import { SheetHeader } from "@/components/sheet-header";
import { PrimaryButton } from "@/components/primary-button";
import { RegisterForm } from "@/components/register-form";
import { RegisterHeader } from "@/components/register-header";
import { SecuredByFooter } from "@/components/secured-by-footer";
import { TermsFooter } from "@/components/terms-footer";

const pageStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: "100%",
  flex: 1,
};

const footerStyle: CSSProperties = {
  marginTop: "auto",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
  paddingBottom: 40,
};

interface RegisterScreenProps {
  onBack: () => void;
  onNavigateToVerifyPasskey: () => void;
}

export function RegisterScreen(props: RegisterScreenProps) {
  const [isValid, setIsValid] = useState(false);
  const handleValidChange = useCallback((v: boolean) => setIsValid(v), []);

  return (
    <div style={pageStyle}>
      <SheetHeader title="" onBack={props.onBack} />
      <RegisterHeader />
      <RegisterForm onValidChange={handleValidChange} />
      <div style={{ marginTop: 24 }}>
        <PrimaryButton
          label="Continue"
          onClick={() => isValid && props.onNavigateToVerifyPasskey()}
        />
      </div>
      <div style={footerStyle}>
        <SecuredByFooter />
        <TermsFooter />
      </div>
    </div>
  );
}
