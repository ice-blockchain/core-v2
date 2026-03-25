import { StyleSheet, Text } from "react-native";

export function TermsFooter() {
  return (
    <Text style={styles.container}>
      By continuing, you are agreeing to our{" "}
      <Text style={styles.link}>Terms of Service</Text>
      {" & "}
      <Text style={styles.link}>Privacy Policy</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "400",
    color: "#9A9A9A",
    lineHeight: 18,
    maxWidth: 219,
  },
  link: {
    color: "#0166FF",
  },
});
