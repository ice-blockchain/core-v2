import { useState, useCallback } from 'react';

const MAX_SELECTION = 10;

function reindexSelection(map: Map<string, number>): Map<string, number> {
  const entries = [...map.entries()].sort((a, b) => a[1] - b[1]);
  const reindexed = new Map<string, number>();
  entries.forEach(([key], index) => reindexed.set(key, index + 1));
  return reindexed;
}

export function useSelectionState() {
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());

  const toggleSelection = useCallback((assetId: string) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      if (next.has(assetId)) { next.delete(assetId); return reindexSelection(next); }
      if (next.size >= MAX_SELECTION) return prev;
      next.set(assetId, next.size + 1);
      return next;
    });
  }, []);

  return {
    selectedItems,
    selectedCount: selectedItems.size,
    isMaxSelected: selectedItems.size >= MAX_SELECTION,
    toggleSelection,
  };
}
