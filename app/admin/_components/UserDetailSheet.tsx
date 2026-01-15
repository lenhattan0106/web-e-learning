"use client";

import { Fragment } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Crown, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface UserDetail {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: Date | string;
  isPremium: boolean;
  premiumExpires?: Date | string | null;
}

interface UserDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserDetail[];
  title: string;
  description?: string;
  type: "all" | "premium" | "new";
}

export function UserDetailSheet({
  open,
  onOpenChange,
  users,
  title,
  description,
  type,
}: UserDetailSheetProps) {
  const premiumUsers = users.filter(u => u.isPremium);
  const regularUsers = users.filter(u => !u.isPremium);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {title}
          </SheetTitle>
          <SheetDescription>
            {description || `Tổng cộng ${users.length} người dùng`}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-600 font-medium">Người dùng thường</div>
              <div className="text-2xl font-bold text-blue-700">{regularUsers.length}</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="text-sm text-amber-600 font-medium">Premium</div>
              <div className="text-2xl font-bold text-amber-700">{premiumUsers.length}</div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* User List */}
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-3">
              {users.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Không có người dùng nào</p>
                </div>
              ) : (
                users.map((user, index) => (
                  <div
                    key={user.id || `user-${index}`}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <Avatar className="h-10 w-10 mt-0.5">
                      <AvatarImage src={user.image || undefined} />
                      <AvatarFallback>{user.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">{user.name || "Chưa đặt tên"}</p>
                        {user.isPremium && (
                          <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                            <Crown className="h-3 w-3 mr-1" />
                            AI Premium
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mb-1">
                        {user.email}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Tham gia: {format(new Date(user.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                      </div>
                      {user.isPremium && user.premiumExpires && (
                        <div className="text-xs text-amber-600 mt-1">
                          Hết hạn: {format(new Date(user.premiumExpires), "dd/MM/yyyy", { locale: vi })}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
