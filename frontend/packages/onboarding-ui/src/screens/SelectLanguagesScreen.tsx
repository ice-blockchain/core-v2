import { useCallback, useMemo } from "react";
import { ScrollView, View } from "react-native";
import type { ViewStyle } from "react-native";
import { BottomSheet, Button, SearchBar, Text, useTheme } from "@ion/ui";
import type { OnboardingScreenProps } from "../types";
import { CheckboxRow } from "../components/CheckboxRow";
import type { LanguageSelectionActions, LanguageSelectionState } from "./select-languages-hooks";
import { useLanguageSelection } from "./select-languages-hooks";
import { buildListSectionStyle, buildScrollContentStyle, buildTitleContainerStyle } from "./select-languages-styles";

function LanguageList({ state, actions, scrollContentStyle }: { state: LanguageSelectionState; actions: LanguageSelectionActions; scrollContentStyle: ViewStyle }) {
  return (
    <ScrollView contentContainerStyle={scrollContentStyle}>
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
    </ScrollView>
  );
}

export function SelectLanguagesScreen({ onContinue, onBack }: OnboardingScreenProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const [state, actions] = useLanguageSelection(onContinue);

  const titleStyle = useMemo(() => buildTitleContainerStyle(scale), [scale]);
  const listSectionStyle = useMemo(() => buildListSectionStyle(scale), [scale]);
  const scrollContentStyle = useMemo(() => buildScrollContentStyle(scale), [scale]);
  const handleClose = useCallback(() => onBack?.(), [onBack]);

  const continueButton = state.hasSelection
    ? <Button label="Continue" isLoading={state.isSaving} onPress={actions.handleSave} />
    : undefined;

  return (
    <BottomSheet isVisible onClose={handleClose} {...(onBack ? { onBack } : {})} floatingFooter={continueButton} testID="select-languages-screen">
      <View style={titleStyle}>
        <Text variant="headline1">Select languages</Text>
        <Text variant="body2" color={theme.colors.tertiaryText}>You'll be shown content in the selected language</Text>
      </View>
      <View style={listSectionStyle}>
        <SearchBar value={state.searchQuery} onChangeText={actions.setSearchQuery} placeholder="Search" testID="language-search" />
        <LanguageList state={state} actions={actions} scrollContentStyle={scrollContentStyle} />
      </View>
    </BottomSheet>
  );
}
