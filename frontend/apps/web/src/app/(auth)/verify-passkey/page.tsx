"use client";

import { useRouter } from "next/navigation";
import { VerifyPasskeyScreen } from "@ion/auth-ui";
import { LoadingAnimation } from "@/components/loading-animation";

export default function VerifyPasskeyPage() {
  const router = useRouter();

  return (
    <VerifyPasskeyScreen
      identityKeyName=""
      onBack={() => router.back()}
      onDismiss={() => router.push("/get-started")}
      loadingElement={<LoadingAnimation variant="onLightBackground" size={30} />}
    />
  );
}
