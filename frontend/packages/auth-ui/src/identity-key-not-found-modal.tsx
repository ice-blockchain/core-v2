import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "@ion/ui";
import { PrimaryButton } from "./primary-button";

interface IdentityKeyNotFoundModalProps {
  visible: boolean;
  onClose: () => void;
}

function ModalContent() {
  return (
    <View style={styles.content}>
      <Icon name="keys-error" size={80} color="" />
      <View style={styles.textContainer}>
        <Text style={styles.title}>Identity key was not found</Text>
        <Text style={styles.description}>
          The identification key for recovery was not found.
        </Text>
      </View>
    </View>
  );
}

export function IdentityKeyNotFoundModal({ visible, onClose }: IdentityKeyNotFoundModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ModalContent />
          <View style={styles.buttonWrapper}>
            <PrimaryButton label="Close" onPress={onClose} showArrow={false} style={styles.button} />
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
    marginTop: 31,
  },
  button: {
    width: 343,
  },
});
