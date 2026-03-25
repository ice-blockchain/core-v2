import type { NostrFilter } from "./types";

interface FilterQuery {
  sql: string;
  params: unknown[];
}

interface FilterState {
  conditions: string[];
  params: unknown[];
  joins: string[];
  tagJoinIndex: number;
}

export function buildFilterQuery(filter: NostrFilter): FilterQuery {
  const state: FilterState = {
    conditions: [],
    params: [],
    joins: [],
    tagJoinIndex: 0,
  };

  addInFilter(state, "e.id", filter.ids);
  addInFilter(state, "e.pubkey", filter.authors);
  addInFilter(state, "e.kind", filter.kinds);
  addRangeFilters(state, filter);
  addTagFilters(state, filter);

  return buildFinalQuery(state, filter.limit);
}

function addInFilter(
  state: FilterState,
  column: string,
  values: unknown[] | undefined,
): void {
  if (!values || values.length === 0) return;
  const placeholders = values.map(() => "?").join(", ");
  state.conditions.push(`${column} IN (${placeholders})`);
  state.params.push(...values);
}

function addRangeFilters(state: FilterState, filter: NostrFilter): void {
  if (filter.since !== undefined) {
    state.conditions.push("e.created_at >= ?");
    state.params.push(filter.since);
  }
  if (filter.until !== undefined) {
    state.conditions.push("e.created_at <= ?");
    state.params.push(filter.until);
  }
}

function addTagFilters(state: FilterState, filter: NostrFilter): void {
  for (const [key, values] of Object.entries(filter)) {
    if (!key.startsWith("#") || !values || !Array.isArray(values)) continue;
    addSingleTagFilter(state, key.slice(1), values as string[]);
  }
}

function addSingleTagFilter(
  state: FilterState,
  tagName: string,
  values: string[],
): void {
  const alias = `t${state.tagJoinIndex++}`;
  state.joins.push(
    `JOIN event_tags_index ${alias} ON e.id = ${alias}.event_id`,
  );
  const placeholders = values.map(() => "?").join(", ");
  state.conditions.push(`${alias}.tag_name = ?`);
  state.params.push(tagName);
  state.conditions.push(`${alias}.tag_value IN (${placeholders})`);
  state.params.push(...values);
}

function buildFinalQuery(state: FilterState, limit?: number): FilterQuery {
  const joinClause =
    state.joins.length > 0 ? " " + state.joins.join(" ") : "";
  const whereClause =
    state.conditions.length > 0
      ? " WHERE " + state.conditions.join(" AND ")
      : "";
  const limitClause = limit !== undefined ? ` LIMIT ${Number(limit)}` : "";

  const sql =
    `SELECT DISTINCT e.* FROM events e${joinClause}${whereClause}` +
    ` ORDER BY e.created_at DESC${limitClause}`;

  return { sql, params: state.params };
}
