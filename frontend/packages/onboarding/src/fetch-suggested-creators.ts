import type { FetchSuggestedCreatorsInput, FetchSuggestedCreatorsResult } from "./types";

const STUB_CREATORS = [
  { id: "1", avatarUrl: "", name: "Alex Rivers", handle: "alexrivers", isVerified: true },
  { id: "2", avatarUrl: "", name: "Jordan Blake", handle: "jordanblake", isVerified: false },
  { id: "3", avatarUrl: "", name: "Sam Nakamura", handle: "samnakamura", isVerified: true },
  { id: "4", avatarUrl: "", name: "Taylor Chen", handle: "taylorchen", isVerified: false },
  { id: "5", avatarUrl: "", name: "Morgan Ellis", handle: "morganellis", isVerified: true },
  { id: "6", avatarUrl: "", name: "Casey Dunn", handle: "caseydunn", isVerified: false },
  { id: "7", avatarUrl: "", name: "Riley Foster", handle: "rileyfoster", isVerified: true },
  { id: "8", avatarUrl: "", name: "Drew Patel", handle: "drewpatel", isVerified: false },
];

// TODO: Wire to real API when available
export async function fetchSuggestedCreators(input: FetchSuggestedCreatorsInput): Promise<FetchSuggestedCreatorsResult> {
  const pageSize = 8;
  const start = input.page * pageSize;
  const creators = STUB_CREATORS.slice(start, start + pageSize);
  return { creators, hasMore: start + pageSize < STUB_CREATORS.length };
}
