"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserWithStats } from "@/app/data/admin/get-users";

interface GrantPremiumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithStats | null;
  onConfirm: (days: number) => Promise<void>;
}

export function GrantPremiumDialog({ open, onOpenChange, user, onConfirm }: GrantPremiumDialogProps) {
  const [days, setDays] = useState(30);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (days <= 0) return;
    
    setIsLoading(true);
    try {
      await onConfirm(days);
      setDays(30);
    } finally {
      setIsLoading(false);
    }
  };

  const calculatedPrice = days * (99000 / 30);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Cấp quyền Premium
          </DialogTitle>
          <DialogDescription>
            Cấp quyền Premium cho <strong>{user?.name}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="days">Số ngày Premium</Label>
            <Input
              id="days"
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 0)}
            />
          </div>
          
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Số ngày:</span>
              <span className="font-medium">{days} ngày</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Giá trị tương đương:</span>
              <span className="font-medium text-amber-600">
                {Math.round(calculatedPrice).toLocaleString('vi-VN')} đ
              </span>
            </div>
            {user?.isPremiumActive && user.premiumExpires && (
              <div className="flex justify-between text-sm border-t pt-2 mt-2">
                <span className="text-muted-foreground">Lưu ý:</span>
                <span className="text-blue-600">Sẽ cộng dồn từ ngày hết hạn hiện tại</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDays(7)}
            >
              7 ngày
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDays(30)}
            >
              30 ngày
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDays(90)}
            >
              90 ngày
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDays(365)}
            >
              1 năm
            </Button>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={days <= 0 || isLoading}
            className="bg-amber-500 hover:bg-amber-600"
          >
            {isLoading ? "Đang xử lý..." : "Cấp Premium"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
