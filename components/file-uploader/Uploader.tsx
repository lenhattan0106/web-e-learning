"use client";
/* eslint-disable react/no-unescaped-entities */
import { useCallback, useState } from "react";
import { FileRejection, useDropzone } from "react-dropzone";
import { Card, CardContent } from "../ui/card";
import { cn } from "@/lib/utils";
import { RenderEmptyState, RenderErrorState } from "./RenderState";
import { toast } from "sonner";

interface UpLoaderState {
    id: string | null;
    file: File | null;
    uploading: boolean;
    progress: number;
    key?:string;
    isDeleting: boolean;
    error:boolean;
    objectUrl:string;
    fileType:"image" | "video";
}
export function Uploader() {
    const [fileState,setFileState] = useState<UpLoaderState>()
  const onDrop = useCallback((acceptedFiles: File[]) => {}, []);
  function rejectedFiles(fileRejection: FileRejection[]) {
    if (fileRejection.length) {
      const tooManyFiles = fileRejection.find(
        (rejection) => rejection.errors[0].code === "too-many-files"
      );
      const fileSizeToBig = fileRejection.find(
        (rejection) => rejection.errors[0].code === "file-too-large"
      );
      if (fileSizeToBig) {
        toast.error("File Sizes exceeds the limit");
      }
      if (tooManyFiles) {
        toast.error("Too many files selected,max is 1");
      }
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
    multiple: false,
    maxSize: 5 * 1024 * 1024, // 5mb calculation,
    onDropRejected: rejectedFiles,
  });

  return (
    <Card
      {...getRootProps()}
      className={cn(
        "relative border-2 border-dashed transition-colors duration-200 ease-in-out w-full h-64",
        isDragActive
          ? "border-primary bg-primary/10 border-solid"
          : "border-border hover:border-primary"
      )}
    >
      <CardContent className="flex items-center justify-center h-full w-full p-4">
        <input {...getInputProps()} />
        <RenderEmptyState isDragActive={isDragActive}></RenderEmptyState>
      </CardContent>
    </Card>
  );
}
