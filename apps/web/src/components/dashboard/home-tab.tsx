import { api } from "@postcrons/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelativeTime(timestamp: number) {
  const now = Date.now();
  const diff = timestamp - now;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (diff < 0) return "Past due";
  if (minutes < 60) return `in ${minutes} min`;
  if (hours < 24) return `in ${hours}h`;
  return `in ${days}d`;
}

export function HomeTab() {
  const stats = useQuery(api.workspace.getStats);
  const upcomingPosts = useQuery(api.workspace.getUpcomingPosts);
  const recentActivity = useQuery(api.workspace.getRecentActivity);

  if (stats === undefined) {
    return <HomeTabSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card size="sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total Posts</CardTitle>
            <Calendar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPosts ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              All time posts created
            </p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Scheduled</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.scheduledPosts ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Pending publication
            </p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Published</CardTitle>
            <CheckCircle2 className="size-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.publishedPosts ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Successfully posted
            </p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Media Files</CardTitle>
            <ImageIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalMedia ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Images & videos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Posts</CardTitle>
            <CardDescription>
              Posts scheduled for the near future
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingPosts === undefined ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : upcomingPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="size-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No upcoming posts scheduled
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingPosts.map((post) => (
                  <div
                    key={post._id}
                    className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{post.content}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(post.scheduledAt)}
                        </span>
                        <div className="flex gap-1">
                          {post.platforms.map((platform) => (
                            <Badge key={platform} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {platform}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {formatRelativeTime(post.scheduledAt)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest published and failed posts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity === undefined ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="size-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No recent activity
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((post) => (
                  <div
                    key={post._id}
                    className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{post.content}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(post.publishedAt ?? post.updatedAt)}
                        </span>
                        <div className="flex gap-1">
                          {post.platforms.map((platform) => (
                            <Badge key={platform} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {platform}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    {post.status === "published" ? (
                      <Badge variant="success" className="shrink-0">
                        <CheckCircle2 className="size-3 mr-1" />
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="shrink-0">
                        <XCircle className="size-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {stats?.failedPosts > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="size-4" />
              Failed Posts
            </CardTitle>
            <CardDescription>
              {stats.failedPosts} post(s) failed to publish. Check the Calendar tab for details.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}

function HomeTabSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} size="sm">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <Skeleton key={j} className="h-14" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
