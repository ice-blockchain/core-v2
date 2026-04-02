import { useMemo } from "react";
import { View } from "react-native";
import type { ReactNode } from "react";
import { translate } from "@ion/localization";
import { Text, useTheme } from "@ion/ui";
import { FingerprintIcon } from "./fingerprint-icon";
import { DeviceIcon } from "./device-icon";
import { SafeAccountIcon } from "./safe-account-icon";

interface BenefitRowProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
}

interface BenefitItem extends BenefitRowProps {
  id: string;
}

const ROW_STYLE = { flexDirection: "row" as const, alignItems: "center" as const, gap: 12 };
const TEXT_CONTAINER_STYLE = { flex: 1 };

function BenefitRow({ icon, title, subtitle }: BenefitRowProps) {
  const theme = useTheme();
  const iconStyle = useMemo(() => ({
    width: 48,
    height: 68,
    backgroundColor: theme.colors.tertiaryBackground,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  }), [theme.colors.tertiaryBackground]);

  return (
    <View style={ROW_STYLE}>
      <View style={iconStyle}>
        {icon}
      </View>
      <View style={TEXT_CONTAINER_STYLE}>
        <Text variant="body">{title}</Text>
        <Text variant="caption3">{subtitle}</Text>
      </View>
    </View>
  );
}

function buildBenefits(): BenefitItem[] {
  return [
    {
      id: "no-password",
      icon: <FingerprintIcon />,
      title: translate("auth:noPasswordBenefitTitle"),
      subtitle: translate("auth:noPasswordBenefitSubtitle"),
    },
    {
      id: "works-on-devices",
      icon: <DeviceIcon />,
      title: translate("auth:worksOnDevicesTitle"),
      subtitle: translate("auth:worksOnDevicesSubtitle"),
    },
    {
      id: "keep-account-safer",
      icon: <SafeAccountIcon />,
      title: translate("auth:keepAccountSaferTitle"),
      subtitle: translate("auth:keepAccountSaferSubtitle"),
    },
  ];
}

export function PasskeyBenefitList() {
  const benefits = buildBenefits();
  return (
    <View style={CONTAINER_STYLE}>
      {benefits.map((benefit) => (
        <BenefitRow
          key={benefit.id}
          icon={benefit.icon}
          title={benefit.title}
          subtitle={benefit.subtitle}
        />
      ))}
    </View>
  );
}

const CONTAINER_STYLE = {
  gap: 12,
  marginTop: 37,
  paddingHorizontal: 40,
  alignSelf: "stretch" as const,
};
