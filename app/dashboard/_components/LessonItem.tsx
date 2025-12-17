import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Play } from "lucide-react";
import Link from "next/link";

interface iAppProps {
  lesson: {
    id: string;
    tenBaiHoc: string;
    thuTu: number;
    moTa: string | null;
  };
  slug:string;
  isActive?:boolean;
  completed: boolean
}

export function LessonItem({lesson,slug,isActive, completed =true}:iAppProps) {
  return (
    <Link
      href={`/dashboard/${slug}/${lesson.id}`}
      className={cn(
            "inline-flex items-center justify-start gap-2 w-full p-3 h-auto rounded-md text-sm font-medium transition-all duration-200 border", 
            completed 
              ? 'bg-emerald-50/20 dark:bg-emerald-400/10 border-emerald-200/50 dark:border-emerald-400/30 shadow-sm hover:bg-emerald-100/30 dark:hover:bg-emerald-400/15 hover:border-emerald-300/60 dark:hover:border-emerald-400/40'
              : 'bg-background border-border hover:bg-accent/60 dark:hover:bg-accent/40 hover:border-muted-foreground/30',
              isActive &&  !completed && 'bg-primary/10 dark:bg-primary/20 border-primary/50 hover:bg-primary/20 dark:hover:bg-primary/30 text-primary-foreground'  
        )}
    >
        <div className="flex items-center gap-3 w-full min-w-0">
            {completed ? (
                <div className="size-6 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-400 dark:to-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
                    <Check className="size-3.5 text-white" strokeWidth={2.5} />
                </div>
            ):(
             <div className={cn(
                "size-6 rounded-full border-2 border-muted-foreground/30 bg-muted/30 flex justify-center items-center shrink-0",isActive ? "border-primary bg-primary/10 dark:bg-primary/20":"border-muted-foreground/60"
             )}>
                <Play className={cn("size-3 fill-muted-foreground",isActive ? "text-primary":"text-muted-foreground")} />
             </div>
            )}
             <div className="flex-1 text-left min-w-0 space-y-0.5">
                <p className={cn(
                    "text-sm font-medium truncate leading-tight", 
                    completed 
                      ? 'text-emerald-700 dark:text-emerald-300' 
                      : isActive ?"text-primary font-semibold":"text-foreground"
                )}>
                  {lesson.thuTu}. {lesson.tenBaiHoc}
                </p>
                {completed && (
                    <p className="text-xs text-emerald-600/80 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                      <span className="size-1 rounded-full bg-emerald-500 dark:bg-emerald-400 inline-block"></span>
                      Đã hoàn thành
                    </p>
                )}
                {isActive && !completed && (
                    <p className="text-xs text-primary/80 dark:text-primary font-medium flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-primary dark:bg-primary inline-block animate-pulse"></span>
                      Đang xem
                    </p>
                )}
             </div>
        </div>
    </Link>
  );
}
