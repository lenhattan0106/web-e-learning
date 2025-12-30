"use client";

import { useState } from "react";
import { GraduationCap, User } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { UserWithStats } from "@/app/data/admin/get-users";

interface ChangeRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithStats | null;
  onConfirm: (newRole: "user" | "teacher") => Promise<void>;
}

export function ChangeRoleDialog({ open, onOpenChange, user, onConfirm }: ChangeRoleDialogProps) {
  const currentRole = user?.role === "teacher" ? "teacher" : "user";
  const [selectedRole, setSelectedRole] = useState<"user" | "teacher">(currentRole);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (selectedRole === currentRole) {
      onOpenChange(false);
      return;
    }
    
    setIsLoading(true);
    try {
      await onConfirm(selectedRole);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Đổi vai trò người dùng</DialogTitle>
          <DialogDescription>
            Thay đổi vai trò cho <strong>{user?.name}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <RadioGroup
            value={selectedRole}
            onValueChange={(v) => setSelectedRole(v as "user" | "teacher")}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-accent">
              <RadioGroupItem value="user" id="user" />
              <Label htmlFor="user" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Học viên (User)</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Có thể xem và mua khóa học
                </p>
              </Label>
            </div>
            
            <div className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-accent">
              <RadioGroupItem value="teacher" id="teacher" />
              <Label htmlFor="teacher" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  <span className="font-medium">Giáo viên (Teacher)</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Có thể tạo và quản lý khóa học riêng
                </p>
              </Label>
            </div>
          </RadioGroup>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={selectedRole === currentRole || isLoading}
          >
            {isLoading ? "Đang xử lý..." : "Xác nhận"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
