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
import { ReactNode, useState, useTransition, useEffect } from "react";
import { CSS } from "@dnd-kit/utilities";
import { TeacherEditCourseType } from "@/app/data/teacher/edit-course";
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
import { EditChapterModal } from "./EditChapterModal";
import { EditLessonModal } from "./EditLessonModal";

interface iAppProps {
  data: TeacherEditCourseType;
}
interface SortableItemProps {
  id: string;
  children: (listeners: DraggableSyntheticListeners) => ReactNode;
  className?: string;
  data?: {
    type: "chapter" | "lesson";
    idChuong?: string;
  };
}

export function CourseStructure({ data }: iAppProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // Check if course has paid students
  const hasStudents = (data._count?.dangKyHocs ?? 0) > 0;
  
  // Helper function để format data
  const formatChapters = (chuongs: typeof data.chuongs) => {
    const sortedChuongs = [...chuongs].sort((a, b) => a.thuTu - b.thuTu);
    
    return sortedChuongs.map((chuong) => ({
      id: chuong.id,
      tenChuong: chuong.tenChuong,
      thuTu: chuong.thuTu,
      isOpen: true,
      baiHocs: [...chuong.baiHocs]
        .sort((a, b) => a.thuTu - b.thuTu)
        .map((baiHoc) => ({
          id: baiHoc.id,
          tenBaiHoc: baiHoc.tenBaiHoc,
          thuTu: baiHoc.thuTu,
        })),
    }));
  };
  
  const [items, setItems] = useState(() => formatChapters(data.chuongs));
  
  // Sync khi data thay đổi
  useEffect(() => {
    setItems(formatChapters(data.chuongs));
  }, [data.chuongs]);

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
    const idKhoaHoc = data.id;
    
    if (activeType === "chapter") {
      let targetChuongId = null;
      if (overType === "chapter") {
        targetChuongId = overId;
      } else if (overType === "lesson") {
        targetChuongId = over.data.current?.idChuong ?? null;
      }
      if (!targetChuongId) {
        toast.error("Không thể xác định chương để sắp xếp lại");
        return;
      }
      const oldIndex = items.findIndex((item) => item.id === activeId);
      const newIndex = items.findIndex((item) => item.id === targetChuongId);
      if (oldIndex === -1 || newIndex === -1) {
        toast.error("Không thể tìm thấy vị trí cũ/mới của chương để sắp xếp lại");
        return;
      }
      const reordedLocalChuongs = arrayMove(items, oldIndex, newIndex);
      const updatedChuongsForState = reordedLocalChuongs.map(
        (chuong, index) => ({
          ...chuong,
          thuTu: index + 1,
        })
      );
      const previousItems = [...items];
      
      setItems(updatedChuongsForState);
      
      if (idKhoaHoc) {
        const chuongsToUpdate = updatedChuongsForState.map((chuong) => ({
          id: chuong.id,
          thuTu: chuong.thuTu,
        }));
        
        startTransition(async () => {
          try {
            const result = await reorderChapter(idKhoaHoc, chuongsToUpdate);
            
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
      const idChuong = active.data.current?.idChuong;
      const overIdChuong = over.data.current?.idChuong;
      if (!idChuong || idChuong !== overIdChuong) {
        toast.error("Không thể di chuyển bài học giữa các chương khác nhau");
        return;
      }
      const chuongIndex = items.findIndex(
        (chuong) => chuong.id === idChuong
      );
      if (chuongIndex === -1) {
        toast.error("Không thể tìm thấy chương cho bài học");
        return;
      }
      const chuongToUpdate = items[chuongIndex];
      const oldBaiHocIndex = chuongToUpdate.baiHocs.findIndex(
        (baiHoc) => baiHoc.id === activeId
      );
      const newBaiHocIndex = chuongToUpdate.baiHocs.findIndex(
        (baiHoc) => baiHoc.id === overId
      );
      if (oldBaiHocIndex === -1 || newBaiHocIndex === -1) {
        toast.error("Không thể tìm thấy bài học để sắp xếp lại");
        return;
      }
      const reordedBaiHocs = arrayMove(
        chuongToUpdate.baiHocs,
        oldBaiHocIndex,
        newBaiHocIndex
      );
      const updatedBaiHocsForState = reordedBaiHocs.map((baiHoc, index) => ({
        ...baiHoc,
        thuTu: index + 1,
      }));
      const newItems = [...items];
      newItems[chuongIndex] = {
        ...chuongToUpdate,
        baiHocs: updatedBaiHocsForState,
      };
      const previousItems = [...items];
      
      setItems(newItems);
      
      if (idKhoaHoc) {
        const baiHocsToUpdate = updatedBaiHocsForState.map((baiHoc) => ({
          id: baiHoc.id,
          thuTu: baiHoc.thuTu,
        }));
        
        startTransition(async () => {
          try {
            const result = await reorderLessons(
              idChuong,
              baiHocsToUpdate,
              idKhoaHoc
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
  
  function toogleChapter(idChuong: string) {
    setItems(
      items.map((chuong) =>
        chuong.id === idChuong
          ? { ...chuong, isOpen: !chuong.isOpen }
          : chuong
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
          <NewChapterModal 
            idKhoaHoc={data.id} 
            suggestedName={`Chương ${items.length + 1}`} 
          />
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
                            {item.tenChuong}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                           <EditChapterModal idKhoaHoc={data.id} idChuong={item.id} tenChuong={item.tenChuong} />
                           <DeleteChapter idChuong={item.id} idKhoaHoc={data.id} hasStudents={hasStudents} />
                        </div>
                      </div>
                      <CollapsibleContent>
                        <div className="p-1">
                          <SortableContext
                            items={item.baiHocs.map((baiHoc) => baiHoc.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {item.baiHocs.map((baiHoc) => (
                              <SortableItem
                                key={baiHoc.id}
                                id={baiHoc.id}
                                data={{ type: "lesson", idChuong: item.id }}
                              >
                                {(baiHocListeners) => (
                                  <div className="flex items-center justify-between p-2 hover:bg-accent">
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        {...baiHocListeners}
                                        disabled={isPending}
                                      >
                                        <GripVertical className="size-4"></GripVertical>
                                      </Button>
                                      <FileText className="size-4"></FileText>
                                      <Link
                                        href={`/teacher/courses/${data.id}/${item.id}/${baiHoc.id}`}
                                      >
                                        {baiHoc.tenBaiHoc}
                                      </Link>
                                    </div>
                                    <div className="flex items-center gap-1">
                                       <EditLessonModal 
                                            idKhoaHoc={data.id} 
                                            idChuong={item.id} 
                                            idBaiHoc={baiHoc.id} 
                                            tenBaiHoc={baiHoc.tenBaiHoc} 
                                       />
                                       <DeleteLesson idChuong={item.id} idKhoaHoc={data.id} idBaiHoc={baiHoc.id} hasStudents={hasStudents} />
                                    </div>
                                  </div>
                                )}
                              </SortableItem>
                            ))}
                          </SortableContext>
                          <div className="p-2">
                              {/* Integrated suggestedName here */}
                              <NewLessonModal 
                                idChuong={item.id} 
                                idKhoaHoc={data.id}
                                suggestedName={`Bài ${item.baiHocs.length + 1}: `}
                              />
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

