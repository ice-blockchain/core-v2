import { Icon, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { DynamicSheet, InformationSheetContent } from "@ion/navigation";

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
  const theme = useTheme();
  const scale = theme.scale.scaleSize;

  return (
    <DynamicSheet title={translate("onboarding:nicknameReservedModalTitle")}>
      <InformationSheetContent
        icon={<Icon name="name-reserved" size={scale(80)} color={theme.colors.secondaryText} />}
        title={translate("onboarding:nicknameReservedTitle")}
        description={
          <DescriptionWithEmail color={theme.colors.secondaryText} emailColor={theme.colors.primaryAccent} />
        }
      />
    </DynamicSheet>
  );
}
