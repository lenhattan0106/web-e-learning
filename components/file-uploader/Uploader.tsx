"use client";

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

const MAX_FILE_SIZE_MB = 1024;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

const MULTIPART_THRESHOLD_MB = 100;
const MULTIPART_THRESHOLD = MULTIPART_THRESHOLD_MB * 1024 * 1024;

const CHUNK_SIZE_MB = 20;
const CHUNK_SIZE = CHUNK_SIZE_MB * 1024 * 1024;

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 10000;
const UPLOAD_TIMEOUT = 60000;

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
  multipartStats?: {
    uploadedParts: number;
    totalParts: number;
    uploadSpeed: number;
    estimatedTimeRemaining: number;
    uploadedBytes: number;
    totalBytes: number;
    currentBatchParts: number[];
    isMultipart: boolean;
    uploadStage: 'initiating' | 'uploading' | 'completing' | 'done';
    failedParts?: number[];
    retryingParts?: number[];
  };
  isPaused?: boolean;
  abortController?: AbortController;
}

interface iAppProps {
  value?: string;
  onChange?: (value: string) => void;
  onDurationChange?: (duration: number) => void;
  fileTypeAccepted:"image"|"video";
  folder?: string;
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
  
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  const getRetryDelay = (attempt: number): number => {
    const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
    return Math.min(delay, MAX_RETRY_DELAY);
  };

  const uploadPartWithRetry = useCallback(
    async (
      partNumber: number, 
      chunk: Blob, 
      uploadId: string, 
      key: string,
      abortController: AbortController,
      maxRetries = MAX_RETRIES
    ): Promise<{ PartNumber: number; ETag: string }> => {
      
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`[Multipart] Retry ${attempt}/${maxRetries} for part ${partNumber}`);
            setFileState((prev) => ({
              ...prev,
              multipartStats: prev.multipartStats ? {
                ...prev.multipartStats,
                retryingParts: [...(prev.multipartStats.retryingParts || []), partNumber],
              } : undefined,
            }));
            
            const delayMs = getRetryDelay(attempt - 1);
            toast.info(`Đang thử lại phần ${partNumber}... (lần ${attempt}/${maxRetries})`, { duration: 2000 });
            await sleep(delayMs);
          }

          // Check abort BEFORE starting
          if (abortController.signal.aborted) {
            throw new Error("Upload đã bị hủy bởi người dùng");
          }

          // ============ STEP 1: Get presigned URL ============
          console.log(`[Multipart] Part ${partNumber}: Requesting presigned URL...`);
          
          const signPromise = fetch("/api/s3/multipart/sign-part", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uploadId,
              key,
              partNumber,
            }),
            signal: abortController.signal,
          });

          // Timeout without aborting signal
          const signTimeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Timeout lấy URL cho phần ${partNumber} (>30s)`)), 30000);
          });

          const signResponse = await Promise.race([signPromise, signTimeoutPromise]);

          if (!signResponse.ok) {
            const errorText = await signResponse.text().catch(() => 'Unknown error');
            throw new Error(`Không thể lấy URL cho phần ${partNumber} (HTTP ${signResponse.status}): ${errorText}`);
          }

          const { presignedUrl } = await signResponse.json();
          
          if (!presignedUrl) {
            throw new Error(`Server không trả về presignedUrl cho phần ${partNumber}`);
          }

          console.log(`[Multipart] Part ${partNumber}: Got presigned URL, uploading ${(chunk.size / 1024 / 1024).toFixed(1)}MB...`);

          // Check abort BETWEEN steps
          if (abortController.signal.aborted) {
            throw new Error("Upload đã bị hủy bởi người dùng");
          }

          // ============ STEP 2: Upload to S3 ============
          const uploadPromise = fetch(presignedUrl, {
            method: "PUT",
            body: chunk,
            signal: abortController.signal,
          });

          // Dynamic timeout based on chunk size (minimum 10s per MB)
          const uploadTimeoutMs = Math.max(UPLOAD_TIMEOUT, chunk.size / 1024 / 1024 * 10000);
          const uploadTimeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Timeout upload phần ${partNumber} (>${Math.round(uploadTimeoutMs/1000)}s)`)), uploadTimeoutMs);
          });

          const uploadResponse = await Promise.race([uploadPromise, uploadTimeoutPromise]);

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text().catch(() => 'Unknown error');
            throw new Error(`Upload phần ${partNumber} thất bại (HTTP ${uploadResponse.status}): ${errorText}`);
          }

          // ============ STEP 3: Extract ETag ============
          const etag = uploadResponse.headers.get("ETag");
          
          if (!etag) {
            throw new Error(
              `Không nhận được ETag cho phần ${partNumber}. ` +
              `Vui lòng kiểm tra CORS config của S3 bucket (ExposeHeaders: ["ETag"])`
            );
          }

          const cleanETag = etag.replace(/"/g, "");

          console.log(`[Multipart] Part ${partNumber}: Upload success! ETag: ${cleanETag.substring(0, 8)}...`);

          // Success! Remove from retry list
          setFileState((prev) => ({
            ...prev,
            multipartStats: prev.multipartStats ? {
              ...prev.multipartStats,
              retryingParts: (prev.multipartStats.retryingParts || []).filter(p => p !== partNumber),
              failedParts: (prev.multipartStats.failedParts || []).filter(p => p !== partNumber),
            } : undefined,
          }));

          return {
            PartNumber: partNumber,
            ETag: cleanETag,
          };

        } catch (error) {
          lastError = error instanceof Error ? error : new Error("Unknown error");
          
          // Distinguish user abort from network error
          if (abortController.signal.aborted || lastError.message.includes("bị hủy bởi người dùng")) {
            console.log(`[Multipart] Part ${partNumber}: User cancelled upload`);
            throw new Error("Upload đã bị hủy bởi người dùng");
          }

          console.error(`[Multipart] Part ${partNumber} attempt ${attempt + 1}/${maxRetries + 1} failed:`, lastError.message);
          
          // If this is the last attempt, give up
          if (attempt === maxRetries) {
            setFileState((prev) => ({
              ...prev,
              multipartStats: prev.multipartStats ? {
                ...prev.multipartStats,
                failedParts: [...(prev.multipartStats.failedParts || []), partNumber],
                retryingParts: (prev.multipartStats.retryingParts || []).filter(p => p !== partNumber),
              } : undefined,
            }));
            
            toast.error(`Phần ${partNumber} thất bại sau ${maxRetries + 1} lần thử: ${lastError.message.substring(0, 100)}`);
            throw lastError;
          }
          
          // Check if error is retryable
          const isRetryable = 
            lastError.message.includes("Timeout") ||
            lastError.message.includes("timeout") ||
            lastError.message.includes("Network") ||
            lastError.message.includes("Failed to fetch") ||
            lastError.message.includes("HTTP 5");

          if (!isRetryable) {
            console.error(`[Multipart] Part ${partNumber}: Non-retryable error, aborting`);
            throw lastError;
          }
          
          // Continue to next retry attempt
        }
      }
      
      throw lastError || new Error(`Part ${partNumber} failed after ${maxRetries + 1} attempts`);
    },
    []
  );

  const upLoadMultipart = useCallback(
    async (file: File) => {
      let uploadId: string | undefined;
      let key: string | undefined;
      const abortController = new AbortController();
      
      setFileState((prev) => ({
        ...prev,
        uploading: true,
        progress: 0,
        abortController,
        multipartStats: {
          uploadedParts: 0,
          totalParts: 0,
          uploadSpeed: 0,
          estimatedTimeRemaining: 0,
          uploadedBytes: 0,
          totalBytes: file.size,
          currentBatchParts: [],
          isMultipart: true,
          uploadStage: 'initiating',
          failedParts: [],
          retryingParts: [],
        },
      }));
      
      try {
        setFileState((prev) => ({
          ...prev,
          multipartStats: prev.multipartStats ? {
            ...prev.multipartStats,
            uploadStage: 'initiating',
          } : undefined,
        }));

        console.log(`[Multipart] Initiating upload for ${file.name} (${Math.round(file.size / 1024 / 1024)}MB)`);

        const initResponse = await fetch("/api/s3/multipart/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            size: file.size,
            folder: folder,
          }),
          signal: abortController.signal,
        });

        if (!initResponse.ok) {
          const errorText = await initResponse.text().catch(() => 'Unknown error');
          throw new Error(`Không thể khởi tạo upload: ${errorText}`);
        }

        const initData = await initResponse.json();
        uploadId = initData.uploadId;
        key = initData.key;

        if (!uploadId || !key) {
          throw new Error("Server không trả về uploadId hoặc key");
        }

        console.log(`[Multipart] Initiated: uploadId=${uploadId.substring(0, 20)}..., key=${key}`);

        const chunks: Blob[] = [];
        for (let start = 0; start < file.size; start += CHUNK_SIZE) {
          chunks.push(file.slice(start, start + CHUNK_SIZE));
        }

        const totalParts = chunks.length;
        
        setFileState((prev) => ({
          ...prev,
          multipartStats: prev.multipartStats ? {
            ...prev.multipartStats,
            totalParts,
            uploadStage: 'uploading',
          } : undefined,
        }));

        toast.info(`Bắt đầu upload ${totalParts} phần (${CHUNK_SIZE_MB}MB/phần)...`);

        let lastUpdateTime = Date.now();
        let lastUploadedBytes = 0;

        const uploadedParts: Array<{ PartNumber: number; ETag: string }> = [];
        const PARALLEL_UPLOADS = 5;

        for (let i = 0; i < chunks.length; i += PARALLEL_UPLOADS) {
          if (abortController.signal.aborted) {
            throw new Error("Upload đã bị hủy");
          }

          const batchEnd = Math.min(i + PARALLEL_UPLOADS, chunks.length);
          const currentBatchParts: number[] = [];

          const batchPromises = [];
          for (let j = i; j < batchEnd; j++) {
            const partNumber = j + 1;
            currentBatchParts.push(partNumber);
            const chunk = chunks[j];
            batchPromises.push(
              uploadPartWithRetry(partNumber, chunk, uploadId, key, abortController)
            );
          }
          
          console.log(`[Multipart] Starting batch ${Math.floor(i / PARALLEL_UPLOADS) + 1}/${Math.ceil(chunks.length / PARALLEL_UPLOADS)}: Parts ${currentBatchParts.join(", ")}`);

          setFileState((prev) => ({
            ...prev,
            multipartStats: prev.multipartStats ? {
              ...prev.multipartStats,
              currentBatchParts,
            } : undefined,
          }));
          
          const batchResults = await Promise.allSettled(batchPromises);
          
          const successes: Array<{ PartNumber: number; ETag: string }> = [];
          const failures: Array<{ partNumber: number; reason: string }> = [];
          
          batchResults.forEach((result, index) => {
            const partNumber = i + index + 1;
            
            if (result.status === 'fulfilled') {
              successes.push(result.value);
            } else {
              failures.push({
                partNumber,
                reason: result.reason?.message || 'Unknown error'
              });
            }
          });
          
          uploadedParts.push(...successes);

          if (failures.length > 0) {
            console.error(`[Multipart] Batch ${Math.floor(i / PARALLEL_UPLOADS) + 1} had ${failures.length} failures:`, failures);
            
            const failureRate = failures.length / batchPromises.length;
            if (failureRate > 0.5) {
              throw new Error(
                `Quá nhiều phần thất bại (${failures.length}/${batchPromises.length}). ` +
                `Vui lòng kiểm tra kết nối mạng.`
              );
            }
            
            toast.warning(
              `${failures.length} phần thất bại, tiếp tục với ${successes.length} phần thành công`,
              { duration: 3000 }
            );
          }

          const now = Date.now();
          const uploadedBytes = uploadedParts.length * CHUNK_SIZE;
          const actualProgress = Math.round((uploadedParts.length / totalParts) * 100);
          
          let uploadSpeed = 0;
          let estimatedTimeRemaining = 0;
          
          if (now - lastUpdateTime >= 2000) {
            const timeDiff = (now - lastUpdateTime) / 1000;
            const bytesDiff = uploadedBytes - lastUploadedBytes;
            uploadSpeed = bytesDiff / timeDiff;
            
            const remainingBytes = file.size - uploadedBytes;
            estimatedTimeRemaining = uploadSpeed > 0 ? remainingBytes / uploadSpeed : 0;
            
            lastUpdateTime = now;
            lastUploadedBytes = uploadedBytes;
          }
          
          setFileState((prev) => ({
            ...prev,
            progress: actualProgress,
            multipartStats: prev.multipartStats ? {
              ...prev.multipartStats,
              uploadedParts: uploadedParts.length,
              uploadSpeed,
              estimatedTimeRemaining,
              uploadedBytes,
              currentBatchParts: [],
            } : undefined,
          }));
          
          console.log(`[Multipart] Progress: ${uploadedParts.length}/${totalParts} parts (${actualProgress}%) - Speed: ${(uploadSpeed / 1024 / 1024).toFixed(2)} MB/s`);
        }

        if (uploadedParts.length !== totalParts) {
          throw new Error(
            `Upload không đầy đủ: Chỉ ${uploadedParts.length}/${totalParts} phần thành công. ` +
            `Vui lòng thử lại.`
          );
        }

        setFileState((prev) => ({
          ...prev,
          multipartStats: prev.multipartStats ? {
            ...prev.multipartStats,
            uploadStage: 'completing',
          } : undefined,
        }));

        console.log(`[Multipart] All parts uploaded successfully, completing...`);
        toast.info("Đang hoàn tất và ghép file...");
        
        const sortedParts = uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber);
        
        const completeResponse = await fetch("/api/s3/multipart/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uploadId,
            key,
            parts: sortedParts,
          }),
          signal: abortController.signal,
        });

        if (!completeResponse.ok) {
          const errorText = await completeResponse.text().catch(() => 'Unknown error');
          throw new Error(`Không thể hoàn tất upload: ${errorText}`);
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
            multipartStats: prev.multipartStats ? {
              ...prev.multipartStats,
              uploadStage: 'done',
            } : undefined,
          }));

          if (key) {
            onChange?.(key);
          }
          
          console.log(`[Multipart] Upload completed successfully! URL: ${uploadedUrl}`);
          toast.success("Tải lên video thành công!");
        }
      } catch (error) {
        if (error instanceof Error && (error.name === 'AbortError' || error.message.includes("bị hủy"))) {
          console.log("[Multipart] Upload cancelled by user");
          toast.info("Đã hủy upload");
        } else {
          console.error("[Multipart] Upload error:", error);
          toast.error(error instanceof Error ? error.message : "Upload thất bại");
        }

        if (uploadId && key) {
          try {
            console.log(`[Multipart] Aborting incomplete upload...`);
            await fetch("/api/s3/multipart/abort", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ uploadId, key }),
            });
            console.log("[Multipart] Aborted successfully");
          } catch (abortError) {
            console.error("[Multipart] Failed to abort upload:", abortError);
          }
        }

        setFileState((prev) => ({
          ...prev,
          uploading: false,
          error: true,
          multipartStats: undefined,
        }));
      }
    },
    [onChange, folder, uploadPartWithRetry]
  );
  

  const upLoadSinglePart = useCallback(
    async (file: File) => {
      setFileState((prev) => ({
        ...prev,
        uploading: true,
        progress: 0,
      }));
      try {
        console.log(`[Upload] Single-part upload for ${file.name} (${Math.round(file.size / 1024 / 1024)}MB)`);
        
        const presignedResponse = await fetch("/api/s3/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            size: file.size,
            isImage: fileTypeAccepted ==="image"? true: false,
            folder: folder,
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
              const uploadedUrl = `https://${env.NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES}.t3.storage.dev/${key}`;
              
              setFileState((prev) => ({
                ...prev,
                progress: 100,
                uploading: false,
                key: key,
                objectUrl: uploadedUrl,
              }));
              onChange?.(key);
              console.log(`[Upload] Single-part upload success: ${uploadedUrl}`);
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
  
  const upLoadFile = useCallback(
    async (file: File) => {
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

  const handleCancelUpload = useCallback(() => {
    if (fileState.abortController) {
      console.log("[Upload] User requested cancel");
      fileState.abortController.abort();
      setFileState((prev) => ({
        ...prev,
        uploading: false,
        progress: 0,
        multipartStats: undefined,
        abortController: undefined,
      }));
    }
  }, [fileState.abortController]);

  const handleTogglePause = useCallback(() => {
    setFileState((prev) => ({
      ...prev,
      isPaused: !prev.isPaused,
    }));
    toast.info(fileState.isPaused ? "Đã tiếp tục upload" : "Đã tạm dừng upload");
  }, [fileState.isPaused]);

  function renderContent() {
    if (fileState.uploading) {
      return (
        <RenderUploadingState
          file={fileState.file as File}
          progress={fileState.progress}
          multipartStats={fileState.multipartStats}
          onCancel={handleCancelUpload}
          isPaused={fileState.isPaused}
          onTogglePause={fileState.multipartStats ? handleTogglePause : undefined}
        />
      );
    }
    if (fileState.error) {
      return <RenderErrorState />;
    }
    if (fileState.objectUrl) {
      return (
        <RenderUploadedState  
          isDeleting={fileState.isDeleting}
          handleRemoveFile={handleRemoveFile}
          previewUrl={fileState.objectUrl}
          fileType={fileState.fileType}
        />
      );
    }
    return <RenderEmptyState isDragActive={isDragActive} />;
  }
  
  useEffect(() => {
    return () => {
      if (fileState.objectUrl && !fileState.objectUrl.startsWith("http")) {
        URL.revokeObjectURL(fileState.objectUrl);
      }
    };
  }, [fileState.objectUrl]);
  
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
    maxSize: fileTypeAccepted === "video" ? 400 * 1024 * 1024 : 10 * 1024 * 1024,
    onDropRejected: rejectedFiles,
    disabled: fileState.uploading || !!fileState.objectUrl,
  });

  return (
    <Card
      {...getRootProps()}
      className={cn(
        "relative border-2 border-dashed transition-colors duration-200 ease-in-out w-full",
        fileTypeAccepted === "video" ? "h-96" : "h-64",
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
