/**
 * Custom item order uses fractional positions (ascending = first).
 * Moving an item only rewrites that one item: it gets a position between its new neighbours.
 */
export function positionBetween(prev?: number | null, next?: number | null): number {
  const hasPrev = typeof prev === "number";
  const hasNext = typeof next === "number";
  if (hasPrev && hasNext) return (prev + next) / 2;
  if (hasPrev) return prev + 1;
  if (hasNext) return next - 1;
  return 0;
}

/** Moves the item at `from` to `to` and returns the new list plus the moved item's new position. */
export function reorder<T extends { sort_order: number }>(list: T[], from: number, to: number): { list: T[]; position: number } {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  const position = positionBetween(next[to - 1]?.sort_order, next[to + 1]?.sort_order);
  next[to] = { ...moved, sort_order: position };
  return { list: next, position };
}
