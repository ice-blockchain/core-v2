import { StyleSheet, View } from "react-native";
import { translate } from "@ion/localization";
import { Icon } from "@ion/ui";
import { SheetHeader } from "./sheet-header";
import { RegisterHeader } from "./register-header";
import { RestoreOptionCard } from "./restore-option-card";
import { SecuredByFooter } from "./secured-by-footer";
import { TermsFooter } from "./terms-footer";
import { RestoreKeyIcon } from "./restore-key-icon";
import { getCloudProvider } from "./cloud-provider";

interface RestoreMenuScreenProps {
  onBack: () => void;
  onSelectCloudRestore: () => void;
  onSelectCredentialRestore: () => void;
}

function RestoreOptions({ onSelectCloud, onSelectCredentials }: { onSelectCloud: () => void; onSelectCredentials: () => void }) {
  const cloudProvider = getCloudProvider();
  return (
    <View style={styles.options}>
      <RestoreOptionCard
        icon={<Icon name="restore-cloud" size={48} />}
        title={translate("auth:restoreFromCloudTitle", { cloudProvider })}
        description={translate("auth:restoreFromCloudDescription", { cloudProvider })}
        onPress={onSelectCloud}
      />
      <RestoreOptionCard
        icon={<Icon name="restore-credentials" size={48} />}
        title={translate("auth:restoreUsingCredentialsTitle")}
        description={translate("auth:restoreUsingCredentialsDescription")}
        onPress={onSelectCredentials}
      />
    </View>
  );
}

export function RestoreMenuScreen({ onBack, onSelectCloudRestore, onSelectCredentialRestore }: RestoreMenuScreenProps) {
  return (
    <View style={styles.page}>
      <SheetHeader title="" onBack={onBack} />
      <RegisterHeader
        icon={<RestoreKeyIcon />}
        title={translate("auth:restoreMenuTitle")}
        subtitle={translate("auth:restoreMenuSubtitle")}
      />
      <RestoreOptions onSelectCloud={onSelectCloudRestore} onSelectCredentials={onSelectCredentialRestore} />
      <View style={styles.footer}>
        <SecuredByFooter />
        <TermsFooter />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    alignItems: "center",
    width: "100%",
  },
  options: {
    marginTop: 70,
    gap: 44,
  },
  footer: {
    marginTop: "auto",
    alignItems: "center",
    gap: 12,
    paddingBottom: 40,
  },
});
