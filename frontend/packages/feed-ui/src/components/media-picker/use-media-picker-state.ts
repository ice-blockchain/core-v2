import { useState, useCallback, useRef } from 'react';
import type { DeviceAsset } from '@ion/feed';

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

interface FetchPhotosResult {
  assets: DeviceAsset[];
  endCursor?: string | undefined;
  hasNextPage: boolean;
}

type FetchFn = (opts: { first: number; after?: string | undefined }) => Promise<FetchPhotosResult>;

export function useAssetPagination(fetchPhotos: FetchFn) {
  const [assets, setAssets] = useState<DeviceAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const cursorRef = useRef<string | undefined>(undefined);
  const hasMoreRef = useRef(true);

  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchPhotos({ first: 30 });
    cursorRef.current = result.endCursor;
    hasMoreRef.current = result.hasNextPage;
    setAssets(result.assets);
    setIsLoading(false);
  }, [fetchPhotos]);

  const loadMore = useCallback(async () => {
    if (!hasMoreRef.current || isLoading) return;
    const result = await fetchPhotos({ first: 30, after: cursorRef.current });
    cursorRef.current = result.endCursor;
    hasMoreRef.current = result.hasNextPage;
    setAssets((prev) => [...prev, ...result.assets]);
  }, [fetchPhotos, isLoading]);

  return { assets, isLoading, loadInitial, loadMore };
}
