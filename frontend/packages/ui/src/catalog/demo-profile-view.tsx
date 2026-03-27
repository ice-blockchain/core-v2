import { View } from "react-native";
import { Text } from "../components/Text";
import { Button } from "../components/Button";
import { Icon } from "../icons/Icon";
import { useTheme } from "../theme/ThemeProvider";

function Avatar() {
  const theme = useTheme();
  const size = theme.scale.scaleSize(60);
  return (
    <View style={{ width: size, height: size, borderRadius: theme.scale.scaleRadius(10), backgroundColor: "#3B5998", alignItems: "center", justifyContent: "center" }}>
      <Text variant="headline2" color={theme.colors.onPrimaryAccent}>CW</Text>
    </View>
  );
}

function UserInfo() {
  const theme = useTheme();
  return (
    <View style={{ alignItems: "center", gap: theme.spacing.xxs }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xxs }}>
        <Text variant="subtitle">Curtis Washington</Text>
        <Icon name="checkmark" size={theme.scale.scaleSize(16)} color={theme.colors.primaryAccent} />
      </View>
      <Text variant="caption" color={theme.colors.tertiaryText}>@curtiswashington</Text>
    </View>
  );
}

export function DemoProfileView({ onSend, onReceive }: { onSend: () => void; onReceive: () => void }) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: "center", paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
      <Avatar />
      <View style={{ marginTop: theme.spacing.xs }}>
        <UserInfo />
      </View>
      <View style={{ flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.lg, width: "100%" }}>
        <View style={{ flex: 1 }}>
          <Button height={44} color="primary" label="Send" onPress={onSend} />
        </View>
        <View style={{ flex: 1 }}>
          <Button height={44} color="secondary" label="Receive" onPress={onReceive} />
        </View>
      </View>
    </View>
  );
}
