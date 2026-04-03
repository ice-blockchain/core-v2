import { StyleSheet, View } from "react-native";
import { translate } from "@ion/localization";
import { BottomSheet, Icon, Text, useTheme } from "@ion/ui";
import { PrimaryButton } from "./primary-button";

interface IdentityKeyNotFoundModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export function IdentityKeyNotFoundModal({ isVisible, onClose }: IdentityKeyNotFoundModalProps) {
  const { colors } = useTheme();

  return (
    <BottomSheet isVisible={isVisible} onClose={onClose}>
      <View style={styles.container}>
        <Icon name="keys-error" size={80} />
        <View style={styles.textContainer}>
          <Text variant="title" color={colors.primaryText}>{translate("auth:identityKeyNotFoundTitle")}</Text>
          <Text variant="body2" color={colors.secondaryText} style={styles.description}>
            {translate("auth:identityKeyNotFoundDescription")}
          </Text>
        </View>
        <View style={styles.buttonWrapper}>
          <PrimaryButton label={translate("auth:closeButton")} onPress={onClose} showArrow={false} style={styles.button} />
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
    gap: 6,
  },
  textContainer: {
    alignItems: "center",
    gap: 8,
    width: 320,
  },
  description: {
    textAlign: "center",
  },
  buttonWrapper: {
    marginTop: 25,
  },
  button: {
    width: 343,
  },
});
