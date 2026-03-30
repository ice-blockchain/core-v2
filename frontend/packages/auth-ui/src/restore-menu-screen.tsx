import { StyleSheet, View } from "react-native";
import { Icon } from "@ion/ui";
import { SheetHeader } from "./sheet-header";
import { RegisterHeader } from "./register-header";
import { RestoreOptionCard } from "./restore-option-card";
import { SecuredByFooter } from "./secured-by-footer";
import { TermsFooter } from "./terms-footer";
import { RestoreKeyIcon } from "./restore-key-icon";

interface RestoreMenuScreenProps {
  onBack: () => void;
  onSelectCredentialRestore: () => void;
}

function RestoreOptions({ onSelectCredentials }: { onSelectCredentials: () => void }) {
  return (
    <View style={styles.options}>
      <RestoreOptionCard
        icon={<Icon name="restore-cloud" size={48} color="" />}
        title="Restore from iCloud"
        description="Restore your identity key from an iCloud backup"
      />
      <RestoreOptionCard
        icon={<Icon name="restore-credentials" size={48} color="" />}
        title="Restore using recovery credentials"
        description="Restore with Recovery code and Recovery key ID"
        onPress={onSelectCredentials}
      />
    </View>
  );
}

export function RestoreMenuScreen({ onBack, onSelectCredentialRestore }: RestoreMenuScreenProps) {
  return (
    <View style={styles.page}>
      <SheetHeader title="" onBack={onBack} />
      <RegisterHeader
        icon={<RestoreKeyIcon />}
        title="Restore identity key"
        subtitle="Select the type of identity key recovery"
      />
      <RestoreOptions onSelectCredentials={onSelectCredentialRestore} />
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
