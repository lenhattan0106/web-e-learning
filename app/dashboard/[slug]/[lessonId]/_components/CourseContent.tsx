"use client"
import { LessonContentType } from "@/app/data/course/get-lesson-content";
import { RenderDescription } from "@/components/rich-text-editor/RenderDescription";
import { Button } from "@/components/ui/button";
import { tryCatch } from "@/hooks/try-catch";
import { useConstructUrl } from "@/hooks/use-contruct-url";
import { BookIcon, CheckCircle } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { markLessonComplete } from "../action";
import { toast } from "sonner";
import { useConfetti } from "@/hooks/use-confetti";
import { ReportCourseButton } from "./ReportCourseButton";

interface iAppProps {
  data: LessonContentType;
}

export function CourseContent({ data }: iAppProps) {
  const [pending, startTransition] = useTransition();
  const [isCompleted, setIsCompleted] = useState(data.tienTrinhHocs.length > 0);
  const { triggerConfetti } = useConfetti();
  
  // Track the highest point watched (prevents skipping)
  const maxTimeWatchedRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Update max time when video progresses
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      if (currentTime > maxTimeWatchedRef.current) {
        maxTimeWatchedRef.current = currentTime;
      }
    }
  };

  // Auto-complete when video ends (if watched 80%+)
  const handleVideoEnded = () => {
    if (isCompleted) return; // Already completed
    
    const videoDuration = videoRef.current?.duration || 0;
    if (videoDuration === 0) return;
    
    const watchPercentage = (maxTimeWatchedRef.current / videoDuration) * 100;
    
    if (watchPercentage >= 80) {
      // Auto-complete lesson
      handleMarkComplete(true);
    }
  };

  function handleMarkComplete(isAuto = false) {
    startTransition(async () => {
      const { data: result, error } = await tryCatch(
        markLessonComplete(data.id, data.chuong.khoaHoc.duongDan)
      );
      if (error) {
        toast.error("Đã xảy ra lỗi không mong muốn. Vui lòng thử lại");
        return;
      }
      if (result.status === "success") {
        setIsCompleted(true);
        toast.success(isAuto ? "Bài học đã hoàn thành!" : result.message);
        triggerConfetti();
      } else if (result.status === "error") {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col h-full bg-background pl-6">
      {/* Video Player */}
      {data.maVideo ? (
        <VideoPlayer
          videoRef={videoRef}
          maVideo={data.maVideo}
          anhBaiHoc={data.anhBaiHoc ?? ""}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleVideoEnded}
        />
      ) : (
        <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center">
          <BookIcon className="size-16 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            Video bài học này đang được cập nhật
          </p>
        </div>
      )}

      <div className="py-4 border-b flex items-center justify-between">
        <div>
          {isCompleted ? (
            <Button variant="outline" className="bg-green-500/10 text-green-500">
              <CheckCircle className="size-4 mr-2 text-green-500" />
              Đã hoàn thành
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => handleMarkComplete(false)}
              disabled={pending}
            >
              <CheckCircle className="size-4 mr-2 text-green-500" />
              Đánh dấu để hoàn thành khóa học
            </Button>
          )}
        </div>
        {/* Report Course Button - PM approved placement */}
        <ReportCourseButton
          courseId={data.chuong.khoaHoc.id}
          courseName={data.chuong.khoaHoc.tenKhoaHoc}
          lessonId={data.id}
        />
      </div>
      <div className="space-y-2 pt-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {data.tenBaiHoc}
        </h1>
        {data.moTa && (
          <RenderDescription json={JSON.parse(data.moTa)} />
        )}
      </div>
    </div>
  );
}

// Separate VideoPlayer component for clean separation
interface VideoPlayerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  maVideo: string;
  anhBaiHoc: string;
  onTimeUpdate: () => void;
  onEnded: () => void;
}

function VideoPlayer({
  videoRef,
  maVideo,
  anhBaiHoc,
  onTimeUpdate,
  onEnded,
}: VideoPlayerProps) {
  const videoUrl = useConstructUrl(maVideo);
  const thumbnailUrl = useConstructUrl(anhBaiHoc);

  return (
    <div className="aspect-video bg-black rounded-lg relative overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        controls
        poster={thumbnailUrl}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
      >
        <source src={videoUrl} type="video/mp4" />
        <source src={videoUrl} type="video/webm" />
        <source src={videoUrl} type="video/ogg" />
        Trình duyệt của bạn không hỗ trợ phát video này. Vui lòng chọn nền tảng khác
      </video>
    </div>
  );
}


