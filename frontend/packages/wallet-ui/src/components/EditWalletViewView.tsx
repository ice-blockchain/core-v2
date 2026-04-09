import { useCallback, useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, Icon, Text, TextField, useNotificationBar, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { useWalletViews, renameWalletView } from "@ion/wallet";

interface EditWalletViewViewProps {
  walletId: string;
  onNavigateToDelete: (walletId: string) => void;
  onBack: () => void;
}

export function EditWalletViewView({ walletId, onNavigateToDelete, onBack }: EditWalletViewViewProps) {
  const walletViews = useWalletViews();
  const wallet = walletViews.find((w) => w.id === walletId);
  if (!wallet) return null;

  return <EditWalletViewForm wallet={wallet} onNavigateToDelete={onNavigateToDelete} onBack={onBack} />;
}

interface FormProps {
  wallet: { id: string; name: string; isMain: boolean };
  onNavigateToDelete: (walletId: string) => void;
  onBack: () => void;
}

function useRenameHandler(walletId: string, name: string, onBack: () => void) {
  const notifications = useNotificationBar();
  const errorColor = useTheme().colors.attentionRed;
  return useCallback(() => {
    try {
      renameWalletView(walletId, name);
      onBack();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to rename wallet";
      notifications.show({ message, backgroundColor: errorColor });
    }
  }, [walletId, name, onBack, notifications, errorColor]);
}

function EditWalletViewForm({ wallet, onNavigateToDelete, onBack }: FormProps) {
  const scale = useTheme().scale.scaleSize;
  const [name, setName] = useState(wallet.name);
  const [isFocused, setIsFocused] = useState(false);
  const canSave = name.trim() !== wallet.name && name.trim().length > 0;
  const handleSave = useRenameHandler(wallet.id, name, onBack);
  const containerStyle = useMemo(() => ({ gap: scale(16), padding: scale(16) }), [scale]);

  return (
    <View style={containerStyle}>
      <TextField
        label={translate("walletUi:walletNameLabel")}
        value={name}
        onChangeText={setName}
        isClearable
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {isFocused && <Button label={translate("walletUi:saveButton")} onPress={handleSave} isDisabled={!canSave} />}
      {!wallet.isMain && !isFocused && <DeleteWalletButton walletId={wallet.id} onPress={onNavigateToDelete} />}
    </View>
  );
}

function DeleteWalletButton({ walletId, onPress }: { walletId: string; onPress: (id: string) => void }) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const buttonStyle = useMemo(() => buildDeleteButtonStyle(theme), [theme]);

  return (
    <TouchableOpacity style={[styles.deleteButton, buttonStyle]} onPress={() => onPress(walletId)} accessibilityRole="button">
      <Icon name="block-delete" size={scale(24)} color={theme.colors.onPrimaryAccent} />
      <Text variant="body" color={theme.colors.onPrimaryAccent}>{translate("walletUi:deleteWalletButton")}</Text>
    </TouchableOpacity>
  );
}

function buildDeleteButtonStyle(theme: ReturnType<typeof useTheme>) {
  const scale = theme.scale.scaleSize;
  return {
    borderRadius: theme.scale.scaleRadius(16),
    padding: scale(16),
    gap: scale(8),
    backgroundColor: theme.colors.attentionRed,
  };
}

const styles = StyleSheet.create({
  deleteButton: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
