"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus, Edit2, Trash2, Loader } from "lucide-react";
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
import { createQuickTrangThai, editTrangThai, deleteTrangThai } from "@/app/teacher/actions/statuses";
import { useRouter } from "next/navigation";

interface Status {
  id: string;
  tenTrangThai: string;
}

interface StatusSelectProps {
  statuses: Status[];
  value?: string;
  onChange: (value: string) => void;
}

export function StatusSelect({ statuses, value, onChange }: StatusSelectProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);
  
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [newStatusName, setNewStatusName] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingStatus, setEditingStatus] = React.useState<Status | null>(null);
  const [editStatusName, setEditStatusName] = React.useState("");
  const [isEditing, setIsEditing] = React.useState(false);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deletingStatus, setDeletingStatus] = React.useState<Status | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  const selectedStatusName = React.useMemo(() => {
    return statuses.find(s => s.id === value)?.tenTrangThai || "";
  }, [value, statuses]);

  const handleCreateStatus = async () => {
    if (!newStatusName.trim()) return;
    
    setIsCreating(true);
    const result = await createQuickTrangThai(newStatusName);
    setIsCreating(false);
    
    if (result.error) {
      toast.error(result.error);
    } else if (result.success && result.data) {
      toast.success("Đã tạo trạng thái mới");
      setNewStatusName("");
      setCreateDialogOpen(false);
      router.refresh();
      onChange(result.data.id);
    }
  };

  const handleEditStatus = async () => {
    if (!editStatusName.trim() || !editingStatus) return;
    
    setIsEditing(true);
    const result = await editTrangThai(editingStatus.id, editStatusName);
    setIsEditing(false);
    
    if (result.error) {
      toast.error(result.error);
    } else if (result.success) {
      toast.success("Đã cập nhật trạng thái");
      setEditDialogOpen(false);
      setEditingStatus(null);
      router.refresh();
    }
  };

  const handleDeleteStatus = async () => {
    if (!deletingStatus) return;
    
    setIsDeleting(true);
    const result = await deleteTrangThai(deletingStatus.id);
    setIsDeleting(false);
    
    if (result.error) {
      toast.error(result.error);
    } else if (result.success) {
      toast.success("Đã xóa trạng thái");
      setDeleteDialogOpen(false);
      setDeletingStatus(null);
      router.refresh();
      if (value === deletingStatus.id) {
        onChange("");
      }
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-10 font-normal"
          >
            <span className={cn(!selectedStatusName && "text-muted-foreground")}>
              {selectedStatusName || "Chọn trạng thái"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Tìm trạng thái..." />
            <CommandList>
              <CommandEmpty>Không tìm thấy trạng thái.</CommandEmpty>
              <CommandGroup>
                {statuses.map((status) => (
                  <CommandItem
                    key={status.id}
                    onSelect={() => {
                      onChange(status.id);
                      setOpen(false);
                    }}
                    className="cursor-pointer group/item"
                    onMouseEnter={() => setHoveredItem(status.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Check
                          className={cn(
                            "h-4 w-4",
                            value === status.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span>{status.tenTrangThai}</span>
                      </div>
                      {hoveredItem === status.id && (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingStatus(status);
                              setEditStatusName(status.tenTrangThai);
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
                              setDeletingStatus(status);
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
                
                <CommandItem
                  onSelect={() => {
                    setCreateDialogOpen(true);
                    setOpen(false);
                  }}
                  className="text-primary cursor-pointer border-t mt-1"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="font-medium">Thêm trạng thái mới</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm trạng thái mới</DialogTitle>
            <DialogDescription>
              Tạo trạng thái mới để quản lý tình trạng phát hành khóa học.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="status-name">Tên trạng thái</Label>
              <Input
                id="status-name"
                value={newStatusName}
                onChange={(e) => setNewStatusName(e.target.value)}
                placeholder="Nhập tên trạng thái..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateStatus();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreateStatus} disabled={isCreating || !newStatusName.trim()}>
              {isCreating && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Tạo mới
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa trạng thái</DialogTitle>
            <DialogDescription>
              Cập nhật tên trạng thái "{editingStatus?.tenTrangThai}".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-status-name">Tên trạng thái</Label>
              <Input
                id="edit-status-name"
                value={editStatusName}
                onChange={(e) => setEditStatusName(e.target.value)}
                placeholder="Nhập tên mới..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEditStatus();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleEditStatus} disabled={isEditing || !editStatusName.trim()}>
              {isEditing && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Cập nhật
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa trạng thái "{deletingStatus?.tenTrangThai}"? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteStatus}
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

