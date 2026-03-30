"use client";

import { useRouter } from "next/navigation";
import { RestoreMenuScreen } from "@ion/auth-ui";

export default function RestoreMenuPage() {
  const router = useRouter();

  return (
    <RestoreMenuScreen
      onBack={() => router.back()}
      onSelectCloudRestore={() => router.push("/get-started")}
      onSelectCredentialRestore={() => router.push("/get-started")}
    />
  );
}
