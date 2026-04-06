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

function BenefitRow({ icon, title, subtitle }: BenefitRowProps) {
  const { colors, scale } = useTheme();

  const rowStyle = useMemo(() => ({
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: scale.scaleSize(10),
  }), [scale]);

  const iconStyle = useMemo(() => ({
    width: scale.scaleSize(48),
    height: scale.scaleSize(68),
    backgroundColor: colors.tertiaryBackground,
    borderTopLeftRadius: scale.scaleRadius(12),
    borderBottomLeftRadius: scale.scaleRadius(12),
    alignItems: "center" as const,
    justifyContent: "center" as const,
  }), [colors.tertiaryBackground, scale]);

  return (
    <View style={rowStyle}>
      <View style={iconStyle}>
        {icon}
      </View>
      <View style={TEXT_CONTAINER_STYLE}>
        <Text variant="body" color={colors.primaryText}>{title}</Text>
        <Text variant="caption3" color={colors.tertiaryText}>{subtitle}</Text>
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
  const { scale } = useTheme();

  const containerStyle = useMemo(() => ({
    gap: scale.scaleSize(12),
    marginTop: scale.scaleSize(37),
    alignSelf: "stretch" as const,
    paddingHorizontal: scale.scaleSize(44),
  }), [scale]);

  const benefits = buildBenefits();
  return (
    <View style={containerStyle}>
      {benefits.map((benefit) => (
        <BenefitRow key={benefit.id} icon={benefit.icon} title={benefit.title} subtitle={benefit.subtitle} />
      ))}
    </View>
  );
}

const TEXT_CONTAINER_STYLE = { flex: 1 };
