import { useState, useCallback, useRef } from 'react';
import type { Album, DeviceAsset, FetchAssetsResult, FetchAssetsOptions } from '@ion/feed';

const MAX_SELECTION = 10;

interface UseMediaPickerStateOptions {
  fetchAssets: (options: FetchAssetsOptions) => Promise<FetchAssetsResult>;
}

function reindexSelection(map: Map<string, number>): Map<string, number> {
  const entries = [...map.entries()].sort((a, b) => a[1] - b[1]);
  const reindexed = new Map<string, number>();
  entries.forEach(([key], index) => reindexed.set(key, index + 1));
  return reindexed;
}

function useSelectionState() {
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());

  const toggleSelection = useCallback((assetId: string) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
        return reindexSelection(next);
      }
      if (next.size >= MAX_SELECTION) return prev;
      next.set(assetId, next.size + 1);
      return next;
    });
  }, []);

  return { selectedItems, selectedCount: selectedItems.size, isMaxSelected: selectedItems.size >= MAX_SELECTION, toggleSelection };
}

function buildFetchOptions(albumId?: string, after?: string): FetchAssetsOptions {
  const options: FetchAssetsOptions = { first: 30 };
  if (albumId) options.albumId = albumId;
  if (after) options.after = after;
  return options;
}

function useFetchPage(fetchAssets: UseMediaPickerStateOptions['fetchAssets']) {
  const cursorRef = useRef<string | undefined>(undefined);
  const hasMoreRef = useRef(true);

  const fetchPage = useCallback(async (albumId?: string, after?: string) => {
    const result = await fetchAssets(buildFetchOptions(albumId, after));
    cursorRef.current = result.endCursor;
    hasMoreRef.current = result.hasNextPage;
    return result.assets;
  }, [fetchAssets]);

  return { fetchPage, cursorRef, hasMoreRef };
}

function useAssetPagination(fetchAssets: UseMediaPickerStateOptions['fetchAssets']) {
  const [assets, setAssets] = useState<DeviceAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAlbum, setCurrentAlbum] = useState<Album | null>(null);
  const { fetchPage, cursorRef, hasMoreRef } = useFetchPage(fetchAssets);

  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    const items = await fetchPage(currentAlbum?.id);
    setAssets(items);
    setIsLoading(false);
  }, [fetchPage, currentAlbum]);

  const loadMore = useCallback(async () => {
    if (!hasMoreRef.current || isLoading) return;
    const items = await fetchPage(currentAlbum?.id, cursorRef.current);
    setAssets((prev) => [...prev, ...items]);
  }, [fetchPage, currentAlbum, isLoading, hasMoreRef, cursorRef]);

  const switchAlbum = useCallback(async (album: Album | null) => {
    setCurrentAlbum(album);
    cursorRef.current = undefined;
    hasMoreRef.current = true;
    setIsLoading(true);
    const items = await fetchPage(album?.id);
    setAssets(items);
    setIsLoading(false);
  }, [fetchPage, cursorRef, hasMoreRef]);

  return { assets, isLoading, currentAlbum, loadInitial, loadMore, switchAlbum };
}

export function useMediaPickerState({ fetchAssets }: UseMediaPickerStateOptions) {
  const selection = useSelectionState();
  const pagination = useAssetPagination(fetchAssets);

  return { ...selection, ...pagination };
}
