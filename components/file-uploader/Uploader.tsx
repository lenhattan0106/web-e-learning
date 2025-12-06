"use client";
/* eslint-disable react/no-unescaped-entities */
import { useCallback, useEffect, useState } from "react";
import { FileRejection, useDropzone } from "react-dropzone";
import { Card, CardContent } from "../ui/card";
import { cn } from "@/lib/utils";
import {
  RenderEmptyState,
  RenderErrorState,
  RenderUploadedState,
  RenderUploadingState,
} from "./RenderState";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { useConstructUrl } from "@/hooks/use-contruct-url";

interface UpLoaderState {
  id: string | null;
  file: File | null;
  uploading: boolean;
  progress: number;
  key?: string;
  isDeleting: boolean;
  error: boolean;
  objectUrl?: string;
  fileType: "image" | "video";
}

interface iAppProps {
  value?: string;
  onChange?: (value: string) => void;
  fileTypeAccepted:"image"|"video"; 
}

export function Uploader({ onChange, value, fileTypeAccepted }: iAppProps) {
  const fileUrl = useConstructUrl(value || '')
  const [fileState, setFileState] = useState<UpLoaderState>({
    error: false,
    file: null,
    id: null,
    uploading: false,
    progress: 0,
    isDeleting: false,
    fileType: fileTypeAccepted,
    key: value,
    objectUrl:value ? fileUrl:undefined,
  });
  const upLoadFile = useCallback(
    async (file: File) => {
      setFileState((prev) => ({
        ...prev,
        uploading: true,
        progress: 0,
      }));
      try {
        // 1.Get presigned URL
        const presignedResponse = await fetch("/api/s3/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            size: file.size,
            isImage: fileTypeAccepted ==="image"? true: false,
          }),
        });
        if (!presignedResponse.ok) {
          toast.error("Không thể lấy URL tải lên");
          setFileState((prev) => ({
            ...prev,
            uploading: false,
            progress: 0,
            error: true,
          }));
          return;
        }
        const { presignedURL, key } = await presignedResponse.json();
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percentageCompleted = (event.loaded / event.total) * 100;
              setFileState((prev) => ({
                ...prev,
                progress: Math.round(percentageCompleted),
              }));
            }
          };
          xhr.onload = () => {
            if (xhr.status === 200 || xhr.status === 204) {
              setFileState((prev) => ({
                ...prev,
                progress: 100,
                uploading: false,
                key: key,
              }));
              onChange?.(key);
              toast.success("Tải lên tệp thành công");
              resolve();
            } else {
              reject(new Error("Tải lên thất bại"));
            }
          };
          xhr.onerror = () => {
            reject(new Error("Tải lên thất bại"));
          };
          xhr.open("PUT", presignedURL);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.send(file);
        });
      } catch {
        toast.error("Đã xảy ra lỗi không mong muốn");
        setFileState((prev) => ({
          ...prev,
          progress: 0,
          error: true,
          uploading: false,
        }));
      }
    },
    [onChange,fileTypeAccepted]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];

        setFileState((prev) => {
          // ✅ Dùng prev.objectUrl thay vì fileState.objectUrl
          if (prev.objectUrl && !prev.objectUrl.startsWith("http")) {
            URL.revokeObjectURL(prev.objectUrl);
          }

          return {
            file: file,
            uploading: false,
            progress: 0,
            objectUrl: URL.createObjectURL(file),
            error: false,
            id: uuidv4(),
            isDeleting: false,
            fileType: fileTypeAccepted,
          };
        });

        upLoadFile(file);
      }
    },
    [upLoadFile,fileTypeAccepted]
  );

  async function handleRemoveFile() {
    if (fileState.isDeleting || !fileState.objectUrl) return;
    try {
      setFileState((prev) => ({
        ...prev,
        isDeleting: true,
      }));
      const response = await fetch("/api/s3/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: fileState.key,
        }),
      });
      if (!response.ok) {
        toast.error("Không thể xóa tệp khỏi bộ nhớ");
        setFileState((prev) => ({
          ...prev,
          isDeleting: true,
          error: true,
        }));
        return;
      }
      if (fileState.objectUrl && !fileState.objectUrl.startsWith("http")) {
        URL.revokeObjectURL(fileState.objectUrl);
      }
      onChange?.("");
      setFileState(() => ({
        file: null,
        uploading: false,
        progress: 0,
        objectUrl: undefined,
        error: false,
        fileType: fileTypeAccepted,
        id: null,
        isDeleting: false,
      }));
      toast.success("Xóa tệp thành công");
    } catch {
      toast.error("Lỗi khi xóa tệp, vui lòng thử lại");
      setFileState((prev) => ({
        ...prev,
        isDeleting: false,
        error: true,
      }));
    }
  }

  function rejectedFiles(fileRejection: FileRejection[]) {
    if (fileRejection.length) {
      const tooManyFiles = fileRejection.find(
        (rejection) => rejection.errors[0].code === "too-many-files"
      );
      const fileSizeToBig = fileRejection.find(
        (rejection) => rejection.errors[0].code === "file-too-large"
      );
      if (fileSizeToBig) {
        toast.error("Kích thước tệp vượt quá giới hạn cho phép");
      }
      if (tooManyFiles) {
        toast.error("Chọn quá nhiều tệp, tối đa là 1 tệp");
      }
    }
  }

  function renderContent() {
    if (fileState.uploading) {
      return (
        <RenderUploadingState
          file={fileState.file as File}
          progress={fileState.progress}
        />
      );
    }
    if (fileState.error) {
      return <RenderErrorState></RenderErrorState>;
    }
    if (fileState.objectUrl) {
      return (
        <RenderUploadedState  
          isDeleting={fileState.isDeleting}
          handleRemoveFile={handleRemoveFile}
          previewUrl={fileState.objectUrl}
          fileType={fileState.fileType}
        ></RenderUploadedState>
      );
    }
    return <RenderEmptyState isDragActive={isDragActive}></RenderEmptyState>;
  }
  useEffect(() => {
    return () => {
      if (fileState.objectUrl && !fileState.objectUrl.startsWith("http")) {
        URL.revokeObjectURL(fileState.objectUrl);
      }
    };
  }, [fileState.objectUrl]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: fileTypeAccepted ==="video"?{'video/*':[]}:{"image/*":[]},
    maxFiles: 1,
    multiple: false,
    maxSize: fileTypeAccepted === "video" ? 4000 * 1024 * 1024 : 5 * 1024 * 1024, // Video: 100MB, Image: 5MB
    onDropRejected: rejectedFiles,
    disabled: fileState.uploading || !!fileState.objectUrl,
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
        {renderContent()}
      </CardContent>
    </Card>
  );
}
