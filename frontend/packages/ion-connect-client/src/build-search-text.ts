import type { NostrEvent } from "./types";

export function buildSearchText(event: NostrEvent): string | null {
  switch (event.kind) {
    case 0:
      return buildProfileSearchText(event.content);
    case 1:
    case 30023:
      return buildContentSearchText(event);
    default:
      return null;
  }
}

function buildProfileSearchText(content: string): string | null {
  try {
    const profile = JSON.parse(content) as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof profile["display_name"] === "string") {
      parts.push(profile["display_name"]);
    }
    if (typeof profile["name"] === "string") {
      parts.push(profile["name"]);
    }
    if (typeof profile["about"] === "string") {
      parts.push(profile["about"]);
    }
    return parts.length > 0 ? parts.join(" ") : null;
  } catch {
    return null;
  }
}

function buildContentSearchText(event: NostrEvent): string | null {
  const parts: string[] = [];

  const titleTag = event.tags.find((t) => t[0] === "title");
  if (titleTag?.[1]) {
    parts.push(titleTag[1]);
  }

  if (event.content) {
    parts.push(event.content);
  }

  return parts.length > 0 ? parts.join(" ") : null;
}
