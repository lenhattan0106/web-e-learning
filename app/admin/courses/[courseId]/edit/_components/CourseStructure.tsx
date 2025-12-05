"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DndContext,
  DraggableSyntheticListeners,
  KeyboardSensor,
  PointerSensor,
  rectIntersection,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ReactNode, useState, useTransition, useEffect } from "react"; // 👈 Thêm useEffect
import { CSS } from "@dnd-kit/utilities";
import { AdminCourseSingularType } from "@/app/data/admin/edit-course";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  GripVertical,
  Trash2,
  TrashIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { reorderChapter, reorderLessons } from "../action";
import { NewChapterModal } from "./NewChapterModel";
import { useRouter } from "next/navigation";
import { NewLessonModal } from "./NewLessonModal";
import { DeleteLesson } from "./DeleteLesson";
import { DeleteChapter } from "./DeleteChapter";

interface iAppProps {
  data: AdminCourseSingularType;
}
interface SortableItemProps {
  id: string;
  children: (listeners: DraggableSyntheticListeners) => ReactNode;
  className?: string;
  data?: {
    type: "chapter" | "lesson";
    chapterId?: string;
  };
}

export function CourseStructure({ data }: iAppProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // 👇 Helper function để format data
  const formatChapters = (chapters: typeof data.chapter) => {
    const sortedChapters = [...chapters].sort((a, b) => a.position - b.position);
    
    return sortedChapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      order: chapter.position,
      isOpen: true,
      lessons: [...chapter.lessons]
        .sort((a, b) => a.position - b.position)
        .map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          order: lesson.position,
        })),
    }));
  };
  
  const [items, setItems] = useState(() => formatChapters(data.chapter));
  
  // 👇 Thêm useEffect để sync khi data thay đổi
  useEffect(() => {
    setItems(formatChapters(data.chapter));
  }, [data.chapter]);

  function SortableItem({ children, id, className, data }: SortableItemProps) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: id, data: data });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className={cn("touch-none", className, isDragging ? "z-10" : "")}
      >
        {children(listeners)}
      </div>
    );
  }
  
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const activeId = active.id;
    const overId = over.id;
    const activeType = active.data.current?.type as "chapter" | "lesson";
    const overType = over.data.current?.type as "chapter" | "lesson";
    const courseId = data.id;
    
    if (activeType === "chapter") {
      let targetChapterId = null;
      if (overType === "chapter") {
        targetChapterId = overId;
      } else if (overType === "lesson") {
        targetChapterId = over.data.current?.chapterId ?? null;
      }
      if (!targetChapterId) {
        toast.error("Không thể xác định chương để sắp xếp lại");
        return;
      }
      const oldIndex = items.findIndex((item) => item.id === activeId);
      const newIndex = items.findIndex((item) => item.id === targetChapterId);
      if (oldIndex === -1 || newIndex === -1) {
        toast.error("Không thể tìm thấy vị trí cũ/mới của chương để sắp xếp lại");
        return;
      }
      const reordedLocalChapter = arrayMove(items, oldIndex, newIndex);
      const updatedChapterForState = reordedLocalChapter.map(
        (chapter, index) => ({
          ...chapter,
          order: index + 1,
        })
      );
      const previousItems = [...items];
      
      setItems(updatedChapterForState);
      
      if (courseId) {
        const chaptersToUpdate = updatedChapterForState.map((chapter) => ({
          id: chapter.id,
          position: chapter.order,
        }));
        
        startTransition(async () => {
          try {
            const result = await reorderChapter(courseId, chaptersToUpdate);
            
            if (result.status === "success") {
              toast.success(result.message);
              router.refresh();
            } else {
              toast.error(result.message);
              setItems(previousItems);
            }
          } catch (error) {
            toast.error("Lỗi khi sắp xếp lại các chương");
            setItems(previousItems);
          }
        });
      }
      return;
    }
    
    if (activeType === "lesson" && overType === "lesson") {
      const chapterId = active.data.current?.chapterId;
      const overChapterId = over.data.current?.chapterId;
      if (!chapterId || chapterId !== overChapterId) {
        toast.error("Không thể di chuyển bài học giữa các chương khác nhau");
        return;
      }
      const chapterIndex = items.findIndex(
        (chapter) => chapter.id === chapterId
      );
      if (chapterIndex === -1) {
        toast.error("Không thể tìm thấy chương cho bài học");
        return;
      }
      const chapterToUpdate = items[chapterIndex];
      const oldLessonIndex = chapterToUpdate.lessons.findIndex(
        (lesson) => lesson.id === activeId
      );
      const newLessonIndex = chapterToUpdate.lessons.findIndex(
        (lesson) => lesson.id === overId
      );
      if (oldLessonIndex === -1 || newLessonIndex === -1) {
        toast.error("Không thể tìm thấy bài học để sắp xếp lại");
        return;
      }
      const reordedLessons = arrayMove(
        chapterToUpdate.lessons,
        oldLessonIndex,
        newLessonIndex
      );
      const updatedLessonForState = reordedLessons.map((lesson, index) => ({
        ...lesson,
        order: index + 1,
      }));
      const newItems = [...items];
      newItems[chapterIndex] = {
        ...chapterToUpdate,
        lessons: updatedLessonForState,
      };
      const previousItems = [...items];
      
      setItems(newItems);
      
      if (courseId) {
        const lessonsToUpdate = updatedLessonForState.map((lesson) => ({
          id: lesson.id,
          position: lesson.order,
        }));
        
        startTransition(async () => {
          try {
            const result = await reorderLessons(
              chapterId,
              lessonsToUpdate,
              courseId
            );
            
            if (result.status === "success") {
              toast.success(result.message);
              router.refresh();
            } else {
              toast.error(result.message);
              setItems(previousItems);
            }
          } catch (error) {
            toast.error("Sắp xếp bài học thất bại");
            setItems(previousItems);
          }
        });
      }
      return;
    }
  }
  
  function toogleChapter(chapterId: string) {
    setItems(
      items.map((chapter) =>
        chapter.id === chapterId
          ? { ...chapter, isOpen: !chapter.isOpen }
          : chapter
      )
    );
  }
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  return (
    <DndContext
      collisionDetection={rectIntersection}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-border">
          <CardTitle>Chương</CardTitle>
          <NewChapterModal courseId={data.id}></NewChapterModal>
        </CardHeader>
        <CardContent className="space-y-8">
          {isPending && (
            <div className="text-sm text-muted-foreground">
              Đang cập nhật dữ liệu
            </div>
          )}
          <SortableContext
            items={items.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            {items.map((item) => (
              <SortableItem
                id={item.id}
                data={{ type: "chapter" }}
                key={item.id}
              >
                {(listeners) => (
                  <Card>
                    <Collapsible
                      open={item.isOpen}
                      onOpenChange={() => toogleChapter(item.id)}
                    >
                      <div className="flex items-center justify-between p-3 border-b border-border">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            {...listeners}
                            disabled={isPending}
                          >
                            <GripVertical className="size-4"></GripVertical>
                          </Button>
                          <CollapsibleTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="flex items-center"
                            >
                              {item.isOpen ? (
                                <ChevronDown className="size-4"></ChevronDown>
                              ) : (
                                <ChevronRight className="size-4"></ChevronRight>
                              )}
                            </Button>
                          </CollapsibleTrigger>
                          <p className="cursor-pointer hover:text-primary pl-2">
                            {item.title}
                          </p>
                        </div>
                        <DeleteChapter chapterId={item.id} courseId={data.id}></DeleteChapter>
                      </div>
                      <CollapsibleContent>
                        <div className="p-1">
                          <SortableContext
                            items={item.lessons.map((lesson) => lesson.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {item.lessons.map((lesson) => (
                              <SortableItem
                                key={lesson.id}
                                id={lesson.id}
                                data={{ type: "lesson", chapterId: item.id }}
                              >
                                {(lessonListeners) => (
                                  <div className="flex items-center justify-between p-2 hover:bg-accent">
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        {...lessonListeners}
                                        disabled={isPending}
                                      >
                                        <GripVertical className="size-4"></GripVertical>
                                      </Button>
                                      <FileText className="size-4"></FileText>
                                      <Link
                                        href={`/admin/courses/${data.id}/${item.id}/${lesson.id}`}
                                      >
                                        {lesson.title}
                                      </Link>
                                    </div>
                                    <DeleteLesson chapterId={item.id} courseId={data.id} lessonId={lesson.id}></DeleteLesson>
                                  </div>
                                )}
                              </SortableItem>
                            ))}
                          </SortableContext>
                          <div className="p-2">
                              <NewLessonModal chapterId={item.id} courseId={data.id}></NewLessonModal>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                )}
              </SortableItem>
            ))}
          </SortableContext>
        </CardContent>
      </Card>
    </DndContext>
  );
}
