import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@ion/ui";
import { SecuredByFooter } from "./secured-by-footer";
import { TermsFooter } from "./terms-footer";

export function AuthFooter() {
  const { scale } = useTheme();

  const dynamicStyles = useMemo(() => ({
    wrapper: {
      ...styles.wrapper,
      paddingTop: scale.scaleSize(14),
      paddingBottom: scale.scaleSize(14),
    },
    content: {
      ...styles.content,
      gap: scale.scaleSize(20),
    },
  }), [scale]);

  return (
    <View style={dynamicStyles.wrapper}>
      <View style={dynamicStyles.content}>
        <SecuredByFooter />
        <TermsFooter />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  content: {
    alignItems: "center",
  },
});
