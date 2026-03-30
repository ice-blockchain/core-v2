"use client";

import { useRouter } from "next/navigation";
import { GetStartedScreen } from "@ion/auth-ui";

export default function GetStartedPage() {
  const router = useRouter();

  return (
    <GetStartedScreen
      onNavigateToRegister={() => router.push("/register")}
      onNavigateToVerifyPassword={(identityKeyName) => router.push(`/verify-password?key=${encodeURIComponent(identityKeyName)}`)}
      onNavigateToRestore={() => router.push("/restore-menu")}
    />
  );
}
