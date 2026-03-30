import { StyleSheet, Text, View } from "react-native";
import { BottomSheet, Icon } from "@ion/ui";
import { PrimaryButton } from "./primary-button";

interface IdentityKeyNotFoundModalProps {
  visible: boolean;
  onClose: () => void;
}

export function IdentityKeyNotFoundModal({ visible, onClose }: IdentityKeyNotFoundModalProps) {
  return (
    <BottomSheet isVisible={visible} onClose={onClose}>
      <View style={styles.container}>
        <Icon name="keys-error" size={80} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Identity key was not found</Text>
          <Text style={styles.description}>
            The identity key for recovery was not found.
          </Text>
        </View>
        <View style={styles.buttonWrapper}>
          <PrimaryButton label="Close" onPress={onClose} showArrow={false} style={styles.button} />
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
  title: {
    fontWeight: "600",
    fontSize: 17,
    color: "#0E0E0E",
  },
  description: {
    fontWeight: "400",
    fontSize: 13,
    color: "#494949",
    textAlign: "center",
  },
  buttonWrapper: {
    marginTop: 25,
  },
  button: {
    width: 343,
  },
});
