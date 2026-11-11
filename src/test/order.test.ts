import { describe, expect, it } from "vitest";
import { positionBetween, reorder } from "@/lib/order";

const items = [
  { id: "a", sort_order: 1 },
  { id: "b", sort_order: 2 },
  { id: "c", sort_order: 3 },
  { id: "d", sort_order: 4 },
];

describe("custom item order", () => {
  it("dragging the last item to the top puts it first", () => {
    const { list, position } = reorder(items, 3, 0);
    expect(list.map((i) => i.id)).toEqual(["d", "a", "b", "c"]);
    expect(position).toBeLessThan(1);
  });

  it("dragging the first item to the bottom puts it last", () => {
    const { list, position } = reorder(items, 0, 3);
    expect(list.map((i) => i.id)).toEqual(["b", "c", "d", "a"]);
    expect(position).toBeGreaterThan(4);
  });

  it("dropping between two items places it between them", () => {
    const { list, position } = reorder(items, 0, 2);
    expect(list.map((i) => i.id)).toEqual(["b", "c", "a", "d"]);
    expect(position).toBe(3.5);
  });

  it("the new order stays sorted by position", () => {
    const { list } = reorder(items, 2, 0);
    const positions = list.map((i) => i.sort_order);
    expect([...positions].sort((x, y) => x - y)).toEqual(positions);
  });

  it("handles a single item", () => {
    expect(positionBetween()).toBe(0);
  });
});
