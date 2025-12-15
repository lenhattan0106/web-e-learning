"use client"
import { LessonContentType } from "@/app/data/course/get-lesson-content";
import { RenderDescription } from "@/components/rich-text-editor/RenderDescription";
import { Button } from "@/components/ui/button";
import { tryCatch } from "@/hooks/try-catch";
import { useConstructUrl } from "@/hooks/use-contruct-url";
import { BookIcon, CheckCircle } from "lucide-react";
import { useTransition } from "react";
import { markLessonComplete } from "../action";
import { toast } from "sonner";
import { useConfetti } from "@/hooks/use-confetti";

interface iAppProps {
  data: LessonContentType;
}

export function CourseContent({ data }: iAppProps) {
  const [pending, startTransition] = useTransition();
  const {triggerConfetti} = useConfetti()
  function VideoPlayer({
    thumbnailKey,
    videoKey,
  }: {
    thumbnailKey: string;
    videoKey: string;
  }) {
    const videoUrl = useConstructUrl(videoKey);
    const thumbnailUrl = useConstructUrl(thumbnailKey);
    if (!videoKey) {
      return (
        <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center">
          <BookIcon className="size-16 text-primary mx-auto mb-4"></BookIcon>
          <p className="text-muted-foreground">
            Video bài học này đang được cập nhật
          </p>
        </div>
      );
    }
    return (
      <div className="aspect-video bg-black rounded-lg relative overflow-hidden">
        <video
          className="w-full h-full object-cover"
          controls
          poster={thumbnailUrl}
        >
          <source src={videoUrl} type="video/mp4"></source>
          <source src={videoUrl} type="video/webm"></source>
          <source src={videoUrl} type="video/ogg"></source>
          Trình duyệt của bạn không hỗ trợ phát video này. Vui lòng chọn nền tảng khác
        </video>
      </div>
    );
  }

    function onSubmit() {
    startTransition(async () => {
      const { data: result, error } = await tryCatch(markLessonComplete(data.id,data.chapter.course.slug));
      if (error) {
        toast.error("Đã xảy ra lỗi không mong muốn. Vui lòng thử lại");
        return;
      }
      if (result.status === "success") {
        toast.success(result.message);
        triggerConfetti();
      } else if (result.status === "error") {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col h-full bg-background pl-6">
      <VideoPlayer
        thumbnailKey={data.thumbnailKey ?? ""}
        videoKey={data.videoKey ?? ""}
      ></VideoPlayer>
   
      <div className="py-4 border-b">
        {data.lessonProgress.length >0 ?(
          <Button variant="outline" className="bg-green-500/10 text-green-500">
             <CheckCircle className="size-4 mr-2 text-green-500"></CheckCircle>
             Đã hoàn thành
          </Button>
        ):(
        <Button variant="outline" onClick={onSubmit} disabled={pending}>
          <CheckCircle className="size-4 mr-2 text-green-500"></CheckCircle>
          Đánh dấu để hoàn thành khóa học
        </Button>
        )}
      </div>
      <div className="space-y-2 pt-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{data.title}</h1>
        {data.description && (
          <RenderDescription
            json={JSON.parse(data.description)}
          ></RenderDescription>
        )}
      </div>
    </div>
  );
}


