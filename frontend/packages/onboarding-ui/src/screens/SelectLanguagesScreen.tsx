import { useCallback, useMemo } from "react";
import { View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import type { ViewStyle } from "react-native";
import { Button, SearchBar, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthNavigation, useSheetScroll, Routes } from "@ion/navigation";
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

function useScreenStyles() {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const insets = useSafeAreaInsets();

  return {
    container: useMemo(() => ({ flex: 1 as const, backgroundColor: theme.colors.secondaryBackground }), [theme.colors]),
    listSection: useMemo(() => buildListSectionStyle(scale), [scale]),
    scrollContent: useMemo(() => buildScrollContentStyle(scale), [scale]),
    floatingFooter: useMemo((): ViewStyle => ({
      position: "absolute",
      bottom: scale(10) + insets.bottom,
      left: 0,
      right: 0,
      paddingHorizontal: scale(16),
    }), [scale, insets.bottom]),
  };
}

function SelectLanguagesContent({ state, actions, styles }: {
  state: LanguageSelectionState;
  actions: LanguageSelectionActions;
  styles: ReturnType<typeof useScreenStyles>;
}) {
  const sheetScroll = useSheetScroll();

  return (
    <BottomSheetScrollView onScroll={sheetScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled">
      <OnboardingScreenTitle
        title={translate("onboarding:selectLanguagesTitle")}
        subtitle={translate("onboarding:selectLanguagesSubtitle")}
      />
      <View style={styles.listSection}>
        <SearchBar
          value={state.searchQuery}
          onChangeText={actions.setSearchQuery}
          placeholder={translate("onboarding:searchPlaceholder")}
          testID="language-search"
        />
        <LanguageList state={state} actions={actions} style={styles.scrollContent} />
      </View>
    </BottomSheetScrollView>
  );
}

export function SelectLanguagesScreen() {
  const navigation = useAuthNavigation();
  const styles = useScreenStyles();

  const navigateNext = useCallback(() => {
    navigation.navigate(Routes.Auth.DiscoverCreators);
  }, [navigation]);

  const [state, actions] = useLanguageSelection(navigateNext);

  const continueButton = state.hasSelection
    ? <Button label={translate("onboarding:continueButton")} isLoading={state.isSaving} onPress={actions.handleSave} />
    : undefined;

  return (
    <View style={styles.container} testID="select-languages-screen">
      <SelectLanguagesContent state={state} actions={actions} styles={styles} />
      {continueButton ? <View style={styles.floatingFooter}>{continueButton}</View> : null}
    </View>
  );
}
