import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchLanguages, saveSelectedLanguages } from "@ion/onboarding";
import type { Language } from "@ion/onboarding";

export interface LanguageSelectionState {
  selectedCodes: Set<string>;
  searchQuery: string;
  filteredLanguages: Language[];
  hasSelection: boolean;
  isLoading: boolean;
  isSaving: boolean;
}

export interface LanguageSelectionActions {
  toggleLanguage: (code: string) => void;
  setSearchQuery: (text: string) => void;
  handleSave: () => Promise<void>;
}

function filterAndSortLanguages(languages: Language[], query: string, selectedCodes: Set<string>): Language[] {
  const lowerQuery = query.toLowerCase();
  const filtered = query
    ? languages.filter((lang) => lang.name.toLowerCase().includes(lowerQuery))
    : languages;

  return [...filtered].sort((a, b) => {
    const aSelected = selectedCodes.has(a.code);
    const bSelected = selectedCodes.has(b.code);
    if (aSelected !== bSelected) return aSelected ? -1 : 1;
    return 0;
  });
}

function useToggleLanguage() {
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());

  const toggleLanguage = useCallback((code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) { next.delete(code); } else { next.add(code); }
      return next;
    });
  }, []);

  return { selectedCodes, toggleLanguage };
}

function useSaveLanguages(selectedCodes: Set<string>, onContinue: () => void) {
  const [isSaving, setIsSaving] = useState(false);
  const hasSelection = selectedCodes.size > 0;

  const handleSave = useCallback(async () => {
    if (!hasSelection) return;
    setIsSaving(true);
    try {
      await saveSelectedLanguages({ languageCodes: [...selectedCodes] });
      onContinue();
    } finally {
      setIsSaving(false);
    }
  }, [hasSelection, selectedCodes, onContinue]);

  return { isSaving, hasSelection, handleSave };
}

export function useLanguageSelection(onContinue: () => void): [LanguageSelectionState, LanguageSelectionActions] {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { selectedCodes, toggleLanguage } = useToggleLanguage();
  const { isSaving, hasSelection, handleSave } = useSaveLanguages(selectedCodes, onContinue);

  useEffect(() => {
    fetchLanguages().then(setLanguages).finally(() => setIsLoading(false));
  }, []);

  const filteredLanguages = useMemo(
    () => filterAndSortLanguages(languages, searchQuery, selectedCodes),
    [languages, searchQuery, selectedCodes],
  );

  return [
    { selectedCodes, searchQuery, filteredLanguages, hasSelection, isLoading, isSaving },
    { toggleLanguage, setSearchQuery, handleSave },
  ];
}
