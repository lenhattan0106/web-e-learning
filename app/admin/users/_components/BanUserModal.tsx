"use client";

import { useState } from "react";
import { format, addDays } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarIcon, AlertTriangle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { UserWithStats } from "@/app/data/admin/get-users";

interface BanUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithStats | null;
  onConfirm: (reason: string, expiresAt?: Date) => Promise<void>;
}

export function BanUserModal({ open, onOpenChange, user, onConfirm }: BanUserModalProps) {
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(undefined);
  const [isPermanent, setIsPermanent] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    
    setIsLoading(true);
    try {
      await onConfirm(reason, isPermanent ? undefined : expiresAt);
      setReason("");
      setExpiresAt(undefined);
      setIsPermanent(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Cấm tài khoản
          </DialogTitle>
          <DialogDescription>
            Bạn đang cấm tài khoản <strong>{user?.name}</strong> ({user?.email}). 
            Người dùng sẽ bị đăng xuất ngay lập tức và không thể truy cập hệ thống.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Lý do cấm *</Label>
            <Textarea
              id="reason"
              placeholder="Nhập lý do cấm tài khoản..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Thời hạn cấm</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={isPermanent ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPermanent(true)}
              >
                Vĩnh viễn
              </Button>
              <Button
                type="button"
                variant={!isPermanent ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsPermanent(false);
                  if (!expiresAt) {
                    setExpiresAt(addDays(new Date(), 7));
                  }
                }}
              >
                Tạm thời
              </Button>
            </div>
          </div>
          
          {!isPermanent && (
            <div className="space-y-2">
              <Label>Hết hạn cấm</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expiresAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expiresAt ? format(expiresAt, "PPP", { locale: vi }) : "Chọn ngày"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expiresAt}
                    onSelect={setExpiresAt}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSubmit}
            disabled={!reason.trim() || isLoading}
          >
            {isLoading ? "Đang xử lý..." : "Xác nhận cấm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
