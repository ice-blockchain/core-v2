import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

function ShieldIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M10 1L3 4.5V9.5C3 14 6 17.5 10 19C14 17.5 17 14 17 9.5V4.5L10 1Z"
        fill="#0166FF"
        opacity={0.2}
      />
      <Path
        d="M10 1L3 4.5V9.5C3 14 6 17.5 10 19C14 17.5 17 14 17 9.5V4.5L10 1Z"
        stroke="#0166FF"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SecuredByFooter() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Secured by</Text>
      <ShieldIcon />
      <Text style={styles.brand}>Identity.io</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  text: {
    fontWeight: "500",
    fontSize: 12,
    color: "#494949",
  },
  brand: {
    fontWeight: "500",
    fontSize: 12,
    color: "#0166FF",
  },
});
