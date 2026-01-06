import { v } from "convex/values";
import { mutation, query, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

const platformValidator = v.union(
  v.literal("twitter"),
  v.literal("linkedin"),
  v.literal("bluesky"),
  v.literal("threads")
);

export const schedulePost = mutation({
  args: {
    content: v.string(),
    mediaIds: v.array(v.id("media")),
    platforms: v.array(platformValidator),
    scheduledAt: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Validate scheduled time is in the future
    if (args.scheduledAt <= Date.now()) {
      throw new Error("Scheduled time must be in the future");
    }

    // Validate content length
    if (args.content.length === 0) {
      throw new Error("Post content cannot be empty");
    }

    if (args.content.length > 5000) {
      throw new Error("Post content exceeds maximum length");
    }

    // Validate platforms
    if (args.platforms.length === 0) {
      throw new Error("At least one platform must be selected");
    }

    // Validate media ownership
    for (const mediaId of args.mediaIds) {
      const media = await ctx.db.get(mediaId);
      if (!media || media.userId !== identity.subject) {
        throw new Error("Invalid media reference");
      }
    }

    const now = Date.now();
    const postId = await ctx.db.insert("scheduledPosts", {
      userId: identity.subject,
      content: args.content,
      mediaIds: args.mediaIds,
      platforms: args.platforms,
      scheduledAt: args.scheduledAt,
      status: "scheduled",
      createdAt: now,
      updatedAt: now,
    });

    // Schedule the Convex function to publish at the scheduled time
    const delay = args.scheduledAt - now;
    const scheduledFunctionId = await ctx.scheduler.runAfter(
      delay,
      internal.posts.publishPost,
      { postId }
    );

    // Store the scheduled function ID for potential cancellation
    await ctx.db.patch(postId, {
      convexScheduledId: scheduledFunctionId,
    });

    // Update workspace stats
    await updatePostStats(ctx, identity.subject);

    return postId;
  },
});

export const updatePost = mutation({
  args: {
    postId: v.id("scheduledPosts"),
    content: v.optional(v.string()),
    mediaIds: v.optional(v.array(v.id("media"))),
    platforms: v.optional(v.array(platformValidator)),
    scheduledAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    if (post.userId !== identity.subject) {
      throw new Error("Unauthorized to update this post");
    }

    if (post.status !== "scheduled") {
      throw new Error("Can only update scheduled posts");
    }

    // Validate content if provided
    if (args.content !== undefined) {
      if (args.content.length === 0) {
        throw new Error("Post content cannot be empty");
      }
      if (args.content.length > 5000) {
        throw new Error("Post content exceeds maximum length");
      }
    }

    // Validate platforms if provided
    if (args.platforms !== undefined && args.platforms.length === 0) {
      throw new Error("At least one platform must be selected");
    }

    // Validate media ownership if provided
    if (args.mediaIds !== undefined) {
      for (const mediaId of args.mediaIds) {
        const media = await ctx.db.get(mediaId);
        if (!media || media.userId !== identity.subject) {
          throw new Error("Invalid media reference");
        }
      }
    }

    // If scheduled time is being updated, reschedule
    if (args.scheduledAt !== undefined) {
      if (args.scheduledAt <= Date.now()) {
        throw new Error("Scheduled time must be in the future");
      }

      // Cancel the old scheduled function
      if (post.convexScheduledId) {
        await ctx.scheduler.cancel(post.convexScheduledId);
      }

      // Schedule new function
      const delay = args.scheduledAt - Date.now();
      const scheduledFunctionId = await ctx.scheduler.runAfter(
        delay,
        internal.posts.publishPost,
        { postId: args.postId }
      );

      await ctx.db.patch(args.postId, {
        ...(args.content !== undefined && { content: args.content }),
        ...(args.mediaIds !== undefined && { mediaIds: args.mediaIds }),
        ...(args.platforms !== undefined && { platforms: args.platforms }),
        scheduledAt: args.scheduledAt,
        convexScheduledId: scheduledFunctionId,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(args.postId, {
        ...(args.content !== undefined && { content: args.content }),
        ...(args.mediaIds !== undefined && { mediaIds: args.mediaIds }),
        ...(args.platforms !== undefined && { platforms: args.platforms }),
        updatedAt: Date.now(),
      });
    }

    return args.postId;
  },
});

export const deletePost = mutation({
  args: {
    postId: v.id("scheduledPosts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    if (post.userId !== identity.subject) {
      throw new Error("Unauthorized to delete this post");
    }

    // Cancel scheduled function if still pending
    if (post.status === "scheduled" && post.convexScheduledId) {
      await ctx.scheduler.cancel(post.convexScheduledId);
    }

    await ctx.db.delete(args.postId);

    // Update workspace stats
    await updatePostStats(ctx, identity.subject);
  },
});

export const listPosts = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("scheduled"),
        v.literal("publishing"),
        v.literal("published"),
        v.literal("failed")
      )
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    let posts;
    if (args.status) {
      posts = await ctx.db
        .query("scheduledPosts")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", identity.subject).eq("status", args.status!)
        )
        .order("desc")
        .collect();
    } else {
      posts = await ctx.db
        .query("scheduledPosts")
        .withIndex("by_user", (q) => q.eq("userId", identity.subject))
        .order("desc")
        .collect();
    }

    return posts;
  },
});

export const getPostsForDateRange = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const posts = await ctx.db
      .query("scheduledPosts")
      .withIndex("by_user_scheduled", (q) =>
        q
          .eq("userId", identity.subject)
          .gte("scheduledAt", args.startDate)
          .lte("scheduledAt", args.endDate)
      )
      .collect();

    return posts;
  },
});

export const getPost = query({
  args: {
    postId: v.id("scheduledPosts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const post = await ctx.db.get(args.postId);
    if (!post || post.userId !== identity.subject) {
      return null;
    }

    // Get media details
    const mediaDetails = await Promise.all(
      post.mediaIds.map(async (mediaId) => {
        const media = await ctx.db.get(mediaId);
        if (media) {
          const url = await ctx.storage.getUrl(media.storageId);
          return { ...media, url: url ?? undefined };
        }
        return null;
      })
    );

    return {
      ...post,
      media: mediaDetails.filter(Boolean),
    };
  },
});

// Internal mutation to update post status
export const updatePostStatus = internalMutation({
  args: {
    postId: v.id("scheduledPosts"),
    status: v.union(
      v.literal("scheduled"),
      v.literal("publishing"),
      v.literal("published"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      return;
    }

    await ctx.db.patch(args.postId, {
      status: args.status,
      ...(args.error !== undefined && { error: args.error }),
      ...(args.publishedAt !== undefined && { publishedAt: args.publishedAt }),
      updatedAt: Date.now(),
    });

    // Update workspace stats
    await updatePostStats(ctx, post.userId);
  },
});

// Internal action to publish the post using post-for-me
export const publishPost = internalAction({
  args: {
    postId: v.id("scheduledPosts"),
  },
  handler: async (ctx, args) => {
    // Update status to publishing
    await ctx.runMutation(internal.posts.updatePostStatus, {
      postId: args.postId,
      status: "publishing",
    });

    try {
      // Get post details
      const post = await ctx.runQuery(internal.posts.getPostInternal, {
        postId: args.postId,
      });

      if (!post) {
        throw new Error("Post not found");
      }

      // Get media URLs
      const mediaUrls: string[] = [];
      for (const mediaId of post.mediaIds) {
        const media = await ctx.runQuery(internal.posts.getMediaInternal, {
          mediaId,
        });
        if (media?.url) {
          mediaUrls.push(media.url);
        }
      }

      // Use post-for-me package to publish
      // Note: post-for-me provides a simple API for posting to social platforms
      const { post: postToSocial } = await import("post-for-me");

      const results = await Promise.allSettled(
        post.platforms.map((platform) =>
          postToSocial({
            platform,
            content: post.content,
            media: mediaUrls,
          })
        )
      );

      // Check if all succeeded
      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length > 0) {
        const errorMessages = failures
          .map((f) => (f as PromiseRejectedResult).reason?.message || "Unknown error")
          .join("; ");
        throw new Error(`Failed to post to some platforms: ${errorMessages}`);
      }

      // Update status to published
      await ctx.runMutation(internal.posts.updatePostStatus, {
        postId: args.postId,
        status: "published",
        publishedAt: Date.now(),
      });
    } catch (error) {
      // Update status to failed
      await ctx.runMutation(internal.posts.updatePostStatus, {
        postId: args.postId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

// Internal queries for use by internal actions
export const getPostInternal = internalQuery({
  args: {
    postId: v.id("scheduledPosts"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.postId);
  },
});

export const getMediaInternal = internalQuery({
  args: {
    mediaId: v.id("media"),
  },
  handler: async (ctx, args) => {
    const media = await ctx.db.get(args.mediaId);
    if (!media) return null;
    const url = await ctx.storage.getUrl(media.storageId);
    return { ...media, url: url ?? undefined };
  },
});

async function updatePostStats(ctx: { db: any }, userId: string) {
  const allPosts = await ctx.db
    .query("scheduledPosts")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();

  const scheduledCount = allPosts.filter((p: any) => p.status === "scheduled").length;
  const publishedCount = allPosts.filter((p: any) => p.status === "published").length;
  const failedCount = allPosts.filter((p: any) => p.status === "failed").length;

  const existingStats = await ctx.db
    .query("workspaceStats")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  if (existingStats) {
    await ctx.db.patch(existingStats._id, {
      totalPosts: allPosts.length,
      publishedPosts: publishedCount,
      failedPosts: failedCount,
      scheduledPosts: scheduledCount,
      lastUpdated: Date.now(),
    });
  } else {
    await ctx.db.insert("workspaceStats", {
      userId,
      totalPosts: allPosts.length,
      publishedPosts: publishedCount,
      failedPosts: failedCount,
      scheduledPosts: scheduledCount,
      totalMedia: 0,
      lastUpdated: Date.now(),
    });
  }
}
