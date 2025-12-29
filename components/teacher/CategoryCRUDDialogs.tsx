"use client";

import * as React from "react";
import { Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Category {
  id: string;
  tenDanhMuc: string;
  idDanhMucCha: string | null;
  danhMucCon?: Category[];
}

interface CategoryCRUDDialogsProps {
  categories: Category[];
  // Create
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  onCreateSubmit: (name: string, parentId?: string) => Promise<void>;
  selectedParentForCreate?: Category | null;
  
  // Edit
  editOpen: boolean;
  onEditOpenChange: (open: boolean) => void;
  onEditSubmit: (id: string, name: string) => Promise<void>;
  categoryToEdit?: { id: string; name: string } | null;
  
  // Delete
  deleteOpen: boolean;
  onDeleteOpenChange: (open: boolean) => void;
  onDeleteSubmit: (id: string) => Promise<void>;
  categoryToDelete?: { id: string; name: string } | null;
}

export function CategoryCRUDDialogs({
  categories,
  createOpen,
  onCreateOpenChange,
  onCreateSubmit,
  selectedParentForCreate,
  editOpen,
  onEditOpenChange,
  onEditSubmit,
  categoryToEdit,
  deleteOpen,
  onDeleteOpenChange,
  onDeleteSubmit,
  categoryToDelete,
}: CategoryCRUDDialogsProps) {
  const [createName, setCreateName] = React.useState("");
  const [editName, setEditName] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Reset edit name when dialog opens
  React.useEffect(() => {
    if (editOpen && categoryToEdit) {
      setEditName(categoryToEdit.name);
    }
  }, [editOpen, categoryToEdit]);

  const handleCreate = async () => {
    if (!createName.trim()) return;
    
    setIsCreating(true);
    try {
      await onCreateSubmit(createName, selectedParentForCreate?.id);
      setCreateName("");
      onCreateOpenChange(false);
    } catch (error) {
      // Error handling done in parent
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = async () => {
    if (!editName.trim() || !categoryToEdit) return;
    
    setIsEditing(true);
    try {
      await onEditSubmit(categoryToEdit.id, editName);
      onEditOpenChange(false);
    } catch (error) {
      // Error handling done in parent
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    
    setIsDeleting(true);
    try {
      await onDeleteSubmit(categoryToDelete.id);
      onDeleteOpenChange(false);
    } catch (error) {
      // Error handling done in parent
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={onCreateOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedParentForCreate
                ? `Thêm danh mục con cho "${selectedParentForCreate.tenDanhMuc}"`
                : "Thêm danh mục mới"}
            </DialogTitle>
            <DialogDescription>
              Tạo danh mục mới để phân loại khóa học tốt hơn.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create-category-name">Tên danh mục</Label>
              <Input
                id="create-category-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Nhập tên danh mục..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onCreateOpenChange(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreate} disabled={isCreating || !createName.trim()}>
              {isCreating && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Tạo mới
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={onEditOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa danh mục</DialogTitle>
            <DialogDescription>
              Cập nhật tên danh mục "{categoryToEdit?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-category-name">Tên danh mục</Label>
              <Input
                id="edit-category-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nhập tên mới..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEdit();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onEditOpenChange(false)}>
              Hủy
            </Button>
            <Button onClick={handleEdit} disabled={isEditing || !editName.trim()}>
              {isEditing && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Cập nhật
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={onDeleteOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa danh mục "{categoryToDelete?.name}"?
              {" "}Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onDeleteOpenChange(false)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
