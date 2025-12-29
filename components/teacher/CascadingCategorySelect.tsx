"use client";

import * as React from "react";
import { Check, ChevronsUpDown, ChevronRight, ArrowLeft, Plus, Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { createQuickDanhMuc, editDanhMuc, deleteDanhMuc } from "@/app/teacher/actions/categories";
import { useRouter } from "next/navigation";
import { Loader } from "lucide-react";

export interface Category {
  id: string;
  tenDanhMuc: string;
  danhMucCon?: Category[];
}

interface CascadingCategorySelectProps {
  categories: Category[];
  value?: string;
  onChange: (value: string) => void;
}

export function CascadingCategorySelect({
  categories,
  value,
  onChange,
}: CascadingCategorySelectProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [selectedParent, setSelectedParent] = React.useState<Category | null>(null);
  const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [parentForNewChild, setParentForNewChild] = React.useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
  const [editCategoryName, setEditCategoryName] = React.useState("");
  const [isEditing, setIsEditing] = React.useState(false);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deletingCategory, setDeletingCategory] = React.useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  // Find initial parent if value is set
  React.useEffect(() => {
    if (value && !selectedParent) {
      for (const parent of categories) {
        if (parent.danhMucCon?.some((child) => child.id === value)) {
          setSelectedParent(parent);
          break;
        }
      }
    }
  }, [value, categories, selectedParent]);

  // Pre-fill edit dialog when it opens
  React.useEffect(() => {
    if (editDialogOpen && editingCategory) {
      setEditCategoryName(editingCategory.tenDanhMuc);
    }
  }, [editDialogOpen, editingCategory]);

  const handleParentSelect = (category: Category) => {
    if (category.danhMucCon && category.danhMucCon.length > 0) {
      setSelectedParent(category);
    } else {
      onChange(category.id);
      setOpen(false);
    }
  };

  const handleChildSelect = (childId: string) => {
    onChange(childId);
    setOpen(false);
  };

  const handleBackToParent = () => {
    setSelectedParent(null);
  };
  
  const selectedCategoryName = React.useMemo(() => {
     if (!value) return "";
     for (const parent of categories) {
         const child = parent.danhMucCon?.find(c => c.id === value);
         if (child) return child.tenDanhMuc;
         if (parent.id === value) return parent.tenDanhMuc;
     }
     return "";
  }, [value, categories]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    setIsCreating(true);
    const result = await createQuickDanhMuc(newCategoryName, parentForNewChild?.id);
    setIsCreating(false);
    
    if (result.error) {
      toast.error(result.error);
    } else if (result.success && result.data) {
      toast.success("Đã tạo danh mục mới");
      setNewCategoryName("");
      setCreateDialogOpen(false);
      setParentForNewChild(null);
      router.refresh();
      onChange(result.data.id);
    }
  };

  const handleEditCategory = async () => {
    if (!editCategoryName.trim() || !editingCategory) return;
    
    setIsEditing(true);
    const result = await editDanhMuc(editingCategory.id, editCategoryName);
    setIsEditing(false);
    
    if (result.error) {
      toast.error(result.error);
    } else if (result.success) {
      toast.success("Đã cập nhật danh mục");
      setEditDialogOpen(false);
      setEditingCategory(null);
      router.refresh();
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    
    setIsDeleting(true);
    const result = await deleteDanhMuc(deletingCategory.id);
    setIsDeleting(false);
    
    if (result.error) {
      toast.error(result.error);
    } else if (result.success) {
      toast.success("Đã xóa danh mục");
      setDeleteDialogOpen(false);
      setDeletingCategory(null);
      router.refresh();
      if (value === deletingCategory.id) {
        onChange("");
      }
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative group">
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between h-10 font-normal"
            >
              <span className={cn(!selectedCategoryName && "text-muted-foreground")}>
                {selectedCategoryName || "Chọn danh mục"}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Tìm danh mục..." />
            <CommandList>
              <CommandEmpty>Không tìm thấy danh mục.</CommandEmpty>
              
              {/* Breadcrumb & Back Button */}
              {selectedParent && (
                <div className="flex items-center gap-2 px-2 py-2 border-b bg-muted/50">
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-xs"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleBackToParent();
                    }}
                  >
                    <ArrowLeft className="h-3 w-3 mr-1" />
                    Danh mục chính
                  </Button>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium">{selectedParent.tenDanhMuc}</span>
                </div>
              )}
              
              {!selectedParent ? (
                // LEVEL 1: PARENT CATEGORIES
                <CommandGroup>
                  {categories.map((category) => {
                    const hasChildren = category.danhMucCon && category.danhMucCon.length > 0;
                    
                    return (
                      <CommandItem
                        key={category.id}
                        onSelect={() => handleParentSelect(category)}
                        className="cursor-pointer group/item"
                        onMouseEnter={() => setHoveredItem(category.id)}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <Check
                              className={cn(
                                "h-4 w-4",
                                value === category.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span>{category.tenDanhMuc}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {hoveredItem === category.id && (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-green-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setParentForNewChild(category);
                                    setCreateDialogOpen(true);
                                    setOpen(false);
                                  }}
                                  title="Thêm danh mục con"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingCategory(category);
                                    setEditDialogOpen(true);
                                    setOpen(false);
                                  }}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingCategory(category);
                                    setDeleteDialogOpen(true);
                                    setOpen(false);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            {/* Always show ChevronRight if has children */}
                            {hasChildren && (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                  
                  {/* Add New Parent Category Button */}
                  <CommandItem
                    onSelect={() => {
                      setParentForNewChild(null);
                      setCreateDialogOpen(true);
                      setOpen(false);
                    }}
                    className="text-primary cursor-pointer border-t mt-1"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <span className="font-medium">Thêm danh mục chính</span>
                  </CommandItem>
                </CommandGroup>
              ) : (
                // LEVEL 2: CHILD CATEGORIES
                <CommandGroup>
                  {selectedParent.danhMucCon?.map((child) => (
                    <CommandItem
                      key={child.id}
                      onSelect={() => handleChildSelect(child.id)}
                      className="cursor-pointer group/item"
                      onMouseEnter={() => setHoveredItem(child.id)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Check
                            className={cn(
                              "h-4 w-4",
                              value === child.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {child.tenDanhMuc}
                        </div>
                        {hoveredItem === child.id && (
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCategory(child);
                                setEditDialogOpen(true);
                                setOpen(false);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingCategory(child);
                                setDeleteDialogOpen(true);
                                setOpen(false);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                  
                  {/* Add New Child Category */}
                  <CommandItem
                    onSelect={() => {
                      setParentForNewChild(selectedParent);
                      setCreateDialogOpen(true);
                      setOpen(false);
                    }}
                    className="text-primary cursor-pointer border-t mt-1"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <span className="font-medium">Thêm danh mục con</span>
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Create Category Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {parentForNewChild ? `Thêm danh mục con cho "${parentForNewChild.tenDanhMuc}"` : "Thêm danh mục chính"}
            </DialogTitle>
            <DialogDescription>
              Tạo danh mục mới để phân loại khóa học tốt hơn.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category-name">Tên danh mục</Label>
              <Input
                id="category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nhập tên danh mục..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateCategory();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreateCategory} disabled={isCreating || !newCategoryName.trim()}>
              {isCreating && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Tạo mới
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa danh mục</DialogTitle>
            <DialogDescription>
              Cập nhật tên danh mục "{editingCategory?.tenDanhMuc}".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-category-name">Tên danh mục</Label>
              <Input
                id="edit-category-name"
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                placeholder="Nhập tên mới..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEditCategory();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleEditCategory} disabled={isEditing || !editCategoryName.trim()}>
              {isEditing && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Cập nhật
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa danh mục "{deletingCategory?.tenDanhMuc}"? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCategory}
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

