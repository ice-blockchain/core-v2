"use client";

import { useRouter } from "next/navigation";
import { GetStartedScreen } from "@ion/auth-ui";

export default function GetStartedPage() {
  const router = useRouter();

  return (
    <GetStartedScreen
      onNavigateToRegister={() => router.push("/register")}
      onNavigateToVerifyPasskey={() => router.push("/verify-passkey")}
    />
  );
}
