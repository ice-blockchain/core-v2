import { StyleSheet, View } from "react-native";
import { translate } from "@ion/localization";
import { BottomSheet, Icon, Text, colorPalette } from "@ion/ui";
import { PrimaryButton } from "./primary-button";

const ICON_SIZE = 80;
const CONTAINER_WIDTH = 320;
const BUTTON_WIDTH = 343;

interface RestoreSuccessModalProps {
  isVisible: boolean;
  onClose: () => void;
  onLogin: () => void;
}

export function RestoreSuccessModal({ isVisible, onClose, onLogin }: RestoreSuccessModalProps) {
  return (
    <BottomSheet isVisible={isVisible} onClose={onClose}>
      <View style={styles.container}>
        <Icon name="keys-success" size={ICON_SIZE} color={colorPalette.white} />
        <View style={styles.textContainer}>
          <Text variant="subtitle" color={colorPalette.ink}>{translate("auth:restoreSuccessTitle")}</Text>
          <Text variant="body2" color={colorPalette.slate} style={styles.description}>
            {translate("auth:restoreSuccessDescription")}
          </Text>
        </View>
        <View style={styles.buttonWrapper}>
          <PrimaryButton label={translate("auth:loginButton")} onPress={onLogin} showArrow={false} style={styles.button} />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 50,
    gap: 10,
  },
  textContainer: {
    alignItems: "center",
    gap: 8,
    width: CONTAINER_WIDTH,
  },
  description: {
    textAlign: "center",
  },
  buttonWrapper: {
    marginTop: 21,
  },
  button: {
    width: BUTTON_WIDTH,
  },
});
