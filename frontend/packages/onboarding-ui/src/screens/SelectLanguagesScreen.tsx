import { useCallback, useMemo } from "react";
import { View } from "react-native";
import type { ViewStyle } from "react-native";
import { BottomSheet, Button, SearchBar, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import type { OnboardingScreenProps } from "../types";
import { CheckboxRow } from "../components/CheckboxRow";
import { OnboardingScreenTitle } from "../components/OnboardingScreenTitle";
import type { LanguageSelectionActions, LanguageSelectionState } from "./select-languages-hooks";
import { useLanguageSelection } from "./select-languages-hooks";
import { buildListSectionStyle, buildScrollContentStyle } from "./select-languages-styles";

function LanguageList({ state, actions, style }: { state: LanguageSelectionState; actions: LanguageSelectionActions; style: ViewStyle }) {
  return (
    <View style={style}>
      {state.filteredLanguages.map((lang) => (
        <CheckboxRow
          key={lang.code}
          flag={lang.flag}
          name={lang.name}
          isSelected={state.selectedCodes.has(lang.code)}
          onPress={() => actions.toggleLanguage(lang.code)}
          testID={`language-${lang.code}`}
        />
      ))}
    </View>
  );
}

export function SelectLanguagesScreen({ onContinue, onBack }: OnboardingScreenProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const [state, actions] = useLanguageSelection(onContinue);

  const listSectionStyle = useMemo(() => buildListSectionStyle(scale), [scale]);
  const scrollContentStyle = useMemo(() => buildScrollContentStyle(scale), [scale]);
  const handleClose = useCallback(() => onBack?.(), [onBack]);

  const continueButton = state.hasSelection
    ? <Button label={translate("onboarding:continueButton")} isLoading={state.isSaving} onPress={actions.handleSave} />
    : undefined;

  return (
    <BottomSheet isVisible onClose={handleClose} {...(onBack ? { onBack } : {})} floatingFooter={continueButton} testID="select-languages-screen">
      <OnboardingScreenTitle title={translate("onboarding:selectLanguagesTitle")} subtitle={translate("onboarding:selectLanguagesSubtitle")} />
      <View style={listSectionStyle}>
        <SearchBar value={state.searchQuery} onChangeText={actions.setSearchQuery} placeholder={translate("onboarding:searchPlaceholder")} testID="language-search" />
        <LanguageList state={state} actions={actions} style={scrollContentStyle} />
      </View>
    </BottomSheet>
  );
}
