import type { NostrFilter } from "./types";

interface FilterQuery {
  sql: string;
  params: unknown[];
}

export function buildFilterQuery(filter: NostrFilter): FilterQuery {
  const conditions: string[] = [];
  const params: unknown[] = [];
  const joins: string[] = [];
  let tagJoinIndex = 0;

  if (filter.ids && filter.ids.length > 0) {
    const placeholders = filter.ids.map(() => "?").join(", ");
    conditions.push(`e.id IN (${placeholders})`);
    params.push(...filter.ids);
  }

  if (filter.authors && filter.authors.length > 0) {
    const placeholders = filter.authors.map(() => "?").join(", ");
    conditions.push(`e.pubkey IN (${placeholders})`);
    params.push(...filter.authors);
  }

  if (filter.kinds && filter.kinds.length > 0) {
    const placeholders = filter.kinds.map(() => "?").join(", ");
    conditions.push(`e.kind IN (${placeholders})`);
    params.push(...filter.kinds);
  }

  if (filter.since !== undefined) {
    conditions.push("e.created_at >= ?");
    params.push(filter.since);
  }

  if (filter.until !== undefined) {
    conditions.push("e.created_at <= ?");
    params.push(filter.until);
  }

  for (const [key, values] of Object.entries(filter)) {
    if (!key.startsWith("#") || !values || !Array.isArray(values)) continue;
    const tagName = key.slice(1);
    const alias = `t${tagJoinIndex++}`;
    joins.push(
      `JOIN event_tags_index ${alias} ON e.id = ${alias}.event_id`,
    );
    const placeholders = values.map(() => "?").join(", ");
    conditions.push(`${alias}.tag_name = ?`);
    params.push(tagName);
    conditions.push(`${alias}.tag_value IN (${placeholders})`);
    params.push(...values);
  }

  const joinClause = joins.length > 0 ? " " + joins.join(" ") : "";
  const whereClause =
    conditions.length > 0 ? " WHERE " + conditions.join(" AND ") : "";
  const limitClause =
    filter.limit !== undefined ? ` LIMIT ${Number(filter.limit)}` : "";

  const sql =
    `SELECT DISTINCT e.* FROM events e${joinClause}${whereClause}` +
    ` ORDER BY e.created_at DESC${limitClause}`;

  return { sql, params };
}
