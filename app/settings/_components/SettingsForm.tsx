"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Camera,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Save,
  User,
} from "lucide-react";
import { useState, useTransition, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";
import { env } from "@/lib/env";

interface SettingsFormProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export function SettingsForm({ user }: SettingsFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUpdatingProfile, startUpdatingProfile] = useTransition();
  const [isChangingPassword, startChangingPassword] = useTransition();

  // Profile state
  const [name, setName] = useState(user.name || "");
  const [image, setImage] = useState(user.image || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string>("");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const validateName = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return "Tên không được để trống";
    if (trimmed.length < 2) return "Tên phải có ít nhất 2 ký tự";
    if (trimmed.length > 100) return "Tên không được vượt quá 100 ký tự";
    return "";
  };

  const validatePassword = (value: string): string => {
    if (!value) return "Mật khẩu không được để trống";
    if (value.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự";
    if (value.length > 128) return "Mật khẩu không được vượt quá 128 ký tự";
    return "";
  };

  const isPasswordValid = newPassword.length >= 8 && newPassword.length <= 128;
  const isPasswordMatch =
    newPassword === confirmPassword && confirmPassword.length > 0;

  const canChangePassword =
    currentPassword &&
    newPassword &&
    confirmPassword &&
    isPasswordValid &&
    isPasswordMatch &&
    !isChangingPassword &&
    !passwordErrors.current &&
    !passwordErrors.new &&
    !passwordErrors.confirm;

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh hợp lệ (JPG, PNG, GIF)");
      e.target.value = "";
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("Kích thước ảnh không được vượt quá 5MB");
      e.target.value = "";
      return;
    }

    if (file.name.length > 255) {
      toast.error("Tên file quá dài. Vui lòng đổi tên file ngắn hơn");
      e.target.value = "";
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.onerror = () => {
      toast.error("Không thể đọc file. Vui lòng thử lại");
      e.target.value = "";
      setImageFile(null);
      setImagePreview(null);
    };
    reader.readAsDataURL(file);
  };

  const uploadImageToS3 = async (file: File): Promise<string | null> => {
    try {
      const response = await fetch("/api/user/upload-avatar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          size: file.size,
          isImage: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Không thể tạo URL tải lên";
        throw new Error(errorMessage);
      }

      const { presignedURL, key } = await response.json();
      if (!presignedURL || !key) {
        throw new Error("Phản hồi từ server không hợp lệ");
      }

      const uploadResponse = await fetch(presignedURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Không thể tải ảnh lên S3. Vui lòng thử lại");
      }

      const bucketName = env.NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES;
      if (!bucketName) {
        throw new Error("Cấu hình S3 bucket không hợp lệ");
      }

      const s3Url = `https://${bucketName}.t3.storage.dev/${key}`;
      return s3Url;
    } catch (error) {
      console.error("Error uploading image:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi khi tải ảnh lên";
      toast.error(errorMessage);
      return null;
    }
  };

  const handleUpdateProfile = async () => {
    const nameValidationError = validateName(name);
    if (nameValidationError) {
      setNameError(nameValidationError);
      toast.error(nameValidationError);
      return;
    }
    setNameError("");

    startUpdatingProfile(async () => {
      try {
        let imageUrl = image;

        if (imageFile) {
          const uploadedUrl = await uploadImageToS3(imageFile);
          if (!uploadedUrl) {
            toast.error("Không thể tải ảnh lên. Vui lòng thử lại.");
            return;
          }
          imageUrl = uploadedUrl;
        }

        const response = await fetch("/api/user/profile", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            image: imageUrl,
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const errorMessage = data.error || "Không thể cập nhật thông tin";
          throw new Error(errorMessage);
        }

        if (imageUrl && imageUrl !== image) {
          setImage(imageUrl);
        }

        toast.success("Cập nhật thông tin thành công!");
        router.refresh();
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Đã xảy ra lỗi. Vui lòng thử lại.";
        toast.error(errorMessage);
      }
    });
  };

  const handlePasswordChange = (
    field: "current" | "new" | "confirm",
    value: string
  ) => {
    if (field === "current") {
      setCurrentPassword(value);
      setPasswordErrors((prev) => ({
        ...prev,
        current: value ? "" : "Mật khẩu hiện tại không được để trống",
      }));
    } else if (field === "new") {
      setNewPassword(value);
      const error = validatePassword(value);
      setPasswordErrors((prev) => ({ ...prev, new: error }));

      if (confirmPassword) {
        setPasswordErrors((prev) => ({
          ...prev,
          confirm:
            value !== confirmPassword ? "Mật khẩu xác nhận không khớp" : "",
        }));
      }
    } else if (field === "confirm") {
      setConfirmPassword(value);
      setPasswordErrors((prev) => ({
        ...prev,
        confirm: value !== newPassword ? "Mật khẩu xác nhận không khớp" : "",
      }));
    }
  };

  const handleChangePassword = async () => {
    const currentError = validatePassword(currentPassword);
    const newError = validatePassword(newPassword);
    const confirmError =
      newPassword !== confirmPassword ? "Mật khẩu xác nhận không khớp" : "";

    setPasswordErrors({
      current: currentError,
      new: newError,
      confirm: confirmError,
    });

    if (currentError || newError || confirmError) {
      if (currentError) toast.error(currentError);
      else if (newError) toast.error(newError);
      else if (confirmError) toast.error(confirmError);
      return;
    }

    if (!canChangePassword) {
      toast.error("Vui lòng kiểm tra lại thông tin mật khẩu");
      return;
    }

    startChangingPassword(async () => {
      try {
        await authClient.changePassword({
          currentPassword,
          newPassword,
          revokeOtherSessions: false,
          fetchOptions: {
            onSuccess: () => {
              toast.success("Đổi mật khẩu thành công!");
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
              setPasswordErrors({ current: "", new: "", confirm: "" });
            },
            onError: (ctx) => {
              const errorMessage =
                ctx.error?.message ||
                "Không thể đổi mật khẩu. Vui lòng thử lại.";

              if (ctx.error?.status === 400) {
                if (
                  errorMessage.toLowerCase().includes("current password") ||
                  errorMessage.toLowerCase().includes("mật khẩu hiện tại") ||
                  errorMessage.toLowerCase().includes("incorrect")||
                  errorMessage.toLowerCase().includes("invalid")
                ) {
                  const error = "Mật khẩu hiện tại không đúng";
                  setPasswordErrors((prev) => ({ ...prev, current: error }));
                  toast.error(error);
                } else {
                  toast.error(errorMessage);
                }
              } else {
                toast.error(errorMessage);
              }
            },
          },
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Đã xảy ra lỗi. Vui lòng thử lại.";
        toast.error(errorMessage);
      }
    });
  };

  const displayImage =
    imagePreview || image || user.image || `https://avatar.vercel.sh/${user.email}`;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Thông tin cá nhân
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Đổi mật khẩu
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Thông tin cá nhân
              </CardTitle>
              <CardDescription>
                Cập nhật thông tin cá nhân và ảnh đại diện của bạn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-4 pb-4 border-b">
                <div className="relative group">
                  <Avatar className="h-32 w-32 ring-4 ring-primary/20 ring-offset-4 shadow-lg transition-all duration-300 group-hover:ring-primary/40 group-hover:shadow-xl">
                    <AvatarImage
                      src={displayImage}
                      alt={name || user.email}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-4xl font-semibold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                      {(name || user.email).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {imageFile && (
                    <div className="absolute inset-0 rounded-full bg-primary/30 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                        <Camera className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                  {isUpdatingProfile && (
                    <div className="absolute inset-0 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                      id="avatar-upload"
                      disabled={isUpdatingProfile}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleImageClick}
                      disabled={isUpdatingProfile}
                      className="cursor-pointer"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      {imageFile ? "Đổi ảnh" : "Tải ảnh lên"}
                    </Button>
                  </div>
                  {imageFile && (
                    <p className="text-xs text-muted-foreground text-center">
                      Ảnh mới sẽ được áp dụng sau khi lưu
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground text-center max-w-xs">
                    JPG, PNG hoặc GIF. Tối đa 5MB
                  </p>
                </div>
              </div>

              {/* Name Input */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Tên <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (nameError) {
                        const error = validateName(e.target.value);
                        setNameError(error);
                      }
                    }}
                    onBlur={() => {
                      const error = validateName(name);
                      setNameError(error);
                    }}
                    placeholder="Nhập tên của bạn"
                    className={`pl-10 ${
                      nameError ? "border-destructive focus-visible:ring-destructive" : ""
                    }`}
                    disabled={isUpdatingProfile}
                  />
                </div>
                {nameError && (
                  <p className="text-xs text-destructive">{nameError}</p>
                )}
              </div>

              {/* Email Display (Read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  onClick={handleUpdateProfile}
                  disabled={isUpdatingProfile || !name.trim() || !!nameError}
                  className="min-w-[140px]"
                >
                  {isUpdatingProfile ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Lưu thay đổi
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Đổi mật khẩu
              </CardTitle>
              <CardDescription>
                Cập nhật mật khẩu của bạn để bảo mật tài khoản. Đảm bảo mật khẩu
                mới của bạn mạnh và khác với mật khẩu hiện tại.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">
                  Mật khẩu hiện tại <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) =>
                      handlePasswordChange("current", e.target.value)
                    }
                    placeholder="Nhập mật khẩu hiện tại"
                    className={`pr-10 ${
                      passwordErrors.current ? "border-destructive" : ""
                    }`}
                    disabled={isChangingPassword}
                  />
                </div>
                {passwordErrors.current && (
                  <p className="text-xs text-destructive">
                    {passwordErrors.current}
                  </p>
                )}
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">
                  Mật khẩu mới <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) =>
                      handlePasswordChange("new", e.target.value)
                    }
                    placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
                    className={`pr-10 ${
                      passwordErrors.new ? "border-destructive" : ""
                    }`}
                    disabled={isChangingPassword}
                  />
                </div>
                {passwordErrors.new && (
                  <p className="text-xs text-destructive">
                    {passwordErrors.new}
                  </p>
                )}
                {newPassword &&
                  !passwordErrors.new &&
                  newPassword.length < 8 && (
                    <p className="text-xs text-muted-foreground">
                      Mật khẩu phải có ít nhất 8 ký tự
                    </p>
                  )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Xác nhận mật khẩu mới{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) =>
                      handlePasswordChange("confirm", e.target.value)
                    }
                    placeholder="Nhập lại mật khẩu mới"
                    className={`pr-10 ${
                      passwordErrors.confirm ? "border-destructive" : ""
                    }`}
                    disabled={isChangingPassword}
                  />
                </div>
                {passwordErrors.confirm && (
                  <p className="text-xs text-destructive">
                    {passwordErrors.confirm}
                  </p>
                )}
                {confirmPassword &&
                  !passwordErrors.confirm &&
                  isPasswordMatch && (
                    <p className="text-xs text-green-600">Mật khẩu khớp</p>
                  )}
              </div>

              <div className="rounded-lg bg-muted/50 border p-4 text-sm">
                <p className="font-medium mb-2 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Yêu cầu mật khẩu:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-6">
                  <li>Tối thiểu 8 ký tự</li>
                  <li>
                    Nên bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt
                  </li>
                  <li>Không sử dụng thông tin cá nhân làm mật khẩu</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  onClick={handleChangePassword}
                  disabled={!canChangePassword}
                  className="min-w-[160px]"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang đổi mật khẩu...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Đổi mật khẩu
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}