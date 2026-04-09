import { useState, useCallback, useRef, useMemo } from 'react';
import type { DeviceAsset } from '@ion/feed';

const PAGE_SIZE = 30;

interface FetchPhotosResult {
  assets: DeviceAsset[];
  endCursor?: string | undefined;
  hasNextPage: boolean;
}

type FetchFn = (opts: { first: number; after?: string | undefined }) => Promise<FetchPhotosResult>;

function usePaginationRefs() {
  const cursorRef = useRef<string | undefined>(undefined);
  const hasMoreRef = useRef(true);
  const isLoadingRef = useRef(false);
  return useMemo(() => ({ cursorRef, hasMoreRef, isLoadingRef }), [cursorRef, hasMoreRef, isLoadingRef]);
}

interface LoadInitialDeps {
  fetchPhotos: FetchFn;
  refs: ReturnType<typeof usePaginationRefs>;
  setters: { setAssets: (a: DeviceAsset[]) => void; setIsLoading: (b: boolean) => void };
}

function useLoadInitial({ fetchPhotos, refs, setters }: LoadInitialDeps) {
  return useCallback(async () => {
    if (refs.isLoadingRef.current) return;
    setters.setIsLoading(true);
    refs.isLoadingRef.current = true;
    try {
      const result = await fetchPhotos({ first: PAGE_SIZE });
      refs.cursorRef.current = result.endCursor;
      refs.hasMoreRef.current = result.hasNextPage;
      setters.setAssets(result.assets);
    } catch (error) {
      console.error('Failed to load photos', error);
    } finally {
      refs.isLoadingRef.current = false;
      setters.setIsLoading(false);
    }
  }, [fetchPhotos, refs, setters]);
}

export function useAssetPagination(fetchPhotos: FetchFn) {
  const [assets, setAssets] = useState<DeviceAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const refs = usePaginationRefs();
  const setters = { setAssets, setIsLoading };
  const loadInitial = useLoadInitial({ fetchPhotos, refs, setters });

  const loadMore = useCallback(async () => {
    if (!refs.hasMoreRef.current || refs.isLoadingRef.current) return;
    refs.isLoadingRef.current = true;
    setIsLoading(true);
    try {
      const result = await fetchPhotos({ first: PAGE_SIZE, after: refs.cursorRef.current });
      refs.cursorRef.current = result.endCursor;
      refs.hasMoreRef.current = result.hasNextPage;
      setAssets((prev) => [...prev, ...result.assets]);
    } finally {
      refs.isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [fetchPhotos, refs]);

  return { assets, isLoading, loadInitial, loadMore };
}
