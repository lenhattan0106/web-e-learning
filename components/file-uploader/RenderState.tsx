import { cn } from "@/lib/utils";
import { CloudUploadIcon, ImageIcon, Loader, XIcon, CheckCircle2, AlertCircle, Clock, Zap, Pause, Play, X } from "lucide-react";
import { Button } from "../ui/button";
import Image from "next/image";
import { Progress } from "../ui/progress";

export function RenderEmptyState({ isDragActive }: { isDragActive: boolean }) {
  return (
    <div className="text-center">
      <div className="flex items-center mx-auto justify-center size-12 rounded-full bg-muted mb-4">
        <CloudUploadIcon
          className={cn(
            "size-8 text-muted-foreground",
            isDragActive && "text-primary"
          )}
        />
      </div>
      <p className="text-base font-semibold text-foreground">
        Kéo thả tệp của bạn vào đây hoặc{" "}
        <span className="text-primary font-bold cursor-pointer">
          Nhấp để tải lên
        </span>
      </p>
      <Button className="mt-4" type="button">
        Chọn tệp
      </Button>
    </div>
  );
}

export function RenderErrorState() {
  return (
    <div className="text-center">
      <div className="flex items-center mx-auto justify-center size-12 rounded-full bg-destructive/30 mb-4">
        <ImageIcon className={cn("size-8 text-destructive")} />
      </div>
      <p className="text-base font-semibold">Tải lên thất bại</p>
      <p className="text-xs text-muted-foreground mt-1">Đã xảy ra lỗi</p>
      <Button type="button" className="mt-4">
        Nhấp hoặc kéo thả tệp để thử lại
      </Button>
    </div>
  );
}

export function RenderUploadedState({
  previewUrl,
  isDeleting,
  handleRemoveFile,
  fileType
}: {
  previewUrl: string;
  isDeleting: boolean;
  handleRemoveFile: () => void;
  fileType:"image"|"video"; 
}) {
  return (
    <div className="relative group w-full h-full flex items-center justify-center">
     {fileType === "video" ? (
       <video 
         src={previewUrl} 
         controls 
         className="rounded-md w-full max-h-full object-contain"
         crossOrigin="anonymous"
         preload="metadata"
         controlsList="nodownload"
       />
     ):(
        <Image
        src={previewUrl}
        alt="Tệp đã tải lên"
        fill
        className="object-contain p-2"
        unoptimized={process.env.NODE_ENV === "development"}
      />
     )}
      <Button
        variant="destructive"
        size="icon"
        className={cn("absolute top-4 right-4")}
        onClick={handleRemoveFile}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <Loader className="size-4 animate-spin" />
        ):(
          <XIcon className="size-4" />
        )}
      </Button>
    </div>
  );
}

// Enhanced Multipart Upload State with detailed progress
interface MultipartStats {
  uploadedParts: number;
  totalParts: number;
  uploadSpeed: number; // bytes per second
  estimatedTimeRemaining: number; // seconds
  uploadedBytes: number;
  totalBytes: number;
  currentBatchParts: number[];
  isMultipart: boolean;
  uploadStage: 'initiating' | 'uploading' | 'completing' | 'done';
}

export function RenderUploadingState({
  progress,
  file,
  multipartStats,
  onCancel,
  isPaused,
  onTogglePause,
}: {
  progress: number;
  file: File;
  multipartStats?: MultipartStats;
  onCancel?: () => void;
  isPaused?: boolean;
  onTogglePause?: () => void;
}) {
  const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
  const isMultipart = multipartStats?.isMultipart;
  
  // Format upload speed
  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s`;
  };

  // Format time remaining
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.ceil(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  // Get stage display text
  const getStageText = () => {
    if (isPaused) return "Đã tạm dừng";
    if (!multipartStats) return progress === 0 ? "Đang chuẩn bị..." : progress === 100 ? "Đang hoàn tất..." : "Đang tải lên...";
    
    switch (multipartStats.uploadStage) {
      case 'initiating':
        return "Đang khởi tạo multipart upload...";
      case 'uploading':
        return `Đang tải ${multipartStats.currentBatchParts.length} phần song song...`;
      case 'completing':
        return "Đang hoàn tất và ghép file...";
      case 'done':
        return "Hoàn thành!";
      default:
        return "Đang xử lý...";
    }
  };

  return (
    <div className="text-center flex justify-center items-center flex-col space-y-4 w-full max-w-2xl px-4">
      {/* Header with filename */}
      <div className="w-full bg-muted/50 rounded-lg p-3 border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={cn(
              "size-10 rounded-lg flex items-center justify-center shrink-0",
              isMultipart ? "bg-primary/20" : "bg-muted"
            )}>
              <CloudUploadIcon className={cn(
                "size-5",
                isMultipart ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-foreground truncate">
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {fileSizeMB} MB {isMultipart && "• Multipart Upload"}
              </p>
            </div>
          </div>
          
          {/* Control buttons */}
          <div className="flex items-center gap-2 ml-2">
            {onTogglePause && multipartStats && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onTogglePause}
                className="size-8"
                title={isPaused ? "Tiếp tục" : "Tạm dừng"}
              >
                {isPaused ? (
                  <Play className="size-4" />
                ) : (
                  <Pause className="size-4" />
                )}
              </Button>
            )}
            {onCancel && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onCancel}
                className="size-8 text-destructive hover:text-destructive"
                title="Hủy upload"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Circular Progress */}
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="56"
            cy="56"
            r="48"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-muted"
          />
          {/* Progress circle */}
          <circle
            cx="56"
            cy="56"
            r="48"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 48}`}
            strokeDashoffset={`${2 * Math.PI * 48 * (1 - progress / 100)}`}
            className={cn(
              "transition-all duration-300",
              isMultipart ? "text-primary" : "text-blue-500",
              isPaused && "text-orange-500"
            )}
            strokeLinecap="round"
          />
        </svg>
        {/* Percentage */}
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="text-3xl font-bold text-foreground">{progress}%</span>
          {multipartStats && multipartStats.uploadSpeed > 0 && !isPaused && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Zap className="size-3" />
              {formatSpeed(multipartStats.uploadSpeed)}
            </span>
          )}
        </div>
      </div>

      {/* Stage Status */}
      <div className="space-y-2 w-full">
        <div className="flex items-center justify-center gap-2">
          {isPaused ? (
            <AlertCircle className="size-4 text-orange-500" />
          ) : progress === 100 ? (
            <CheckCircle2 className="size-4 text-green-500 animate-pulse" />
          ) : (
            <Loader className="size-4 text-primary animate-spin" />
          )}
          <p className="text-base font-semibold text-foreground">
            {getStageText()}
          </p>
        </div>
        
        {/* Time remaining */}
        {multipartStats && multipartStats.estimatedTimeRemaining > 0 && !isPaused && (
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
            <Clock className="size-3" />
            Còn lại khoảng {formatTime(multipartStats.estimatedTimeRemaining)}
          </p>
        )}
      </div>

      {/* Multipart Progress Details */}
      {isMultipart && multipartStats && (
        <div className="w-full space-y-3">
          {/* Parts progress */}
          <div className="bg-muted/50 rounded-lg p-3 border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Tiến độ phần
              </span>
              <span className="text-xs font-semibold text-foreground">
                {multipartStats.uploadedParts}/{multipartStats.totalParts} phần
              </span>
            </div>
            <Progress value={(multipartStats.uploadedParts / multipartStats.totalParts) * 100} className="h-2" />
          </div>

          {/* Current batch indicator */}
          {multipartStats.currentBatchParts.length > 0 && !isPaused && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="size-2 rounded-full bg-primary animate-pulse" />
                <span>
                  Đang upload song song: Phần {multipartStats.currentBatchParts.join(", ")}
                </span>
              </div>
            </div>
          )}

          {/* Data transferred */}
          <div className="text-xs text-muted-foreground text-center">
            {(multipartStats.uploadedBytes / 1024 / 1024).toFixed(1)} MB / {(multipartStats.totalBytes / 1024 / 1024).toFixed(1)} MB đã tải lên
          </div>
        </div>
      )}

      {/* Linear Progress Bar */}
      <div className="w-full">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-300 ease-out",
              isMultipart ? "bg-linear-to-r from-primary to-blue-500" : "bg-primary",
              isPaused && "bg-orange-500"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Warning message */}
      {progress > 0 && progress < 100 && !isPaused && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <AlertCircle className="size-3" />
          Vui lòng không đóng trình duyệt
        </p>
      )}
    </div>
  );
}
