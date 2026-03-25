"use client";

import { useRouter } from "next/navigation";
import { RegisterScreen } from "@ion/auth-ui";

export default function RegisterPage() {
  const router = useRouter();

  return (
    <RegisterScreen
      onBack={() => router.back()}
      onNavigateToVerifyPasskey={() => router.push("/verify-passkey")}
    />
  );
}
