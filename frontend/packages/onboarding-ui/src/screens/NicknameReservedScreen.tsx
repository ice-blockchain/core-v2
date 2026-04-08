import { Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { InfoSheetScreen } from "@ion/navigation";

const CONTACT_EMAIL = "hi@ice.io";

function DescriptionWithEmail({ color, emailColor }: { color: string; emailColor: string }) {
  const description = translate("onboarding:nicknameReservedDescription");
  const parts = description.split(CONTACT_EMAIL);
  if (parts.length < 2) {
    return <Text variant="body2" color={color}>{description}</Text>;
  }
  return (
    <Text variant="body2" color={color}>
      {parts[0]}<Text variant="body2" color={emailColor}>{CONTACT_EMAIL}</Text>{parts[1]}
    </Text>
  );
}

export function NicknameReservedScreen() {
  const { colors } = useTheme();

  return (
    <InfoSheetScreen
      headerTitle={translate("onboarding:nicknameReservedModalTitle")}
      iconName="name-reserved"
      iconColor={colors.secondaryText}
      title={translate("onboarding:nicknameReservedTitle")}
      description={
        <DescriptionWithEmail color={colors.secondaryText} emailColor={colors.primaryAccent} />
      }
    />
  );
}
