"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { 
  Search, 
  UserX, 
  UserCheck, 
  Shield, 
  Sparkles, 
  MoreHorizontal,
  Ban,
  Star,
  GraduationCap,
  User
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import { BanUserModal } from "./BanUserModal";
import { GrantPremiumDialog } from "./GrantPremiumDialog";
import { ChangeRoleDialog } from "./ChangeRoleDialog";
import { 
  banUser, 
  unbanUser, 
  changeUserRole, 
  grantPremium,
  revokePremium 
} from "@/app/admin/actions/user-management";
import type { UserWithStats } from "@/app/data/admin/get-users";

interface UsersClientProps {
  users: UserWithStats[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export function UsersClient({ users, total, totalPages, currentPage }: UsersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [premiumDialogOpen, setPremiumDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  const updateUrl = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // Reset page when filters change
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl("search", searchValue || null);
  };

  const handleBan = async (reason: string, expiresAt?: Date) => {
    if (!selectedUser) return;
    const result = await banUser(selectedUser.id, reason, expiresAt);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setBanModalOpen(false);
    setSelectedUser(null);
  };

  const handleUnban = async (user: UserWithStats) => {
    const result = await unbanUser(user.id);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleRoleChange = async (newRole: "user" | "teacher") => {
    if (!selectedUser) return;
    const result = await changeUserRole(selectedUser.id, newRole);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setRoleDialogOpen(false);
    setSelectedUser(null);
  };

  const handleGrantPremium = async (days: number) => {
    if (!selectedUser) return;
    const result = await grantPremium(selectedUser.id, days);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setPremiumDialogOpen(false);
    setSelectedUser(null);
  };

  const handleRevokePremium = async (user: UserWithStats) => {
    const result = await revokePremium(user.id);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case "admin":
        return <Badge variant="destructive"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
      case "teacher":
        return <Badge variant="secondary"><GraduationCap className="w-3 h-3 mr-1" />Giáo viên</Badge>;
      default:
        return <Badge variant="outline"><User className="w-3 h-3 mr-1" />Học viên</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên hoặc email..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">Tìm</Button>
        </form>
        
        <div className="flex gap-2">
          <Select 
            value={searchParams.get("role") || "all"} 
            onValueChange={(v) => updateUrl("role", v)}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Vai trò" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="user">Học viên</SelectItem>
              <SelectItem value="teacher">Giáo viên</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          
          <Select 
            value={searchParams.get("status") || "all"} 
            onValueChange={(v) => updateUrl("status", v)}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="active">Hoạt động</SelectItem>
              <SelectItem value="banned">Bị cấm</SelectItem>
            </SelectContent>
          </Select>
          
          <Select 
            value={searchParams.get("premium") || "all"} 
            onValueChange={(v) => updateUrl("premium", v)}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Premium" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="free">Miễn phí</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="text-sm text-muted-foreground">
        Hiển thị {users.length} / {total} người dùng
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người dùng</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Premium</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày tham gia</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Không tìm thấy người dùng nào
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className={user.banned ? "bg-red-50/50 dark:bg-red-950/20" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback>{user.name?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    {user.isPremiumActive ? (
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200">
                        <Sparkles className="w-3 h-3 mr-1" />
                        {user.premiumExpires && format(new Date(user.premiumExpires), "dd/MM/yy", { locale: vi })}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.banned ? (
                      <Badge variant="destructive">
                        <Ban className="w-3 h-3 mr-1" />Bị cấm
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-green-500 text-green-600">
                        <UserCheck className="w-3 h-3 mr-1" />Hoạt động
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: vi })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        {/* Role change */}
                        {user.role !== "admin" && (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setRoleDialogOpen(true);
                            }}
                          >
                            <GraduationCap className="mr-2 h-4 w-4" />
                            Đổi vai trò
                          </DropdownMenuItem>
                        )}
                        
                        {/* Premium actions */}
                        {user.isPremiumActive ? (
                          <DropdownMenuItem
                            onClick={() => handleRevokePremium(user)}
                            className="text-orange-600"
                          >
                            <Star className="mr-2 h-4 w-4" />
                            Thu hồi Premium
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setPremiumDialogOpen(true);
                            }}
                          >
                            <Sparkles className="mr-2 h-4 w-4" />
                            Cấp Premium
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuSeparator />
                        
                        {/* Ban/Unban */}
                        {user.role !== "admin" && (
                          user.banned ? (
                            <DropdownMenuItem
                              onClick={() => handleUnban(user)}
                              className="text-green-600"
                            >
                              <UserCheck className="mr-2 h-4 w-4" />
                              Bỏ cấm
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setBanModalOpen(true);
                              }}
                              className="text-red-600"
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              Cấm tài khoản
                            </DropdownMenuItem>
                          )
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                href={`${pathname}?${new URLSearchParams({ 
                  ...Object.fromEntries(searchParams.entries()), 
                  page: String(Math.max(1, currentPage - 1)) 
                }).toString()}`}
                aria-disabled={currentPage <= 1}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <PaginationItem key={page}>
                  <PaginationLink
                    href={`${pathname}?${new URLSearchParams({ 
                      ...Object.fromEntries(searchParams.entries()), 
                      page: String(page) 
                    }).toString()}`}
                    isActive={currentPage === page}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext 
                href={`${pathname}?${new URLSearchParams({ 
                  ...Object.fromEntries(searchParams.entries()), 
                  page: String(Math.min(totalPages, currentPage + 1)) 
                }).toString()}`}
                aria-disabled={currentPage >= totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Modals */}
      <BanUserModal
        open={banModalOpen}
        onOpenChange={setBanModalOpen}
        user={selectedUser}
        onConfirm={handleBan}
      />
      
      <GrantPremiumDialog
        open={premiumDialogOpen}
        onOpenChange={setPremiumDialogOpen}
        user={selectedUser}
        onConfirm={handleGrantPremium}
      />
      
      <ChangeRoleDialog
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        user={selectedUser}
        onConfirm={handleRoleChange}
      />
    </div>
  );
}
