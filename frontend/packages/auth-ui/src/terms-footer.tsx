import { StyleSheet, Text } from "react-native";
import { translate } from "@ion/localization";

export function TermsFooter() {
  return (
    <Text style={styles.container}>
      {translate("auth:termsAgreementPrefix")}
      <Text style={styles.link}>{translate("auth:termsOfServiceLink")}</Text>
      {" & "}
      <Text style={styles.link}>{translate("auth:privacyPolicyLink")}</Text>
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
