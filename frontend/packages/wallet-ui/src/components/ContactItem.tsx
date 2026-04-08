import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Avatar, Text, useTheme } from "@ion/ui";
import type { ContactData } from "../types";

interface ContactItemProps {
  contact: ContactData;
}

export function ContactItem({ contact }: ContactItemProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const scaleRadius = theme.scale.scaleRadius;

  const containerStyle = useMemo(
    () => ({ width: scale(70), gap: scale(6) }),
    [scale],
  );

  const textStyle = useMemo(
    () => ({ width: scale(70) }),
    [scale],
  );

  return (
    <View style={[styles.container, containerStyle]}>
      <Avatar
        size={scale(60)}
        {...(contact.avatarUrl ? { imageUrl: contact.avatarUrl } : {})}
        borderRadius={scaleRadius(14)}
      />
      <Text
        variant="caption3"
        color={theme.colors.secondaryText}
        numberOfLines={1}
        style={[styles.username, textStyle]}
      >
        {contact.username}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  username: {
    textAlign: "center",
  },
});
