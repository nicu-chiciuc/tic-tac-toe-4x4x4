import { describe, expect, it } from "vitest";
import { cellIndex, findWinningLine, WINNING_LINES } from "./gameLogic";

describe("4×4×4 winning lines", () => {
  it("enumerates all 76 unique lines", () => {
    expect(WINNING_LINES).toHaveLength(76);
    expect(
      new Set(WINNING_LINES.map((line) => [...line].sort((a, b) => a - b).join(","))).size,
    ).toBe(76);
  });

  it("finds a space diagonal", () => {
    const diagonal = [0, 1, 2, 3].map((value) => cellIndex(value, value, value));
    const board = new Map(diagonal.map((cell) => [cell, "X" as const]));
    expect(findWinningLine(board, "X")).toEqual(diagonal);
  });

  it("does not award an incomplete line", () => {
    const board = new Map([
      [0, "O" as const],
      [1, "O" as const],
      [2, "O" as const],
    ]);
    expect(findWinningLine(board, "O")).toBeNull();
  });
});
