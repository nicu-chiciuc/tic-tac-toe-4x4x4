import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  guestNames: defineTable({
    name: v.string(),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_user", ["userId"]),
  games: defineTable({
    code: v.string(),
    status: v.union(
      v.literal("waiting"),
      v.literal("playing"),
      v.literal("won"),
      v.literal("draw"),
    ),
    playerX: v.optional(v.id("users")),
    playerO: v.optional(v.id("users")),
    playerXName: v.optional(v.string()),
    playerOName: v.optional(v.string()),
    turn: v.union(v.literal("X"), v.literal("O")),
    winner: v.optional(v.union(v.literal("X"), v.literal("O"))),
    winningCells: v.optional(v.array(v.number())),
    moveCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_code", ["code"]),
  moves: defineTable({
    gameId: v.id("games"),
    cell: v.number(),
    mark: v.union(v.literal("X"), v.literal("O")),
    playerId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_gameId", ["gameId"])
    .index("by_gameId_and_cell", ["gameId", "cell"]),
});
