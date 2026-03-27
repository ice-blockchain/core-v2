import { useCallback, useEffect, useState } from "react";
import { fetchSuggestedCreators, followCreator, unfollowCreator } from "@ion/onboarding";
import type { Creator } from "@ion/onboarding";

export interface DiscoverCreatorsState {
  creators: Creator[];
  followedIds: Set<string>;
  isLoading: boolean;
  hasMore: boolean;
}

export interface DiscoverCreatorsActions {
  toggleFollow: (creatorId: string) => void;
  loadMore: () => void;
  handleContinue: () => void;
}

function useToggleFollow() {
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  const toggleFollow = useCallback((creatorId: string) => {
    setFollowedIds((prev) => {
      const next = new Set(prev);
      if (next.has(creatorId)) {
        next.delete(creatorId);
        unfollowCreator(creatorId).catch(() => {
          setFollowedIds((current) => new Set([...current, creatorId]));
        });
      } else {
        next.add(creatorId);
        followCreator(creatorId).catch(() => {
          setFollowedIds((current) => {
            const reverted = new Set(current);
            reverted.delete(creatorId);
            return reverted;
          });
        });
      }
      return next;
    });
  }, []);

  return { followedIds, toggleFollow };
}

function useCreatorList() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchSuggestedCreators({ page: 0 })
      .then((result) => {
        setCreators(result.creators);
        setHasMore(result.hasMore);
      })
      .catch(() => setCreators([]))
      .finally(() => setIsLoading(false));
  }, []);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchSuggestedCreators({ page: nextPage })
      .then((result) => {
        setCreators((prev) => [...prev, ...result.creators]);
        setHasMore(result.hasMore);
      })
      .catch(() => setHasMore(false));
  }, [hasMore, isLoading, page]);

  return { creators, isLoading, hasMore, loadMore };
}

export function useDiscoverCreators(onContinue: () => void): [DiscoverCreatorsState, DiscoverCreatorsActions] {
  const { followedIds, toggleFollow } = useToggleFollow();
  const { creators, isLoading, hasMore, loadMore } = useCreatorList();

  const handleContinue = useCallback(() => {
    onContinue();
  }, [onContinue]);

  return [
    { creators, followedIds, isLoading, hasMore },
    { toggleFollow, loadMore, handleContinue },
  ];
}
