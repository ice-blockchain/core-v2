import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "@ion/ui";
import { PrimaryButton } from "./primary-button";

interface RestoreSuccessModalProps {
  visible: boolean;
  onLogin: () => void;
}

function ModalContent() {
  return (
    <View style={styles.content}>
      <Icon name="keys-success" size={80} color="" />
      <View style={styles.textContainer}>
        <Text style={styles.title}>Congratulations</Text>
        <Text style={styles.description}>
          Your identity key has been restored. You can now access your account securely.
        </Text>
      </View>
    </View>
  );
}

export function RestoreSuccessModal({ visible, onLogin }: RestoreSuccessModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onLogin}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onLogin} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ModalContent />
          <View style={styles.buttonWrapper}>
            <PrimaryButton label="Log in" onPress={onLogin} showArrow={false} style={styles.button} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(8, 21, 50, 0.4)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 50,
  },
  handle: {
    width: 50,
    height: 3,
    borderRadius: 5,
    backgroundColor: "#B8BCCA",
    marginBottom: 20,
  },
  content: {
    alignItems: "center",
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
    marginTop: 31,
  },
  button: {
    width: 343,
  },
});
