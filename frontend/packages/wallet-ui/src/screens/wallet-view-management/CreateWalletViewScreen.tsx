import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { useTheme } from "@ion/ui";
import { createWalletView } from "@ion/wallet";
import { useWalletViewNavigation } from "@ion/navigation";
import { WalletViewNameForm } from "../../components/WalletViewNameForm";
import { showWalletError } from "../../show-wallet-error";

export function CreateWalletViewScreen() {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const theme = useTheme();
  const walletViewNav = useWalletViewNavigation();
  const containerStyle = useMemo(() => ({ padding: theme.spacing.lg }), [theme.spacing.lg]);

  const handleSubmit = useCallback(() => {
    setIsSubmitting(true);
    createWalletView(name).then((result) => {
      if (result.outcome === "error") showWalletError(result.error);
    });
    walletViewNav.goBack();
  }, [name, walletViewNav]);

  return (
    <View style={containerStyle}>
      <WalletViewNameForm value={name} onChangeText={setName} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </View>
  );
}
