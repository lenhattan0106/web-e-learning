import { cn } from "@/lib/utils";
import { CloudUploadIcon, ImageIcon } from "lucide-react";
import { Button } from "../ui/button";

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
        Drop your files here or{" "}
        <span className="text-primary font-bold cursor-pointer">
          Click to Upload
        </span>{" "}
      </p>
      <Button className="mt-4" type="button">
        Select file
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
      <p className="text-base font-semibold">Upload Failed</p>
      <p className="text-xs text-muted-foreground mt-1">Something went wrong</p>
      <Button type="button"  className="mt-4">Click or drag file to retry</Button>
    </div>
  );
}
