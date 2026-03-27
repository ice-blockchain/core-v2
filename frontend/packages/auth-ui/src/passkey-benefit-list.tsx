import { type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { translate } from "@ion/localization";
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
  return (
    <View style={styles.row}>
      <View style={styles.iconContainer}>
        {icon}
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
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
    <View style={styles.container}>
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

const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginTop: 37,
    paddingHorizontal: 40,
    alignSelf: "stretch",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 68,
    backgroundColor: "#FAFBFF",
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
    lineHeight: 18,
  },
  title: {
    fontWeight: "600",
    fontSize: 13,
    color: "#0E0E0E",
    lineHeight: 18,
  },
  subtitle: {
    fontWeight: "400",
    fontSize: 11,
    color: "#9A9A9A",
    lineHeight: 18,
  },
});
