import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { findWinningLine, type Mark } from "./gameLogic";

const codeValidator = v.string();
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

async function requiredUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Guest session is still starting");
  return userId;
}

async function userName(
  ctx: QueryCtx | MutationCtx,
  userId: Awaited<ReturnType<typeof requiredUserId>>,
) {
  const user = await ctx.db.get(userId);
  return user?.name ?? "Guest";
}

function roomCode() {
  return Array.from(
    { length: 6 },
    () => ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)],
  ).join("");
}

export const create = mutation({
  args: {},
  returns: v.object({ code: v.string() }),
  handler: async (ctx) => {
    const userId = await requiredUserId(ctx);
    let code = roomCode();
    while (
      await ctx.db
        .query("games")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique()
    )
      code = roomCode();
    const now = Date.now();
    await ctx.db.insert("games", {
      code,
      status: "waiting",
      playerX: userId,
      playerXName: await userName(ctx, userId),
      turn: "X",
      moveCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    return { code };
  },
});

export const get = query({
  args: { code: codeValidator },
  handler: async (ctx, { code }) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_code", (q) => q.eq("code", code.toUpperCase()))
      .unique();
    if (!game) return null;
    const moves = await ctx.db
      .query("moves")
      .withIndex("by_gameId", (q) => q.eq("gameId", game._id))
      .take(64);
    const viewerId = await getAuthUserId(ctx);
    const viewerMark = viewerId === game.playerX ? "X" : viewerId === game.playerO ? "O" : null;
    return {
      code: game.code,
      status: game.status,
      turn: game.turn,
      winner: game.winner ?? null,
      winningCells: game.winningCells ?? [],
      playerXName: game.playerXName ?? null,
      playerOName: game.playerOName ?? null,
      viewerMark,
      canJoin: Boolean(
        viewerId && !game.playerO && viewerId !== game.playerX && game.status === "waiting",
      ),
      moves: moves.map(({ cell, mark }) => ({ cell, mark })),
    };
  },
});

export const join = mutation({
  args: { code: codeValidator },
  returns: v.null(),
  handler: async (ctx, { code }) => {
    const userId = await requiredUserId(ctx);
    const game = await ctx.db
      .query("games")
      .withIndex("by_code", (q) => q.eq("code", code.toUpperCase()))
      .unique();
    if (!game) throw new Error("Room not found");
    if (game.playerX === userId || game.playerO === userId) return null;
    if (game.playerO || game.status !== "waiting") throw new Error("Both seats are taken");
    await ctx.db.patch(game._id, {
      playerO: userId,
      playerOName: await userName(ctx, userId),
      status: "playing",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const play = mutation({
  args: { code: codeValidator, skewer: v.number() },
  returns: v.null(),
  handler: async (ctx, { code, skewer }) => {
    if (!Number.isInteger(skewer) || skewer < 0 || skewer >= 16) throw new Error("Invalid skewer");
    const userId = await requiredUserId(ctx);
    const game = await ctx.db
      .query("games")
      .withIndex("by_code", (q) => q.eq("code", code.toUpperCase()))
      .unique();
    if (!game || game.status !== "playing") throw new Error("This game is not active");
    const mark: Mark | null = game.playerX === userId ? "X" : game.playerO === userId ? "O" : null;
    if (!mark) throw new Error("Spectators cannot place pieces");
    if (game.turn !== mark) throw new Error("Wait for your turn");
    const existingMoves = await ctx.db
      .query("moves")
      .withIndex("by_gameId", (q) => q.eq("gameId", game._id))
      .take(64);
    const occupiedCells = new Set(existingMoves.map((move) => move.cell));
    const cell = [0, 1, 2, 3]
      .map((z) => z * 16 + skewer)
      .find((candidate) => !occupiedCells.has(candidate));
    if (cell === undefined) throw new Error("That skewer is full");
    await ctx.db.insert("moves", {
      gameId: game._id,
      cell,
      mark,
      playerId: userId,
      createdAt: Date.now(),
    });
    const board = new Map(existingMoves.map((move) => [move.cell, move.mark]));
    board.set(cell, mark);
    const winningCells = findWinningLine(board, mark);
    const moveCount = game.moveCount + 1;
    await ctx.db.patch(
      game._id,
      winningCells
        ? { status: "won", winner: mark, winningCells, moveCount, updatedAt: Date.now() }
        : moveCount === 64
          ? { status: "draw", moveCount, updatedAt: Date.now() }
          : { turn: mark === "X" ? "O" : "X", moveCount, updatedAt: Date.now() },
    );
    return null;
  },
});

export const restart = mutation({
  args: { code: codeValidator },
  returns: v.null(),
  handler: async (ctx, { code }) => {
    const userId = await requiredUserId(ctx);
    const game = await ctx.db
      .query("games")
      .withIndex("by_code", (q) => q.eq("code", code.toUpperCase()))
      .unique();
    if (!game || (game.playerX !== userId && game.playerO !== userId))
      throw new Error("Only players can restart");
    const moves = await ctx.db
      .query("moves")
      .withIndex("by_gameId", (q) => q.eq("gameId", game._id))
      .take(64);
    for (const move of moves) await ctx.db.delete(move._id);
    await ctx.db.patch(game._id, {
      status: game.playerO ? "playing" : "waiting",
      turn: "X",
      winner: undefined,
      winningCells: undefined,
      moveCount: 0,
      updatedAt: Date.now(),
    });
    return null;
  },
});
