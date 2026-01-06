import { query } from "./_generated/server";

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const stats = await ctx.db
      .query("workspaceStats")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    if (!stats) {
      return {
        totalPosts: 0,
        publishedPosts: 0,
        failedPosts: 0,
        scheduledPosts: 0,
        totalMedia: 0,
        lastUpdated: Date.now(),
      };
    }

    return {
      totalPosts: stats.totalPosts,
      publishedPosts: stats.publishedPosts,
      failedPosts: stats.failedPosts,
      scheduledPosts: stats.scheduledPosts,
      totalMedia: stats.totalMedia,
      lastUpdated: stats.lastUpdated,
    };
  },
});

export const getUpcomingPosts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const now = Date.now();
    const posts = await ctx.db
      .query("scheduledPosts")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", identity.subject).eq("status", "scheduled")
      )
      .filter((q) => q.gte(q.field("scheduledAt"), now))
      .take(5);

    // Sort by scheduledAt
    return posts.sort((a, b) => a.scheduledAt - b.scheduledAt);
  },
});

export const getRecentActivity = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Get recent posts (published or failed)
    const recentPosts = await ctx.db
      .query("scheduledPosts")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(10);

    return recentPosts.filter(
      (post) => post.status === "published" || post.status === "failed"
    );
  },
});
