import { StyleSheet, Text, View } from "react-native";
import { BottomSheet, Icon } from "@ion/ui";
import { PrimaryButton } from "./primary-button";

interface RestoreSuccessModalProps {
  visible: boolean;
  onLogin: () => void;
}

export function RestoreSuccessModal({ visible, onLogin }: RestoreSuccessModalProps) {
  return (
    <BottomSheet isVisible={visible} onClose={onLogin}>
      <View style={styles.container}>
        <Icon name="keys-success" size={80} color="#FFFFFF" />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Congratulations</Text>
          <Text style={styles.description}>
            Your identity key has been restored. You can now access your account securely.
          </Text>
        </View>
        <View style={styles.buttonWrapper}>
          <PrimaryButton label="Log in" onPress={onLogin} showArrow={false} style={styles.button} />
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
    width: 320,
  },
  title: {
    fontWeight: "600",
    fontSize: 15,
    color: "#0E0E0E",
  },
  description: {
    fontWeight: "400",
    fontSize: 13,
    color: "#494949",
    textAlign: "center",
  },
  buttonWrapper: {
    marginTop: 21,
  },
  button: {
    width: 343,
  },
});
