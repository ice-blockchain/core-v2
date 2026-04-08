import { useState, useCallback, useRef } from 'react';
import type { DeviceAsset } from '@ion/feed';

const PAGE_SIZE = 30;

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
    try {
      const result = await fetchPhotos({ first: PAGE_SIZE });
      cursorRef.current = result.endCursor;
      hasMoreRef.current = result.hasNextPage;
      setAssets(result.assets);
    } finally {
      setIsLoading(false);
    }
  }, [fetchPhotos]);

  const loadMore = useCallback(async () => {
    if (!hasMoreRef.current || isLoading) return;
    setIsLoading(true);
    try {
      const result = await fetchPhotos({ first: PAGE_SIZE, after: cursorRef.current });
      cursorRef.current = result.endCursor;
      hasMoreRef.current = result.hasNextPage;
      setAssets((prev) => [...prev, ...result.assets]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchPhotos, isLoading]);

  return { assets, isLoading, loadInitial, loadMore };
}
