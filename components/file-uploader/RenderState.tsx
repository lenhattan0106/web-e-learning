import { cn } from "@/lib/utils";
import { CloudUploadIcon, ImageIcon, Loader, XIcon } from "lucide-react";
import { Button } from "../ui/button";
import Image from "next/image";

export function RenderEmptyState({ isDragActive }: { isDragActive: boolean }) {
  return (
    <div className="text-center">
      <div className="flex items-center mx-auto justify-center size-12 rounded-full bg-muted mb-4">
        <CloudUploadIcon
          className={cn(
            "size-8 text-muted-foreground",
            isDragActive && "text-primary"
          )}
        ></CloudUploadIcon>
      </div>
      <p className="text-base font-semibold text-foreground">
        Kéo thả tệp của bạn vào đây hoặc{" "}
        <span className="text-primary font-bold cursor-pointer">
          Nhấp để tải lên
        </span>{" "}
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
        <ImageIcon className={cn("size-8 text-destructive")}></ImageIcon>
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
       ></video>
     ):(
        <Image
        src={previewUrl}
        alt="Tệp đã tải lên"
        fill
        className="object-contain p-2"
        unoptimized={process.env.NODE_ENV === "development"}
      ></Image>
     )}
      <Button
        variant="destructive"
        size="icon"
        className={cn("absolute top-4 right-4")}
        onClick={handleRemoveFile}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <Loader className="size-4 animate-spin"></Loader>
        ):(
          <XIcon className="size-4"></XIcon>
        )}
      </Button>
    </div>
  );
}

export function RenderUploadingState({
  progress,
  file,
}: {
  progress: number;
  file: File;
}) {
  const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
  
  return (
    <div className="text-center flex justify-center items-center flex-col space-y-4">
      {/* Circular Progress */}
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="48"
            cy="48"
            r="40"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-muted"
          />
          {/* Progress circle */}
          <circle
            cx="48"
            cy="48"
            r="40"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 40}`}
            strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
            className="text-primary transition-all duration-300"
            strokeLinecap="round"
          />
        </svg>
        {/* Percentage */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-foreground">{progress}%</span>
        </div>
      </div>

      {/* Status Text */}
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">
          {progress === 0 ? "Đang chuẩn bị..." : progress === 100 ? "Đang hoàn tất..." : "Đang tải lên..."}
        </p>
        <p className="text-sm text-muted-foreground">
          {fileSizeMB} MB • {file.name}
        </p>
        {progress > 0 && progress < 100 && (
          <p className="text-xs text-muted-foreground">
            Vui lòng không đóng trình duyệt
          </p>
        )}
      </div>

      {/* Linear Progress Bar */}
      <div className="w-full max-w-xs">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
