"use client";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  courseCategories,
  courseLevels,
  courseSchema,
  CourseSchemaType,
  courseStatus,
} from "@/lib/zodSchemas";
import { ArrowLeft, PlusIcon, SparkleIcon } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import slugify from "slugify";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { SelectValue } from "@radix-ui/react-select";
import { RichTextEditor } from "@/components/rich-text-editor/Editor";
import { Uploader } from "@/components/file-uploader/Uploader";

export default function CourseCreationPage() {
  const form = useForm<CourseSchemaType>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      description: "",
      fileKey: "",
      price: 0,
      duration: 0,
      level: "Beginner",
      category: "Development",
      status: "Draft",
      slug: "",
      smallDescription: "",
    },
  });
  function onSubmit(values: CourseSchemaType) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log(values);
  }
  return (
    <>
      <div className="flex items-center gap-4">
        <Link
          href="/admin/courses"
          className={buttonVariants({
            variant: "outline",
            size: "icon",
          })}
        >
          <ArrowLeft className="size-4"></ArrowLeft>
        </Link>
        <h1 className="text-2xl font-bold">Create Courses</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Provide basic information about the Course
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Title" {...field}></Input>
                    </FormControl>
                    <FormMessage> </FormMessage>
                  </FormItem>
                )}
              ></FormField>
              <div className="flex gap-4 items-end">
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input placeholder="Slug" {...field}></Input>
                      </FormControl>
                      <FormMessage> </FormMessage>
                    </FormItem>
                  )}
                ></FormField>
                <Button
                  type="button"
                  className="w-fit mb-2"
                  onClick={() => {
                    const titleValue = form.getValues("title");
                    const slug = slugify(titleValue);
                    form.setValue("slug", slug, { shouldValidate: true });
                  }}
                >
                  Generate Slug{" "}
                  <SparkleIcon className="ml-1" size={16}></SparkleIcon>
                </Button>
              </div>
              <FormField
                control={form.control}
                name="smallDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Small Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Small Description"
                        className="min-h-[120px]"
                        {...field}
                      ></Textarea>
                    </FormControl>
                    <FormMessage> </FormMessage>
                  </FormItem>
                )}
              ></FormField>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                        <RichTextEditor field={field}></RichTextEditor>
                      {/* <Textarea
                        placeholder="Description"
                        className="min-h-[120px]"
                        {...field}
                      ></Textarea> */}
                    </FormControl>
                    <FormMessage> </FormMessage>
                  </FormItem>
                )}
              ></FormField>

              <FormField
                control={form.control}
                name="fileKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thumbnail image</FormLabel>
                    <FormControl>
                      <Uploader></Uploader>
                      {/* <Input placeholder="thumbnail url" {...field}></Input> */}
                    </FormControl>
                    <FormMessage> </FormMessage>
                  </FormItem>
                )}
              ></FormField>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Category"></SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {courseCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <FormMessage> </FormMessage>
                    </FormItem>
                  )}
                ></FormField>
                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Level</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Level"></SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {courseLevels.map((course) => (
                            <SelectItem key={course} value={course}>
                              {course}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <FormMessage> </FormMessage>
                    </FormItem>
                  )}
                ></FormField>
                 <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (hours)</FormLabel>
                    <FormControl>
                      <Input placeholder="Duration" type="number" {...field}></Input>
                    </FormControl>
                    <FormMessage> </FormMessage>
                  </FormItem>
                )}
              ></FormField>
                <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price ($)</FormLabel>
                    <FormControl>
                      <Input placeholder="Price" type="number" {...field}></Input>
                    </FormControl>
                    <FormMessage> </FormMessage>
                  </FormItem>
                )}
              ></FormField>
              </div>
               <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Status"></SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {courseStatus.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <FormMessage> </FormMessage>
                    </FormItem>
                  )}
                ></FormField>
                <Button>
                    Create Course <PlusIcon className="ml-1" size={16}></PlusIcon>
                </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}
