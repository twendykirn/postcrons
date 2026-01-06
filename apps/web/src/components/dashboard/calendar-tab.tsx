import { api } from "@postcrons/backend/convex/_generated/api";
import type { Id } from "@postcrons/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  Image as ImageIcon,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type Platform = "twitter" | "linkedin" | "bluesky" | "threads";

type Post = {
  _id: Id<"scheduledPosts">;
  content: string;
  mediaIds: Id<"media">[];
  platforms: Platform[];
  scheduledAt: number;
  status: "scheduled" | "publishing" | "published" | "failed";
  error?: string;
  createdAt: number;
  updatedAt: number;
};

type MediaItem = {
  _id: Id<"media">;
  fileName: string;
  fileType: "image" | "video";
  url?: string;
  size: number;
};

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "twitter", label: "Twitter/X" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "bluesky", label: "Bluesky" },
  { id: "threads", label: "Threads" },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  // Add padding for start of month
  for (let i = 0; i < firstDay.getDay(); i++) {
    const day = new Date(year, month, -i);
    days.unshift(day);
  }

  // Add all days of month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  // Add padding for end of month
  const remaining = 42 - days.length; // 6 rows of 7 days
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function CalendarTab() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);

  // Calculate date range for current month view
  const dateRange = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    // Include padding days
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    return {
      startDate: startDate.getTime(),
      endDate: endDate.getTime() + 86400000, // Include full last day
    };
  }, [currentMonth, currentYear]);

  const posts = useQuery(api.posts.getPostsForDateRange, dateRange);

  const days = useMemo(
    () => getMonthDays(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  const postsByDay = useMemo(() => {
    const map = new Map<string, Post[]>();
    if (!posts) return map;

    for (const post of posts) {
      const date = new Date(post.scheduledAt);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const existing = map.get(key) || [];
      existing.push(post as Post);
      map.set(key, existing);
    }

    // Sort posts by time within each day
    for (const [key, dayPosts] of map) {
      dayPosts.sort((a, b) => a.scheduledAt - b.scheduledAt);
    }

    return map;
  }, [posts]);

  const navigateMonth = (delta: number) => {
    let newMonth = currentMonth + delta;
    let newYear = currentYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }

    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(today);
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
  };

  const handleCreatePost = () => {
    if (!selectedDate) {
      setSelectedDate(today);
    }
    setIsCreateDialogOpen(true);
  };

  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setIsEditDialogOpen(true);
  };

  const handleDeletePost = (post: Post) => {
    setPostToDelete(post);
    setIsDeleteDialogOpen(true);
  };

  const selectedDayPosts = useMemo(() => {
    if (!selectedDate) return [];
    const key = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;
    return postsByDay.get(key) || [];
  }, [selectedDate, postsByDay]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Calendar Grid */}
      <Card className="flex-1 min-w-0">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon-sm" onClick={() => navigateMonth(-1)}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => navigateMonth(1)}>
                <ChevronRight className="size-4" />
              </Button>
              <CardTitle className="text-sm">
                {MONTHS[currentMonth]} {currentYear}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button size="sm" onClick={handleCreatePost}>
                <Plus className="size-3 mr-1" />
                New Post
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px mb-1">
            {DAYS.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-border">
            {days.map((day, index) => {
              const isCurrentMonth = day.getMonth() === currentMonth;
              const isToday = isSameDay(day, today);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
              const dayPosts = postsByDay.get(key) || [];
              const scheduledCount = dayPosts.filter((p) => p.status === "scheduled").length;
              const publishedCount = dayPosts.filter((p) => p.status === "published").length;
              const failedCount = dayPosts.filter((p) => p.status === "failed").length;

              return (
                <button
                  key={index}
                  onClick={() => handleDayClick(day)}
                  className={`
                    relative min-h-[70px] sm:min-h-[80px] md:min-h-[100px] p-1 sm:p-1.5 text-left bg-background transition-colors
                    hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-ring focus:ring-inset
                    ${!isCurrentMonth ? "opacity-40" : ""}
                    ${isSelected ? "ring-2 ring-primary ring-inset" : ""}
                  `}
                >
                  <span
                    className={`
                      inline-flex items-center justify-center size-6 sm:size-7 text-xs sm:text-sm
                      ${isToday ? "bg-primary text-primary-foreground rounded-full" : ""}
                    `}
                  >
                    {day.getDate()}
                  </span>

                  {/* Post indicators */}
                  <div className="absolute bottom-1 left-1 right-1 flex flex-wrap gap-0.5">
                    {scheduledCount > 0 && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                        <Clock className="size-2 mr-0.5" />
                        {scheduledCount}
                      </Badge>
                    )}
                    {publishedCount > 0 && (
                      <Badge variant="success" className="text-[9px] px-1 py-0 h-4">
                        <CheckCircle2 className="size-2 mr-0.5" />
                        {publishedCount}
                      </Badge>
                    )}
                    {failedCount > 0 && (
                      <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                        <XCircle className="size-2 mr-0.5" />
                        {failedCount}
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day Details Panel */}
      <Card className="w-full lg:w-80 xl:w-96 shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarIcon className="size-4" />
            {selectedDate
              ? selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })
              : "Select a day"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!selectedDate ? (
            <p className="text-xs text-muted-foreground py-8 text-center">
              Click on a day to see scheduled posts
            </p>
          ) : selectedDayPosts.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-muted-foreground mb-4">
                No posts scheduled for this day
              </p>
              <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="size-3 mr-1" />
                Schedule Post
              </Button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {selectedDayPosts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  onEdit={() => handleEditPost(post)}
                  onDelete={() => handleDeletePost(post)}
                />
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="size-3 mr-1" />
                Add Another Post
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Post Dialog */}
      <PostDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        initialDate={selectedDate || today}
      />

      {/* Edit Post Dialog */}
      <PostDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        post={editingPost}
        initialDate={editingPost ? new Date(editingPost.scheduledAt) : today}
      />

      {/* Delete Confirmation Dialog */}
      <DeletePostDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        post={postToDelete}
      />
    </div>
  );
}

function PostCard({
  post,
  onEdit,
  onDelete,
}: {
  post: Post;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const scheduledDate = new Date(post.scheduledAt);
  const isPast = post.status === "scheduled" && scheduledDate.getTime() < Date.now();

  return (
    <div className="border p-2 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Clock className="size-3 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium">
            {formatTime(scheduledDate)}
          </span>
          {post.status === "scheduled" ? (
            isPast ? (
              <Badge variant="warning" className="text-[9px]">Pending</Badge>
            ) : (
              <Badge variant="outline" className="text-[9px]">Scheduled</Badge>
            )
          ) : post.status === "publishing" ? (
            <Badge variant="secondary" className="text-[9px]">
              <Loader2 className="size-2 mr-0.5 animate-spin" />
              Publishing
            </Badge>
          ) : post.status === "published" ? (
            <Badge variant="success" className="text-[9px]">Published</Badge>
          ) : (
            <Badge variant="destructive" className="text-[9px]">Failed</Badge>
          )}
        </div>
        {post.status === "scheduled" && (
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon-xs" onClick={onEdit}>
              <Edit2 className="size-3" />
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={onDelete}>
              <Trash2 className="size-3" />
            </Button>
          </div>
        )}
      </div>

      <p className="text-xs line-clamp-3">{post.content}</p>

      {post.mediaIds.length > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <ImageIcon className="size-3" />
          {post.mediaIds.length} media
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {post.platforms.map((platform) => (
          <Badge key={platform} variant="secondary" className="text-[9px] px-1 py-0">
            {platform}
          </Badge>
        ))}
      </div>

      {post.status === "failed" && post.error && (
        <p className="text-[10px] text-destructive line-clamp-2">{post.error}</p>
      )}
    </div>
  );
}

function PostDialog({
  open,
  onOpenChange,
  post,
  initialDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: Post | null;
  initialDate: Date;
}) {
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [selectedMediaIds, setSelectedMediaIds] = useState<Id<"media">[]>([]);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const media = useQuery(api.media.listMedia, {});
  const schedulePost = useMutation(api.posts.schedulePost);
  const updatePost = useMutation(api.posts.updatePost);

  // Initialize form when dialog opens
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (newOpen) {
        if (post) {
          setContent(post.content);
          setSelectedPlatforms(post.platforms);
          setSelectedMediaIds(post.mediaIds);
          const date = new Date(post.scheduledAt);
          setScheduledDate(date.toISOString().split("T")[0]);
          setScheduledTime(
            date.toTimeString().split(":").slice(0, 2).join(":")
          );
        } else {
          setContent("");
          setSelectedPlatforms([]);
          setSelectedMediaIds([]);
          setScheduledDate(initialDate.toISOString().split("T")[0]);
          // Default to next hour
          const nextHour = new Date();
          nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
          setScheduledTime(
            nextHour.toTimeString().split(":").slice(0, 2).join(":")
          );
        }
      }
      setShowMediaPicker(false);
      onOpenChange(newOpen);
    },
    [post, initialDate, onOpenChange]
  );

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const toggleMedia = (mediaId: Id<"media">) => {
    setSelectedMediaIds((prev) =>
      prev.includes(mediaId)
        ? prev.filter((id) => id !== mediaId)
        : [...prev, mediaId]
    );
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Please enter post content");
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform");
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      toast.error("Please select a date and time");
      return;
    }

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).getTime();

    if (scheduledAt <= Date.now()) {
      toast.error("Scheduled time must be in the future");
      return;
    }

    setIsSubmitting(true);

    try {
      if (post) {
        await updatePost({
          postId: post._id,
          content,
          mediaIds: selectedMediaIds,
          platforms: selectedPlatforms,
          scheduledAt,
        });
        toast.success("Post updated");
      } else {
        await schedulePost({
          content,
          mediaIds: selectedMediaIds,
          platforms: selectedPlatforms,
          scheduledAt,
        });
        toast.success("Post scheduled");
      }
      handleOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save post"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{post ? "Edit Post" : "Schedule New Post"}</DialogTitle>
          <DialogDescription>
            {post
              ? "Update your scheduled post"
              : "Create a new post to be published at a scheduled time"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What do you want to share?"
              className="min-h-[120px]"
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {content.length} / 5000
            </p>
          </div>

          {/* Platforms */}
          <div className="space-y-2">
            <Label>Platforms</Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => (
                <label
                  key={platform.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedPlatforms.includes(platform.id)}
                    onCheckedChange={() => togglePlatform(platform.id)}
                  />
                  <span className="text-xs">{platform.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>

          {/* Media */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Media ({selectedMediaIds.length} selected)</Label>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setShowMediaPicker(!showMediaPicker)}
              >
                {showMediaPicker ? "Hide" : "Select Media"}
              </Button>
            </div>

            {showMediaPicker && (
              <div className="border p-2 max-h-48 overflow-y-auto">
                {media === undefined ? (
                  <div className="grid grid-cols-4 gap-2">
                    {[...Array(8)].map((_, i) => (
                      <Skeleton key={i} className="aspect-square" />
                    ))}
                  </div>
                ) : media.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No media available. Upload media in the Media tab.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {media.map((item) => (
                      <button
                        key={item._id}
                        type="button"
                        onClick={() => toggleMedia(item._id)}
                        className={`
                          relative aspect-square bg-muted overflow-hidden
                          ${selectedMediaIds.includes(item._id) ? "ring-2 ring-primary" : ""}
                        `}
                      >
                        {item.fileType === "image" && item.url ? (
                          <img
                            src={item.url}
                            alt={item.fileName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="size-4 text-muted-foreground" />
                          </div>
                        )}
                        {selectedMediaIds.includes(item._id) && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <CheckCircle2 className="size-4 text-primary" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedMediaIds.length > 0 && !showMediaPicker && (
              <div className="flex flex-wrap gap-1">
                {selectedMediaIds.map((id) => {
                  const item = media?.find((m) => m._id === id);
                  return (
                    <Badge key={id} variant="secondary" className="text-[10px]">
                      {item?.fileName || "Media"}
                      <button
                        type="button"
                        onClick={() => toggleMedia(id)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="size-2" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : null}
            {post ? "Update Post" : "Schedule Post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeletePostDialog({
  open,
  onOpenChange,
  post,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: Post | null;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deletePost = useMutation(api.posts.deletePost);

  const handleDelete = async () => {
    if (!post) return;

    setIsDeleting(true);
    try {
      await deletePost({ postId: post._id });
      toast.success("Post deleted");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete post"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Post</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this scheduled post? This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
