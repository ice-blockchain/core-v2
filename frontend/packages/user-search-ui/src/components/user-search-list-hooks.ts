import { useCallback, useEffect, useRef, useState } from "react";
import { searchUsers, fetchFollowedUsers } from "@ion/user-search";
import type { SearchableUser } from "@ion/user-search";

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 15;
const STUB_DELAY_MS = 1000;

export interface UserSearchListState {
  query: string;
  users: SearchableUser[];
  isLoading: boolean;
  hasMore: boolean;
  isFocused: boolean;
}

export interface UserSearchListActions {
  handleQueryChange: (text: string) => void;
  handleLoadMore: () => void;
  handleCancel: () => void;
  handleFocus: () => void;
  handleBlur: () => void;
}

function useDebounce(callback: (value: string) => void, delayMs: number) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debounced = useCallback(
    (value: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => callback(value), delayMs);
    },
    [callback, delayMs],
  );

  const cancel = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  return { debounced, cancel };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSearchPage(query: string, page: number): Promise<{ users: SearchableUser[]; hasMore: boolean }> {
  if (page === 0) await delay(STUB_DELAY_MS);
  return searchUsers({ query, page, pageSize: PAGE_SIZE });
}

function useSearchPerform() {
  const [users, setUsers] = useState<SearchableUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  const loadFollowed = useCallback(async (page: number) => {
    setIsLoading(page === 0);
    const result = await fetchFollowedUsers({ page, pageSize: PAGE_SIZE });
    setUsers((prev) => (page === 0 ? result.users : [...prev, ...result.users]));
    setHasMore(result.hasMore);
    setIsLoading(false);
  }, []);

  const performSearch = useCallback(async (query: string, page: number) => {
    setIsLoading(page === 0);
    const result = await fetchSearchPage(query, page);
    setUsers((prev) => (page === 0 ? result.users : [...prev, ...result.users]));
    setHasMore(result.hasMore);
    setIsLoading(false);
  }, []);

  const clearResults = useCallback(() => {
    setUsers([]);
    setHasMore(false);
    setIsLoading(false);
  }, []);

  return { users, isLoading, hasMore, loadFollowed, performSearch, clearResults };
}

function useSearchActions(deps: ReturnType<typeof useSearchPerform>) {
  const { loadFollowed, performSearch, clearResults, hasMore, isLoading } = deps;
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const pageRef = useRef(0);

  const { debounced: debouncedSearch, cancel: cancelDebounce } = useDebounce((value: string) => {
    pageRef.current = 0;
    if (value) { void performSearch(value, 0); } else { clearResults(); }
  }, DEBOUNCE_MS);

  const handleQueryChange = useCallback(
    (text: string) => { setQuery(text); debouncedSearch(text); },
    [debouncedSearch],
  );

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    pageRef.current += 1;
    if (query) { void performSearch(query, pageRef.current); } else { void loadFollowed(pageRef.current); }
  }, [hasMore, isLoading, query, performSearch, loadFollowed]);

  const handleCancel = useCallback(() => {
    cancelDebounce();
    setQuery("");
    setIsFocused(false);
    pageRef.current = 0;
    void loadFollowed(0);
  }, [cancelDebounce, loadFollowed]);

  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

  useEffect(() => { void loadFollowed(0); }, [loadFollowed]);

  return { query, isFocused, handleQueryChange, handleLoadMore, handleCancel, handleFocus, handleBlur };
}

export function useUserSearchList(): [UserSearchListState, UserSearchListActions] {
  const searchPerform = useSearchPerform();
  const actions = useSearchActions(searchPerform);

  return [
    { query: actions.query, users: searchPerform.users, isLoading: searchPerform.isLoading, hasMore: searchPerform.hasMore, isFocused: actions.isFocused },
    { handleQueryChange: actions.handleQueryChange, handleLoadMore: actions.handleLoadMore, handleCancel: actions.handleCancel, handleFocus: actions.handleFocus, handleBlur: actions.handleBlur },
  ];
}
