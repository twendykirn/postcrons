import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  media: defineTable({
    userId: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.union(v.literal("image"), v.literal("video")),
    mimeType: v.string(),
    size: v.number(),
    url: v.optional(v.string()),
    uploadedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_type", ["userId", "fileType"]),

  scheduledPosts: defineTable({
    userId: v.string(),
    content: v.string(),
    mediaIds: v.array(v.id("media")),
    platforms: v.array(
      v.union(
        v.literal("twitter"),
        v.literal("linkedin"),
        v.literal("bluesky"),
        v.literal("threads")
      )
    ),
    scheduledAt: v.number(),
    status: v.union(
      v.literal("scheduled"),
      v.literal("publishing"),
      v.literal("published"),
      v.literal("failed")
    ),
    publishedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    convexScheduledId: v.optional(v.id("_scheduled_functions")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_scheduled", ["userId", "scheduledAt"])
    .index("by_status", ["status"]),

  workspaceStats: defineTable({
    userId: v.string(),
    totalPosts: v.number(),
    publishedPosts: v.number(),
    failedPosts: v.number(),
    scheduledPosts: v.number(),
    totalMedia: v.number(),
    lastUpdated: v.number(),
  }).index("by_user", ["userId"]),
});
