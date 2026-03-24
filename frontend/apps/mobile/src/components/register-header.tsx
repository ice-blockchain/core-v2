import { StyleSheet, Text, View } from "react-native";
import { RegisterPasswordIcon } from "./register-password-icon";

export function RegisterHeader() {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <RegisterPasswordIcon />
      </View>
      <Text style={styles.title}>Register</Text>
      <Text style={styles.subtitle}>
        Choose a strong password to create an account
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginTop: 20,
  },
  iconCircle: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: "#0166FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontWeight: "700",
    fontSize: 28,
    color: "#0E0E0E",
    marginBottom: 8,
  },
  subtitle: {
    fontWeight: "400",
    fontSize: 13,
    color: "#9A9A9A",
    textAlign: "center",
    maxWidth: 320,
  },
});
