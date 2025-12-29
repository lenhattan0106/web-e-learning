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
import { Pencil } from "lucide-react";
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form";
import { updateLessonTitle } from "../action";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function EditLessonModal({idKhoaHoc, idChuong, idBaiHoc, tenBaiHoc}:{idKhoaHoc:string, idChuong:string, idBaiHoc: string, tenBaiHoc: string}){
    const router = useRouter();
    const [isOpen,setIsOpen]= useState(false);
    const [isPending, startTransition]= useTransition();
      const form = useForm<BaiHocSchemaType>({
        resolver: zodResolver(baiHocSchema),
        defaultValues: {
            ten: tenBaiHoc,
            idKhoaHoc:idKhoaHoc,
            idChuong:idChuong,
        },
      });

    async function onSubmit(values: BaiHocSchemaType){
        startTransition(async() =>{
          const {data:result, error} = await tryCatch(updateLessonTitle(values, idBaiHoc));
          if(error){
            toast.error("Có lỗi xảy ra. Vui lòng hãy thử lại");
            return;
          }
          if(result.status ==="success"){
            toast.success(result.message);
            setIsOpen(false);
            router.refresh();
          }else if(result.status==="error"){
            toast.error(result.message);
          }
        })
    }

    function handleOpenChange(open:boolean){
      if(open){
         form.reset({
            ten: tenBaiHoc,
            idKhoaHoc:idKhoaHoc,
            idChuong:idChuong,
        });
      }
      setIsOpen(open);
    }

    return(
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-neutral-950">
                    <Pencil className="size-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
               <DialogHeader>
                  <DialogTitle>Chỉnh sửa tên bài học</DialogTitle>
                  <DialogDescription>Thay đổi tên bài học tại đây</DialogDescription>
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
