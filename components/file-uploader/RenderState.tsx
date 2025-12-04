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
}: {
  previewUrl: string;
  isDeleting: boolean;
  handleRemoveFile: () => void;
}) {
  return (
    <div>
      <Image
        src={previewUrl}
        alt="Tệp đã tải lên"
        fill
        className="object-contain p-2"
      ></Image>
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
  return (
    <div className="text-center flex justify-center items-center flex-col">
      <p>{progress}%</p>
      <p className="mt-2 text-sm font-medium text-foreground">Đang tải lên...</p>
      <p className="mt-1 text-xs text-muted-foreground truncate max-w-xs">
        {file.name}
      </p>
    </div>
  );
}
