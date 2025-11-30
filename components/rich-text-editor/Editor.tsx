"use client";
import { EditorContent, useEditor } from "@tiptap/react";
import StaterKit from "@tiptap/starter-kit";
import { Menubar } from "./Menubar";
import TextAlign from "@tiptap/extension-text-align";
import { ControllerRenderProps } from "react-hook-form"
import { CourseSchemaType } from "@/lib/zodSchemas";

export function RichTextEditor({
  field,
}: {
  field: ControllerRenderProps<CourseSchemaType, "description">;
})  {
  const editor = useEditor({
    extensions: [StaterKit,TextAlign.configure({
      types:["heading","paragraph"]
    })],
     immediatelyRender: false,
     editorProps:{
      attributes:{
        class:"min-h-[300px] p-4 focus:outline-none prose prose-sm sm:prose lg:prose-lg xl:prose-xl dark:prose-invert !w-full !max-w-none"
      }
     },
     onUpdate:({editor})=>{
       field.onChange(JSON.stringify(editor.getJSON()))
     },
     content: field.value ? JSON.parse(field.value) : '<p>Hello Word</p>'
  });
  return(
    <div className="w-full border border-input rounded-lg overflow-hidden dark:bg-input/30"> 
        <Menubar editor={editor}></Menubar>
        <EditorContent editor={editor}></EditorContent>
    </div>
  )
}
