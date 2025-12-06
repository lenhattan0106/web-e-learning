"use client";
import { EditorContent, useEditor } from "@tiptap/react";
import StaterKit from "@tiptap/starter-kit";
import { Menubar } from "./Menubar";
import TextAlign from "@tiptap/extension-text-align";
import { ControllerRenderProps,FieldPath, FieldValues } from "react-hook-form"

export function RichTextEditor<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  field,
}: {
  field: ControllerRenderProps<TFieldValues, TName>;
})   {
  const getInitialContent = () => {
    if (!field.value) {
      return '<p>Chào mừng bạn đến với NT E-Learning</p>';
    }
    try {
      // Thử parse JSON
      return JSON.parse(field.value);
    } catch {
      // Nếu không phải JSON, wrap text thuần vào paragraph
      return `<p>${field.value}</p>`;
    }
  };

  const editor = useEditor({
    extensions: [StaterKit,TextAlign.configure({
      types:["heading","paragraph"]
    })],
     immediatelyRender: false,
     editorProps:{
      attributes:{
        class:"min-h-[300px] p-4 focus:outline-none prose prose-sm sm:prose lg:prose-lg xl:prose-xl dark:prose-invert !w-full !max-w-none bg-white dark:bg-transparent"
      }
     },
     onUpdate:({editor})=>{
       field.onChange(JSON.stringify(editor.getJSON()))
     },
     content: getInitialContent()
  });
  return(
    <div className="w-full border-2 border-input rounded-lg overflow-hidden bg-white dark:bg-input/30 shadow-sm"> 
        <Menubar editor={editor}></Menubar>
        <EditorContent editor={editor}></EditorContent>
    </div>
  )
}
