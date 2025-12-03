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
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ReactNode, useState } from "react";
import { CSS } from "@dnd-kit/utilities";
import { AdminCourseSingularType } from "@/app/data/admin/edit-course";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, DeleteIcon, FileText, GripVertical, Trash2, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface iAppProps {
  data: AdminCourseSingularType;
}
interface SortableItemProps {
  id: string;
  children: (listeners: DraggableSyntheticListeners) => ReactNode;
  className?: string;
  data?: {
    type: "chapter" | "lesson";
    chapterId?: string; //only relevant for lessons
  };
}
export function CourseStructure({ data }: iAppProps) {
  const initialItems =
    data.chapter.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      order: chapter.position,
      isOpen: true, //default chapter
      lessons: chapter.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        order: lesson.position,
      })),
    })) || [];
  const [items, setItems] = useState(initialItems);
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
  function handleDragEnd(event) {
    const { active, over } = event;

    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
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
        </CardHeader>
        <CardContent>
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
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
                          <Button variant="ghost" size="icon"
                            {...listeners}
                          >
                            <GripVertical className="size-4"></GripVertical>
                          </Button>
                          <CollapsibleTrigger asChild>
                            <Button size="icon" variant="ghost" className="flex items-center">
                              {item.isOpen ? (
                                <ChevronDown className="size-4"></ChevronDown>
                              ) : (
                                <ChevronRight className="size-4"></ChevronRight>
                              )}
                            </Button>
                          </CollapsibleTrigger>
                          <p className="cursor-pointer hover:text-primary pl-2">{item.title}</p>
                        </div>
                        <Button size="icon" variant="outline"><Trash2 className="size-4"></Trash2></Button>
                      </div>
                      <CollapsibleContent>
                        <div className="p-1">
                            <SortableContext items={item.lessons.map((lesson)=>lesson.id)} strategy={verticalListSortingStrategy}>
                                {item.lessons.map((lesson)=>(
                                    <SortableItem key={lesson.id} id={lesson.id} data={{type:"lesson",chapterId:item.id}}>
                                        {(lessonListeners)=>(
                                           <div className="flex items-center justify-between p-2 hover:bg-accent">
                                                  <div className="flex items-center gap-2">
                                                    <Button variant="ghost" size="icon" {...lessonListeners}>
                                                        <GripVertical className="size-4"></GripVertical>
                                                    </Button>
                                                    <FileText className="size-4"></FileText>
                                                    <Link href={`/admin/courses/${data.id}/${item.id}/${lesson.id}`}>{lesson.title}</Link>
                                                  </div>
                                                  <Button variant="outline" size="icon">
                                                    <TrashIcon className="size-4"></TrashIcon>
                                                  </Button>
                                           </div>
                                        )}
                                    </SortableItem>
                                ))}
                            </SortableContext>
                            <div className="p-2">
                                <Button variant="outline" className="w-full">Tạo bài học mới</Button>
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
