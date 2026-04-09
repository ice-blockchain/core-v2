import { useCallback, useMemo } from "react";
import { Image, Platform, StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { deleteWalletView } from "@ion/wallet";
import { walletDeleteImage } from "../assets/wallet-images";

interface DeleteWalletViewConfirmationProps {
  walletId: string;
  onCancel: () => void;
  onDeleted: () => void;
}

export function DeleteWalletViewConfirmation({ walletId, onCancel, onDeleted }: DeleteWalletViewConfirmationProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  const handleDelete = useCallback(() => {
    deleteWalletView(walletId);
    onDeleted();
  }, [walletId, onDeleted]);

  const imageSize = useMemo(() => ({ width: scale(80), height: scale(80) }), [scale]);
  const containerStyle = useMemo(() => ({ padding: scale(16), gap: scale(6) }), [scale]);

  return (
    <View style={[styles.container, containerStyle]}>
      <Image source={walletDeleteImage} style={imageSize} />
      <DeleteWalletViewText colors={theme.colors} scale={scale} />
      <DeleteWalletViewButtons scale={scale} onCancel={onCancel} onDelete={handleDelete} />
    </View>
  );
}

function DeleteWalletViewText({ colors, scale }: { colors: ReturnType<typeof useTheme>["colors"]; scale: (n: number) => number }) {
  const gapStyle = useMemo(() => ({ gap: scale(8) }), [scale]);
  return (
    <View style={[styles.textCenter, gapStyle]}>
      <Text variant="title" color={colors.primaryText}>{translate("walletUi:deleteWalletConfirmTitle")}</Text>
      <Text variant="body2" color={colors.secondaryText} style={styles.description}>{translate("walletUi:deleteWalletConfirmDescription")}</Text>
    </View>
  );
}

function DeleteWalletViewButtons({ scale, onCancel, onDelete }: { scale: (n: number) => number; onCancel: () => void; onDelete: () => void }) {
  const buttonsStyle = useMemo(() => ({ gap: scale(15), marginTop: scale(16) }), [scale]);
  return (
    <View style={[styles.buttons, buttonsStyle]}>
      <View style={styles.buttonFlex}>
        <Button color="tertiary" label={translate("walletUi:cancelButton")} onPress={onCancel} />
      </View>
      <View style={styles.buttonFlex}>
        <Button color="danger" label={translate("walletUi:deleteButton")} onPress={onDelete} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center" },
  textCenter: { alignItems: "center" },
  description: { textAlign: "center" },
  buttons: { flexDirection: "row", ...(Platform.OS === "web" ? { alignSelf: "stretch" as const } : {}) },
  buttonFlex: { flex: 1 },
});
