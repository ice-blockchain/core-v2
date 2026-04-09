import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { useTheme } from "@ion/ui";
import { createWalletView } from "@ion/wallet";
import { useWalletViewNavigation } from "@ion/navigation";
import { WalletViewNameForm } from "../../components/WalletViewNameForm";

export function CreateWalletViewScreen() {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const theme = useTheme();
  const walletViewNav = useWalletViewNavigation();
  const containerStyle = useMemo(() => ({ padding: theme.spacing.lg }), [theme.spacing.lg]);

  const handleSubmit = useCallback(() => {
    setIsSubmitting(true);
    try {
      createWalletView(name);
      walletViewNav.goBack();
    } catch (error) {
      setIsSubmitting(false);
      console.warn("[wallet-view] create failed:", error instanceof Error ? error.message : error);
    }
  }, [name, walletViewNav]);

  return (
    <View style={containerStyle}>
      <WalletViewNameForm value={name} onChangeText={setName} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </View>
  );
}
