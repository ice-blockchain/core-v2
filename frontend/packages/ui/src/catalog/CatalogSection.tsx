import { View } from "react-native";
import { Text } from "../components/Text";
import { useTheme } from "../theme/ThemeProvider";

interface CatalogSectionProps {
  title: string;
  children: React.ReactNode;
}

export function CatalogSection({ title, children }: CatalogSectionProps) {
  const theme = useTheme();

  return (
    <View style={{ marginBottom: theme.spacing.xxxl }}>
      <Text variant="headline2" style={{ marginBottom: theme.spacing.lg }}>
        {title}
      </Text>
      {children}
    </View>
  );
}
