import { StyleSheet, View } from "react-native";

export function SheetHandle() {
  return <View style={styles.handle} />;
}

const styles = StyleSheet.create({
  handle: {
    width: 50,
    height: 3,
    borderRadius: 5,
    backgroundColor: "#B8BCCA",
    alignSelf: "center",
  },
});
