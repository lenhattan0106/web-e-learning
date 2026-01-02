"use client";

import { useState, useEffect } from "react";
import { SidebarChat } from "./SidebarChat";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { 
  PanelLeftClose, 
  PanelLeftOpen, 
  Menu,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChatLayoutProps {
  courses: any[];
  children: React.ReactNode;
  baseUrl: string;
}

export function ChatLayout({ courses, children, baseUrl }: ChatLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedState = localStorage.getItem("chat-sidebar-collapsed");
    if (savedState) {
      setIsCollapsed(savedState === "true");
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("chat-sidebar-collapsed", String(isCollapsed));
    }
  }, [isCollapsed, mounted]);


  if (!mounted) {
     return (
        <div className="flex h-[calc(100vh-120px)] border rounded-xl overflow-hidden bg-background shadow-sm ring-1 ring-border/50">
            <div className="w-80 border-r flex flex-col bg-muted/30 hidden md:flex">
                <div className="h-14 border-b px-4 flex items-center justify-between">...</div>
            </div>
             <div className="flex-1 bg-background relative z-10">
                 {children}
             </div>
        </div>
     );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] border rounded-xl overflow-hidden bg-background shadow-sm ring-1 ring-border/50 relative">
      {/* Mobile Sidebar (Sheet) */}
      {isMobile && (
        <Sheet>
          <SheetTrigger asChild>
            <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-3 left-3 z-[50] h-8 w-8 hover:bg-background/80 backdrop-blur-sm"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80">
            <SheetTitle className="sr-only">Danh sách lớp học</SheetTitle>
            <div className="h-14 border-b px-4 flex items-center justify-between shrink-0 bg-background/50">
                <div className="flex items-center gap-2 font-semibold text-sm">
                    <MessageSquare className="size-4 text-primary" />
                    <span>Danh sách lớp học</span>
                </div>
                <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted border font-mono">
                    {courses.length}
                </span>
            </div>
            <ScrollArea className="flex-1 h-[calc(100vh-3.5rem)]">
              <SidebarChat courses={courses} baseUrl={baseUrl} />
            </ScrollArea>
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop Sidebar (Collapsible) */}
      {!isMobile && (
        <div 
          className={cn(
            "border-r flex flex-col bg-muted/30 backdrop-blur-sm transition-all duration-300 ease-in-out relative",
            isCollapsed ? "w-[90px]" : "w-80"


          )}
        >
          {/* Header */}
          <div className={cn(
              "h-14 border-b flex items-center shrink-0 bg-background/50",
              isCollapsed ? "justify-center px-0" : "justify-between px-4"
          )}>
              {!isCollapsed && (
                <>
                    <div className="flex items-center gap-2 font-semibold text-sm">
                        <MessageSquare className="size-4 text-primary" />
                        <span>Danh sách lớp</span>
                    </div>
                    <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted border font-mono">
                        {courses.length}
                    </span>
                </>
              )}
              
              <Button 
                onClick={() => setIsCollapsed(!isCollapsed)} 
                variant="ghost" 
                size="icon"
                className={cn("h-8 w-8", isCollapsed && "bg-transparent hover:bg-muted")}
                title={isCollapsed ? "Mở danh sách" : "Thu gọn"}
              >
                  {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </Button>
          </div>

          <ScrollArea className="flex-1 px-2 py-2">
            <SidebarChat courses={courses} baseUrl={baseUrl} isCollapsed={isCollapsed} />
          </ScrollArea>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-background relative z-10 transition-all duration-300">
         {children}
      </div>
    </div>
  );
}
