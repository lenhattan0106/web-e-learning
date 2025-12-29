import { Button } from "@/components/ui/button";
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogFooter, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger 
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { tryCatch } from "@/hooks/try-catch";
import {baiHocSchema, BaiHocSchemaType } from "@/lib/zodSchemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form";
import { createLesson } from "../action";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
export function NewLessonModal({idKhoaHoc,idChuong, suggestedName}:{idKhoaHoc:string,idChuong:string, suggestedName: string}){
    const router = useRouter();
    const [isOpen,setIsOpen]= useState(false);
    const [isPending, startTransition]= useTransition();
      const form = useForm<BaiHocSchemaType>({
        resolver: zodResolver(baiHocSchema),
        defaultValues: {
            ten: suggestedName,
            idKhoaHoc:idKhoaHoc,
            idChuong:idChuong,
        },
      });

      // Update form value when suggestedName changes
      useEffect(() => {
          form.setValue("ten", suggestedName);
      }, [suggestedName, form]);


    async function onSubmit(values: BaiHocSchemaType){
        startTransition(async() =>{
          const {data:result, error} = await tryCatch(createLesson(values));
          if(error){
            toast.error("Có lỗi xảy ra. Vui lòng hãy thử lại");
            return;
          }
          if(result.status ==="success"){
            toast.success(result.message);
            form.reset();
            setIsOpen(false);
            router.refresh();
          }else if(result.status==="error"){
            toast.error(result.message);
          }
        })
    }
    function handleOpenChange(open:boolean){
      if(!open){
        form.reset();
      }
      setIsOpen(open);
    }
    return(
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-center gap-1">
                    <Plus className="size-4" />
                    Tạo bài học 
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
               <DialogHeader>
                  <DialogTitle>Tạo bài học mới</DialogTitle>
                  <DialogDescription>Hãy đặt tên bài học mà bạn muốn</DialogDescription>
               </DialogHeader>
               <Form {...form}>
                   <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
                       <FormField control={form.control} name="ten" render={({field})=>(
                        <FormItem>
                            <FormLabel>Tên</FormLabel>
                            <FormControl>
                                <Input placeholder="Tên bài học" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                       )} />
                    <DialogFooter>
                       <Button disabled={isPending} type="submit">
                         {isPending ? "Đang xử lý...": "Lưu thay đổi"}
                        </Button>    
                    </DialogFooter> 
                   </form>
               </Form>
            </DialogContent>
        </Dialog>
    )
}