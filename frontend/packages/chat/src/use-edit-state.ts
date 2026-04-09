import { useCallback, useState } from "react";

export function useEditState() {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [isDeleteVisible, setIsDeleteVisible] = useState(false);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const deleteSheet = {
    isVisible: isDeleteVisible,
    show: useCallback(() => setIsDeleteVisible(true), []),
    close: useCallback(() => setIsDeleteVisible(false), []),
    confirm: useCallback(() => { setIsDeleteVisible(false); setSelectedIds(new Set()); }, []),
  };

  return { selectedIds, toggleItem, clearSelection, deleteSheet };
}
