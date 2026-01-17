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
import { env } from "@/lib/env";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { useConstructUrl } from "@/hooks/use-contruct-url";

const MAX_FILE_SIZE_MB = 1024; // 1GB
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

const MULTIPART_THRESHOLD_MB = 100; // Switch to multipart at 100MB
const MULTIPART_THRESHOLD = MULTIPART_THRESHOLD_MB * 1024 * 1024;

const CHUNK_SIZE_MB = 20; // 20MB per part (optimized for performance)
const CHUNK_SIZE = CHUNK_SIZE_MB * 1024 * 1024;


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
  onDurationChange?: (duration: number) => void;
  fileTypeAccepted:"image"|"video";
  folder?: string; // Optional: S3 folder prefix (e.g., "videos", "thumbnails", "chat-messages")
}

export function Uploader({ onChange, onDurationChange, value, fileTypeAccepted, folder }: iAppProps) {
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
  
  // Multipart upload for large files
  const upLoadMultipart = useCallback(
    async (file: File) => {
      let uploadId: string | undefined;
      let key: string | undefined;
      
      setFileState((prev) => ({
        ...prev,
        uploading: true,
        progress: 0,
      }));
      
      try {
        // Step 1: Khởi tạo multipart upload
        const initResponse = await fetch("/api/s3/multipart/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            size: file.size,
            folder: folder, // Tiền tố thư mục S3
          }),
        });

        if (!initResponse.ok) {
          throw new Error("Không thể khởi tạo upload");
        }
        // Tất cả các parts dựa vào uploadId và key từ phản hồi
        const initData = await initResponse.json();
        uploadId = initData.uploadId;
        key = initData.key;

        // Bước 2: Chia tệp thành các phần
        const chunks: Blob[] = [];
        for (let start = 0; start < file.size; start += CHUNK_SIZE) {
          chunks.push(file.slice(start, start + CHUNK_SIZE));
        }

        const totalParts = chunks.length;
        toast.info(`Đang upload ${totalParts} phần... (${Math.round(file.size / 1024 / 1024)}MB)`);

        // Bước 3: Upload các phần song song (5 phần cùng lúc)
        const uploadedParts: Array<{ PartNumber: number; ETag: string }> = [];
        const PARALLEL_UPLOADS = 5; 
        
        // Hàm trợ giúp để upload một phần
        const uploadPart = async (partNumber: number, chunk: Blob) => {
          // Lấy URL được ký cho phần này
          const signResponse = await fetch("/api/s3/multipart/sign-part", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uploadId,
              key,
              partNumber,
            }),
          });

          if (!signResponse.ok) {
            throw new Error(`Không thể lấy URL cho phần ${partNumber}`);
          }

          const { presignedUrl } = await signResponse.json();
          // Upload phần lên S3
          const uploadResponse = await fetch(presignedUrl, {
            method: "PUT",
            body: chunk,
          });

          if (!uploadResponse.ok) {
            throw new Error(`Upload phần ${partNumber} thất bại`);
          }

          // Lấy ETag từ header phản hồi (BẮT BUỘC cho multipart S3)
          const etag = uploadResponse.headers.get("ETag");
          
          if (!etag) {
            throw new Error(
              `Không nhận được ETag cho phần ${partNumber}. ` +
              `Vui lòng cấu hình CORS cho S3 bucket để expose header "ETag". ` +
              `Chi tiết: https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html`
            );
          }

          // Loại bỏ dấu ngoặc kép khỏi ETag  
          const cleanETag = etag.replace(/"/g, "");

          return {
            PartNumber: partNumber,
            ETag: cleanETag,
          };
        };

        // Upload theo từng lô với số phần song song là PARALLEL_UPLOADS
        for (let i = 0; i < chunks.length; i += PARALLEL_UPLOADS) {
          const batchEnd = Math.min(i + PARALLEL_UPLOADS, chunks.length); // batchEnd là chỉ số kết thúc của lô hiện tại
          const batchPromises = [];

          const estimatedProgress = Math.round((i / totalParts) * 100);
          setFileState((prev) => ({ ...prev, progress: estimatedProgress }));

          for (let j = i; j < batchEnd; j++) {
            const partNumber = j + 1;
            const chunk = chunks[j];
            batchPromises.push(uploadPart(partNumber, chunk));
          }
          
          const batchResults = await Promise.all(batchPromises);
          uploadedParts.push(...batchResults);

          // Cập nhật tiến trình sau khi lô hoàn thành
          const actualProgress = Math.round((uploadedParts.length / totalParts) * 100);
          setFileState((prev) => ({ ...prev, progress: actualProgress }));
          
          console.log(`[Multipart] Batch ${Math.floor(i / PARALLEL_UPLOADS) + 1} complete: ${uploadedParts.length}/${totalParts} parts uploaded (${actualProgress}%)`);
        }

        // Step 4: Complete upload
        toast.info("Đang hoàn tất tệp...");
        
        const completeResponse = await fetch("/api/s3/multipart/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uploadId,
            key,
            parts: uploadedParts, // {PartNumber, ETag}[]
          }),
        });

        if (!completeResponse.ok) {
          throw new Error("Không thể hoàn tất upload");
        }

        const { success } = await completeResponse.json();

        if (success) {
          const uploadedUrl = `https://${env.NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES}.t3.storage.dev/${key}`;

          setFileState((prev) => ({
            ...prev,
            progress: 100,
            uploading: false,
            key: key,
            objectUrl: uploadedUrl,
          }));

          if (key) {
            onChange?.(key);
          }
          toast.success("Tải lên video thành công!");
        }
      } catch (error) {
        console.error("Multipart upload error:", error);
        toast.error(error instanceof Error ? error.message : "Upload thất bại");

        // Abort incomplete upload
        if (uploadId && key) {
          try {
            await fetch("/api/s3/multipart/abort", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ uploadId, key }),
            });
            console.log("Aborted incomplete upload");
          } catch (abortError) {
            console.error("Failed to abort upload:", abortError);
          }
        }

        setFileState((prev) => ({
          ...prev,
          uploading: false,
          error: true,
        }));
      }
    },
    [onChange, folder]
  );
  

  const upLoadSinglePart = useCallback(
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
            folder: folder, // S3 folder prefix
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
              // Construct S3 URL for preview
              const uploadedUrl = `https://${env.NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES}.t3.storage.dev/${key}`;
              
              setFileState((prev) => ({
                ...prev,
                progress: 100,
                uploading: false,
                key: key,
                objectUrl: uploadedUrl, // hiển thị từ S3
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
    [onChange, fileTypeAccepted, folder]
  );
  
  // Chọn chiến lược upload dựa trên kích thước tệp
  const upLoadFile = useCallback(
    async (file: File) => {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(
          `File quá lớn! Vui lòng upload video dưới ${MAX_FILE_SIZE_MB}MB. ` +
          `(Video của bạn: ${Math.round(file.size / 1024 / 1024)}MB)`,
          { duration: 5000 } 
        );
        setFileState((prev) => ({
          ...prev,
          error: true,
        }));
        return;
      }
       
      if (file.size > 500 * 1024 * 1024) {
        toast.warning(
          `Video lớn (${Math.round(file.size / 1024 / 1024)}MB). ` +
          `Khuyến nghị video dưới 500MB để tải nhanh hơn.`,
          { duration: 5000 }
        );
      }

      // Nếu tệp lớn hơn ngưỡng, sử dụng multipart upload
      if (file.size >= MULTIPART_THRESHOLD) {
        console.log(`[Upload] Using multipart for ${file.name} (${Math.round(file.size / 1024 / 1024)}MB)`);
        await upLoadMultipart(file);
      } else {
        console.log(`[Upload] Using single-part for ${file.name} (${Math.round(file.size / 1024 / 1024)}MB)`);
        await upLoadSinglePart(file);
      }
    },
    [upLoadMultipart, upLoadSinglePart]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        const objectUrl = URL.createObjectURL(file);

        if (fileTypeAccepted === "video" && onDurationChange) {
            const video = document.createElement("video");
            video.preload = "metadata";
            let metadataLoaded = false;
            const METADATA_TIMEOUT = 10000; 
            const timeoutId = setTimeout(() => {
              if (!metadataLoaded) {
                console.warn("video meta load quá thời gian, đặt thời lượng về 0");
                window.URL.revokeObjectURL(video.src);
                onDurationChange(0);
              }
            }, METADATA_TIMEOUT);
            
            video.onloadedmetadata = function() {
              metadataLoaded = true;
              clearTimeout(timeoutId);
              window.URL.revokeObjectURL(video.src); 
              if (!isNaN(video.duration) && isFinite(video.duration)) {
                onDurationChange(Math.round(video.duration));
              } else {
                console.warn("Invalid video duration, setting to 0");
                onDurationChange(0);
              }
            };
            
            video.onerror = function(e) {
              metadataLoaded = true;
              clearTimeout(timeoutId);
              console.error("Failed to load video metadata:", e);
              window.URL.revokeObjectURL(video.src);
              onDurationChange(0); 
              toast.warning("Không thể đọc thời lượng video, nhưng vẫn tiếp tục tải lên");
            };
            
            video.src = objectUrl;
        }

        setFileState((prev) => {
          if (prev.objectUrl && !prev.objectUrl.startsWith("http")) {
            URL.revokeObjectURL(prev.objectUrl);
          }
          return {
            file: file,
            uploading: false, 
            progress: 0,
            objectUrl: undefined,
            error: false,
            id: uuidv4(),
            isDeleting: false,
            fileType: fileTypeAccepted,
          };
        });

        upLoadFile(file);
      }
    },
    [upLoadFile,fileTypeAccepted, onDurationChange]
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

  // Handle click to reset error state
  const handleClick = () => {
    if (fileState.error) {
      setFileState((prev) => ({
        ...prev,
        error: false,
      }));
    }
  };

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
  
  // Prevent accidental tab close during upload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (fileState.uploading) {
        e.preventDefault();
        e.returnValue = "Upload đang diễn ra. Bạn có chắc muốn rời khỏi?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [fileState.uploading]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: fileTypeAccepted ==="video"?{'video/*':[]}:{"image/*":[]},
    maxFiles: 1,
    multiple: false,
    maxSize: fileTypeAccepted === "video" ? 400 * 1024 * 1024 : 10 * 1024 * 1024, // Video: 400MB, Image: 10MB
    onDropRejected: rejectedFiles,
    disabled: fileState.uploading || !!fileState.objectUrl,
  });

  return (
    <Card
      {...getRootProps()}
      className={cn(
        "relative border-2 border-dashed transition-colors duration-200 ease-in-out w-full",
        fileTypeAccepted === "video" ? "h-96" : "h-64", // Video: taller preview
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
