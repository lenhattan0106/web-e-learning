"use client";

import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { SidebarChat } from "./SidebarChat"; 
import { useState } from "react"; 

interface MobileChatSidebarProps {
  courses: any[];
}

export const MobileChatSidebar = ({ courses }: MobileChatSidebarProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="md:hidden pr-4 hover:opacity-75 transition">
          <Menu className="h-6 w-6 text-muted-foreground" />
        </button>
      </SheetTrigger>
      
      <SheetContent side="left" className="p-0 bg-background w-72">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <div className="p-4 border-b font-semibold text-lg">Danh sách hội thoại</div>
        
        <div className="h-full overflow-y-auto" onClick={() => setOpen(false)}> 
           <SidebarChat courses={courses} baseUrl="/teacher/chat" />
        </div>
      </SheetContent>
    </Sheet>
  );
};
