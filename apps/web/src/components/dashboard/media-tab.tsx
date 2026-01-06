import { api } from "@postcrons/backend/convex/_generated/api";
import type { Id } from "@postcrons/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  Film,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState, useCallback } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type MediaItem = {
  _id: Id<"media">;
  fileName: string;
  fileType: "image" | "video";
  mimeType: string;
  size: number;
  url?: string;
  uploadedAt: number;
};

export function MediaTab() {
  const [filter, setFilter] = useState<"all" | "image" | "video">("all");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<MediaItem | null>(null);
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const media = useQuery(api.media.listMedia, {
    fileType: filter === "all" ? undefined : filter,
  });

  const generateUploadUrl = useMutation(api.media.generateUploadUrl);
  const saveMedia = useMutation(api.media.saveMedia);
  const deleteMedia = useMutation(api.media.deleteMedia);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setIsUploading(true);
      setUploadProgress("");

      const uploadedCount = { success: 0, failed: 0 };

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`Uploading ${i + 1} of ${files.length}: ${file.name}`);

        // Validate file type
        const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
        const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type);

        if (!isImage && !isVideo) {
          toast.error(`Unsupported file type: ${file.name}`);
          uploadedCount.failed++;
          continue;
        }

        // Validate file size
        const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
        if (file.size > maxSize) {
          toast.error(
            `${file.name} exceeds the ${isImage ? "10MB" : "100MB"} limit`
          );
          uploadedCount.failed++;
          continue;
        }

        try {
          // Get upload URL
          const uploadUrl = await generateUploadUrl();

          // Upload to Convex storage
          const response = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });

          if (!response.ok) {
            throw new Error("Upload failed");
          }

          const { storageId } = await response.json();

          // Save media record
          await saveMedia({
            storageId,
            fileName: file.name,
            fileType: isImage ? "image" : "video",
            mimeType: file.type,
            size: file.size,
          });

          uploadedCount.success++;
        } catch (error) {
          console.error("Upload error:", error);
          toast.error(`Failed to upload ${file.name}`);
          uploadedCount.failed++;
        }
      }

      setIsUploading(false);
      setUploadProgress("");

      if (uploadedCount.success > 0) {
        toast.success(`Uploaded ${uploadedCount.success} file(s)`);
      }

      // Clear input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [generateUploadUrl, saveMedia]
  );

  const handleDelete = useCallback(async () => {
    if (!mediaToDelete) return;

    try {
      await deleteMedia({ mediaId: mediaToDelete._id });
      toast.success("Media deleted");
      setDeleteDialogOpen(false);
      setMediaToDelete(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete media"
      );
    }
  }, [deleteMedia, mediaToDelete]);

  const openDeleteDialog = (item: MediaItem) => {
    setMediaToDelete(item);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button
            variant={filter === "image" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("image")}
          >
            <ImageIcon className="size-3 mr-1" />
            Images
          </Button>
          <Button
            variant={filter === "video" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("video")}
          >
            <Film className="size-3 mr-1" />
            Videos
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={[...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES].join(",")}
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Upload className="size-4 mr-2" />
            )}
            {isUploading ? "Uploading..." : "Upload Media"}
          </Button>
        </div>
      </div>

      {isUploading && uploadProgress && (
        <div className="bg-muted/50 border px-3 py-2 text-xs text-muted-foreground">
          {uploadProgress}
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Limits: Images up to 10MB, Videos up to 100MB
      </div>

      {media === undefined ? (
        <MediaGridSkeleton />
      ) : media.length === 0 ? (
        <EmptyMediaState onUpload={() => fileInputRef.current?.click()} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {media.map((item) => (
            <MediaCard
              key={item._id}
              item={item as MediaItem}
              onDelete={() => openDeleteDialog(item as MediaItem)}
              onPreview={() => setPreviewMedia(item as MediaItem)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Media</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{mediaToDelete?.fileName}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewMedia} onOpenChange={() => setPreviewMedia(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">
              {previewMedia?.fileName}
            </DialogTitle>
            <DialogDescription>
              {previewMedia?.fileType === "image" ? "Image" : "Video"} -{" "}
              {previewMedia && formatFileSize(previewMedia.size)} - Uploaded{" "}
              {previewMedia && formatDate(previewMedia.uploadedAt)}
            </DialogDescription>
          </DialogHeader>
          <div className="relative aspect-video bg-muted flex items-center justify-center">
            {previewMedia?.fileType === "image" ? (
              <img
                src={previewMedia.url}
                alt={previewMedia.fileName}
                className="max-w-full max-h-full object-contain"
              />
            ) : previewMedia?.url ? (
              <video
                src={previewMedia.url}
                controls
                className="max-w-full max-h-full"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MediaCard({
  item,
  onDelete,
  onPreview,
}: {
  item: MediaItem;
  onDelete: () => void;
  onPreview: () => void;
}) {
  return (
    <Card className="group relative overflow-hidden cursor-pointer" onClick={onPreview}>
      <CardContent className="p-0">
        <div className="aspect-square bg-muted relative">
          {item.fileType === "image" ? (
            item.url ? (
              <img
                src={item.url}
                alt={item.fileName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="size-8 text-muted-foreground" />
              </div>
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center relative">
              {item.url ? (
                <video
                  src={item.url}
                  className="w-full h-full object-cover"
                  muted
                />
              ) : (
                <Film className="size-8 text-muted-foreground" />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/50 rounded-full p-2">
                  <Film className="size-4 text-white" />
                </div>
              </div>
            </div>
          )}

          {/* Hover overlay with delete button */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Button
              variant="destructive"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        </div>

        <div className="p-2">
          <p className="text-xs truncate">{item.fileName}</p>
          <p className="text-[10px] text-muted-foreground">
            {formatFileSize(item.size)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyMediaState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="bg-muted rounded-full p-4 mb-4">
        <Upload className="size-8 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium mb-1">No media yet</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Upload images and videos to use in your scheduled posts
      </p>
      <Button onClick={onUpload}>
        <Plus className="size-4 mr-2" />
        Upload Media
      </Button>
    </div>
  );
}

function MediaGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {[...Array(12)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-0">
            <Skeleton className="aspect-square" />
            <div className="p-2 space-y-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-2 w-12" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
