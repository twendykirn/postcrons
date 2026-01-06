import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// File size limits (in bytes)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveMedia = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.union(v.literal("image"), v.literal("video")),
    mimeType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Validate file size
    if (args.fileType === "image" && args.size > MAX_IMAGE_SIZE) {
      throw new Error(`Image size exceeds limit of ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
    }
    if (args.fileType === "video" && args.size > MAX_VIDEO_SIZE) {
      throw new Error(`Video size exceeds limit of ${MAX_VIDEO_SIZE / 1024 / 1024}MB`);
    }

    const url = await ctx.storage.getUrl(args.storageId);

    const mediaId = await ctx.db.insert("media", {
      userId: identity.subject,
      storageId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      mimeType: args.mimeType,
      size: args.size,
      url: url ?? undefined,
      uploadedAt: Date.now(),
    });

    // Update workspace stats
    await updateMediaStats(ctx, identity.subject);

    return mediaId;
  },
});

export const deleteMedia = mutation({
  args: {
    mediaId: v.id("media"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const media = await ctx.db.get(args.mediaId);
    if (!media) {
      throw new Error("Media not found");
    }

    if (media.userId !== identity.subject) {
      throw new Error("Unauthorized to delete this media");
    }

    // Check if media is used in any scheduled posts
    const postsUsingMedia = await ctx.db
      .query("scheduledPosts")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "published"),
          q.neq(q.field("status"), "failed")
        )
      )
      .collect();

    const isUsed = postsUsingMedia.some((post) =>
      post.mediaIds.includes(args.mediaId)
    );

    if (isUsed) {
      throw new Error("Cannot delete media that is used in scheduled posts");
    }

    // Delete from storage
    await ctx.storage.delete(media.storageId);

    // Delete from database
    await ctx.db.delete(args.mediaId);

    // Update workspace stats
    await updateMediaStats(ctx, identity.subject);
  },
});

export const listMedia = query({
  args: {
    fileType: v.optional(v.union(v.literal("image"), v.literal("video"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    let mediaQuery;
    if (args.fileType) {
      mediaQuery = ctx.db
        .query("media")
        .withIndex("by_type", (q) =>
          q.eq("userId", identity.subject).eq("fileType", args.fileType!)
        );
    } else {
      mediaQuery = ctx.db
        .query("media")
        .withIndex("by_user", (q) => q.eq("userId", identity.subject));
    }

    const media = await mediaQuery.order("desc").collect();

    // Get fresh URLs for all media
    const mediaWithUrls = await Promise.all(
      media.map(async (item) => {
        const url = await ctx.storage.getUrl(item.storageId);
        return { ...item, url: url ?? undefined };
      })
    );

    return mediaWithUrls;
  },
});

export const getMedia = query({
  args: {
    mediaId: v.id("media"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const media = await ctx.db.get(args.mediaId);
    if (!media || media.userId !== identity.subject) {
      return null;
    }

    const url = await ctx.storage.getUrl(media.storageId);
    return { ...media, url: url ?? undefined };
  },
});

async function updateMediaStats(
  ctx: { db: any },
  userId: string
) {
  const totalMedia = await ctx.db
    .query("media")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();

  const existingStats = await ctx.db
    .query("workspaceStats")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  if (existingStats) {
    await ctx.db.patch(existingStats._id, {
      totalMedia: totalMedia.length,
      lastUpdated: Date.now(),
    });
  } else {
    await ctx.db.insert("workspaceStats", {
      userId,
      totalPosts: 0,
      publishedPosts: 0,
      failedPosts: 0,
      scheduledPosts: 0,
      totalMedia: totalMedia.length,
      lastUpdated: Date.now(),
    });
  }
}
