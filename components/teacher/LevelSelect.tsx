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
import { createQuickCapDo, editCapDo, deleteCapDo } from "@/app/teacher/actions/levels";
import { reportCategoryLevelError } from "@/app/teacher/actions/report-error";
import { useRouter } from "next/navigation";
import { ImpactWarningDialog } from "@/components/teacher/ImpactWarningDialog";

interface Level {
  id: string;
  tenCapDo: string;
}

interface LevelSelectProps {
  levels: Level[];
  value?: string;
  onChange: (value: string) => void;
}

export function LevelSelect({ levels, value, onChange }: LevelSelectProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);
  
  // Local state for optimistic updates
  const [localLevels, setLocalLevels] = React.useState<Level[]>(levels);
  
  // Sync local state when props change
  React.useEffect(() => {
    setLocalLevels(levels);
  }, [levels]);
  
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [newLevelName, setNewLevelName] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingLevel, setEditingLevel] = React.useState<Level | null>(null);
  const [editLevelName, setEditLevelName] = React.useState("");
  const [isEditing, setIsEditing] = React.useState(false);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deletingLevel, setDeletingLevel] = React.useState<Level | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  // Impact warning dialog states
  const [impactWarningOpen, setImpactWarningOpen] = React.useState(false);
  const [impactData, setImpactData] = React.useState<{courses: number; students: number; teachers?: number} | null>(null);
  const [pendingAction, setPendingAction] = React.useState<{type: 'edit' | 'delete'; level: Level; newName?: string} | null>(null);
  
  const selectedLevelName = React.useMemo(() => {
    return localLevels.find(l => l.id === value)?.tenCapDo || "";
  }, [value, localLevels]);

  const handleCreateLevel = async () => {
    if (!newLevelName.trim()) return;
    
    setIsCreating(true);
    const result = await createQuickCapDo(newLevelName);
    setIsCreating(false);
    
    if (result.error) {
      toast.error(result.error);
    } else if (result.success && result.data) {
      toast.success("Đã tạo cấp độ mới");
      
      // Optimistic update - add new level to local state
      const newLevel: Level = {
        id: result.data.id,
        tenCapDo: newLevelName
      };
      setLocalLevels(prev => [...prev, newLevel]);
      
      setNewLevelName("");
      setCreateDialogOpen(false);
      onChange(result.data.id);
      React.startTransition(() => {
        router.refresh();
      });
    }
  };

  const handleEditLevel = async () => {
    if (!editLevelName.trim() || !editingLevel) return;
    
    setIsEditing(true);
    const result = await editCapDo(editingLevel.id, editLevelName);
    setIsEditing(false);
    
    // Check if locked (has enrollments)
    if ('locked' in result && result.locked && result.impact) {
      setPendingAction({
        type: 'edit',
        level: editingLevel,
        newName: editLevelName
      });
      setImpactData(result.impact);
      setEditDialogOpen(false);
      setImpactWarningOpen(true);
      return;
    }
    
    if (result.error) {
      toast.error(result.error);
    } else if (result.success) {
      toast.success("Đã cập nhật cấp độ");
      
      // Optimistic update - update level name in local state
      setLocalLevels(prev => prev.map(l => 
        l.id === editingLevel.id ? { ...l, tenCapDo: editLevelName } : l
      ));
      
      setEditDialogOpen(false);
      setEditingLevel(null);
      setEditLevelName("");
      React.startTransition(() => {
        router.refresh();
      });
    }
  };

  const handleDeleteLevel = async () => {
    if (!deletingLevel) return;
    
    setIsDeleting(true);
    const result = await deleteCapDo(deletingLevel.id);
    setIsDeleting(false);
    
    // Check if locked (has enrollments)
    if ('locked' in result && result.locked && result.impact) {
      setPendingAction({
        type: 'delete',
        level: deletingLevel
      });
      setImpactData(result.impact);
      setDeleteDialogOpen(false);
      setImpactWarningOpen(true);
      return;
    }
    
    if (result.error) {
      toast.error(result.error);
    } else if (result.success) {
      toast.success("Đã xóa cấp độ");
      
      // Optimistic update - remove level from local state
      setLocalLevels(prev => prev.filter(l => l.id !== deletingLevel.id));
      
      setDeleteDialogOpen(false);
      setDeletingLevel(null);
      if (value === deletingLevel.id) {
        onChange("");
      }
      React.startTransition(() => {
        router.refresh();
      });
    }
  };
  
  // Handle error report submission
  const handleSubmitReport = async (data: {newName?: string; reason: string}) => {
    if (!pendingAction) return;
    
    const result = await reportCategoryLevelError({
      type: 'LEVEL',
      objectId: pendingAction.level.id,
      objectName: pendingAction.level.tenCapDo,
      action: pendingAction.type === 'edit' ? 'EDIT' : 'DELETE',
      newName: data.newName,
      reason: data.reason
    });
    
    if (result.success) {
      toast.success(result.message || "Yêu cầu đã được gửi đến admin");
      setImpactWarningOpen(false);
      setPendingAction(null);
      setImpactData(null);
    } else if (result.error) {
      toast.error(result.error);
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
            <span className={cn(!selectedLevelName && "text-muted-foreground")}>
              {selectedLevelName || "Chọn cấp độ"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Tìm cấp độ..." />
            <CommandList>
              <CommandEmpty>Không tìm thấy cấp độ.</CommandEmpty>
              <CommandGroup>
                {localLevels.map((level) => (
                  <CommandItem
                    key={level.id}
                    onSelect={() => {
                      onChange(level.id);
                      setOpen(false);
                    }}
                    className="cursor-pointer group/item"
                    onMouseEnter={() => setHoveredItem(level.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Check
                          className={cn(
                            "h-4 w-4",
                            value === level.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span>{level.tenCapDo}</span>
                      </div>
                      {hoveredItem === level.id && (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingLevel(level);
                              setEditLevelName(level.tenCapDo);
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
                              setDeletingLevel(level);
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
                  <span className="font-medium">Thêm cấp độ mới</span>
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
            <DialogTitle>Thêm cấp độ mới</DialogTitle>
            <DialogDescription>
              Tạo cấp độ mới để phân loại độ khó của khóa học.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="level-name">Tên cấp độ</Label>
              <Input
                id="level-name"
                value={newLevelName}
                onChange={(e) => setNewLevelName(e.target.value)}
                placeholder="Nhập tên cấp độ..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateLevel();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreateLevel} disabled={isCreating || !newLevelName.trim()}>
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
            <DialogTitle>Chỉnh sửa cấp độ</DialogTitle>
            <DialogDescription>
              Cập nhật tên cấp độ "{editingLevel?.tenCapDo}".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-level-name">Tên cấp độ</Label>
              <Input
                id="edit-level-name"
                value={editLevelName}
                onChange={(e) => setEditLevelName(e.target.value)}
                placeholder="Nhập tên mới..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEditLevel();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleEditLevel} disabled={isEditing || !editLevelName.trim()}>
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
              Bạn có chắc chắn muốn xóa cấp độ "{deletingLevel?.tenCapDo}"? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteLevel}
              disabled={isDeleting}
            >
              {isDeleting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Impact Warning Dialog */}
      {impactWarningOpen && pendingAction && impactData && (
        <ImpactWarningDialog
          open={impactWarningOpen}
          onOpenChange={setImpactWarningOpen}
          type="LEVEL"
          name={pendingAction.level.tenCapDo}
          action={pendingAction.type === 'edit' ? 'EDIT' : 'DELETE'}
          impact={impactData}
          onSubmitReport={handleSubmitReport}
        />
      )}
    </>
  );
}

