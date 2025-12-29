import { getDanhMucs } from "@/app/teacher/actions/categories";
import { getCapDos } from "@/app/teacher/actions/levels";
import { getTrangThais } from "@/app/teacher/actions/statuses";
import { CourseCreationForm } from "./CourseCreationForm";

export const dynamic = "force-dynamic";

export default async function CourseCreationPage() {
  const [categories, levels, statuses] = await Promise.all([
    getDanhMucs(),
    getCapDos(),
    getTrangThais(),
  ]);

  return (
    <CourseCreationForm 
      categories={categories} 
      levels={levels} 
      statuses={statuses} 
    />
  );
}
