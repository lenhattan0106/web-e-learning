"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  MessageCircle,
  MoreHorizontal,
  Flag,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { tryCatch } from "@/hooks/try-catch";
import { useConstructUrl } from "@/hooks/use-contruct-url";
import {
  createComment,
  deleteComment,
  updateComment,
  reportComment,
  getComments,
} from "@/app/dashboard/[slug]/[lessonId]/_actions/comment-actions";

// Types
interface CommentUser {
  id: string;
  name: string;
  image: string | null;
}

interface CommentReply {
  id: string;
  noiDung: string;
  ngayTao: Date;
  nguoiDung: CommentUser;
}

interface Comment {
  id: string;
  noiDung: string;
  capDo: number;
  ngayTao: Date;
  nguoiDung: CommentUser;
  replies: CommentReply[];
  _count: { baoCaos: number };
}

// Helper to build full avatar URL from relative path
function buildAvatarUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  // If already a full URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  // Build full URL from relative path
  return `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES}.t3.storage.dev/${imagePath}`;
}

// TimeAgo component with real-time updates
function TimeAgo({ date }: { date: Date }) {
  const [timeAgo, setTimeAgo] = useState("");

  useEffect(() => {
    // Calculate initial value
    const updateTime = () => {
      setTimeAgo(
        formatDistanceToNow(new Date(date), {
          addSuffix: false,
          locale: vi,
        }) + " trước"
      );
    };

    updateTime(); // Initial

    // Update every 30 seconds
    const interval = setInterval(updateTime, 30000);

    return () => clearInterval(interval);
  }, [date]);

  // Return empty during SSR, only show on client
  if (!timeAgo) return <span className="text-xs text-muted-foreground">...</span>;

  return (
    <span className="text-xs text-muted-foreground">
      {timeAgo}
    </span>
  );
}

interface CommentSectionProps {
  comments: Comment[];
  idBaiHoc: string;
  idKhoaHoc: string;
  currentUserId: string;
}

// Main CommentSection Component
export function CommentSection({
  comments: initialComments,
  idBaiHoc,
  idKhoaHoc,
  currentUserId,
}: CommentSectionProps) {
  const [comments, setComments] = useState(initialComments);
  const router = useRouter();

  // Sync props to state (in case parent updates)
  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  const handleCommentAdded = async () => {
    // Client-side refresh to avoid page reload (video interruption)
    const newComments = await getComments(idBaiHoc);
    // Cast to compatible type if needed, effectively it matches
    setComments(newComments as unknown as Comment[]);
  };

  return (
    <div className="space-y-6">
      {/* Header with count and hint - F8 style */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-xl font-bold">
          {comments.length} bình luận
        </h2>
        <p className="text-sm text-muted-foreground">
          Nếu thấy bình luận spam, các bạn bấm report giúp admin nhé
        </p>
      </div>

      {/* Comment Form */}
      <CommentForm
        idBaiHoc={idBaiHoc}
        idKhoaHoc={idKhoaHoc}
        onSuccess={handleCommentAdded}
      />

      {/* Comments List */}
      <div className="space-y-6">
        {comments.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
          </p>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              idBaiHoc={idBaiHoc}
              idKhoaHoc={idKhoaHoc}
              currentUserId={currentUserId}
              onUpdate={handleCommentAdded}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Comment Form Component
interface CommentFormProps {
  idBaiHoc: string;
  idKhoaHoc: string;
  idCha?: string;
  onSuccess: () => void;
  onCancel?: () => void;
  placeholder?: string;
}

function CommentForm({
  idBaiHoc,
  idKhoaHoc,
  idCha,
  onSuccess,
  onCancel,
  placeholder = "Viết bình luận của bạn...",
}: CommentFormProps) {
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!content.trim()) return;

    startTransition(async () => {
      const { data, error } = await tryCatch(
        createComment({
          noiDung: content,
          idBaiHoc,
          idKhoaHoc,
          idCha,
        })
      );

      if (error) {
        toast.error("Không thể gửi bình luận");
        return;
      }

      if (data.status === "success") {
        toast.success(data.message);
        setContent("");
        onSuccess();
      } else {
        toast.error(data.message);
      }
    });
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="min-h-[80px] resize-none"
        disabled={pending}
      />
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Hủy
          </Button>
        )}
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={pending || !content.trim()}
        >
          {pending ? "Đang gửi..." : idCha ? "Phản hồi" : "Bình luận"}
        </Button>
      </div>
    </div>
  );
}

// Comment Item Component
interface CommentItemProps {
  comment: Comment | CommentReply;
  idBaiHoc: string;
  idKhoaHoc: string;
  currentUserId: string;
  onUpdate: () => void;
  isReply?: boolean;
}

function CommentItem({
  comment,
  idBaiHoc,
  idKhoaHoc,
  currentUserId,
  onUpdate,
  isReply = false,
}: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.noiDung);
  const [pending, startTransition] = useTransition();

  const isOwner = comment.nguoiDung.id === currentUserId;
  const hasReplies = "replies" in comment && comment.replies.length > 0;

  const handleDelete = () => {
    startTransition(async () => {
      const { data, error } = await tryCatch(deleteComment(comment.id));

      if (error) {
        toast.error("Không thể xóa bình luận");
        return;
      }

      if (data.status === "success") {
        toast.success(data.message);
        onUpdate();
      } else {
        toast.error(data.message);
      }
    });
  };

  const handleEdit = () => {
    if (!editContent.trim()) {
      toast.error("Nội dung không được để trống");
      return;
    }

    startTransition(async () => {
      const { data, error } = await tryCatch(updateComment(comment.id, editContent));

      if (error) {
        toast.error("Không thể cập nhật bình luận");
        return;
      }

      if (data.status === "success") {
        toast.success(data.message);
        setIsEditing(false);
        onUpdate();
      } else {
        toast.error(data.message);
      }
    });
  };

  return (
    <div className={`${isReply ? "ml-12 border-l-2 pl-4" : ""}`}>
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          {buildAvatarUrl(comment.nguoiDung.image) ? (
            <Image
              src={buildAvatarUrl(comment.nguoiDung.image)!}
              alt={comment.nguoiDung.name}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover"
              onError={(e) => {
                // Hide broken image, show fallback
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center ${comment.nguoiDung.image ? 'hidden' : ''}`}>
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-primary cursor-pointer">
              {comment.nguoiDung.name}
            </span>
            <TimeAgo date={new Date(comment.ngayTao)} />
          </div>

          {/* Content - Edit mode or Display mode */}
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px] resize-none"
                disabled={pending}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleEdit}
                  disabled={pending || !editContent.trim()}
                >
                  {pending ? "Đang lưu..." : "Lưu"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.noiDung);
                  }}
                >
                  Hủy
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {comment.noiDung}
            </p>
          )}

          {/* Actions - F8 style inline */}
          <div className="flex items-center gap-4 mt-2">
            {!isReply && (
              <button
                className="text-sm font-medium text-primary hover:underline"
                onClick={() => setShowReplyForm(!showReplyForm)}
              >
                Phản hồi
              </button>
            )}

            {/* More Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                {isOwner && (
                  <>
                    <DropdownMenuItem
                      onClick={() => setIsEditing(true)}
                      disabled={pending}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Chỉnh sửa
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleDelete}
                      disabled={pending}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Xóa bình luận
                    </DropdownMenuItem>
                  </>
                )}
                {!isOwner && (
                  <DropdownMenuItem onClick={() => setShowReportModal(true)}>
                    <Flag className="w-4 h-4 mr-2" />
                    Báo cáo vi phạm
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Reply Form */}
          {showReplyForm && !isReply && (
            <div className="pt-2">
              <CommentForm
                idBaiHoc={idBaiHoc}
                idKhoaHoc={idKhoaHoc}
                idCha={comment.id}
                onSuccess={() => {
                  setShowReplyForm(false);
                  onUpdate();
                }}
                onCancel={() => setShowReplyForm(false)}
                placeholder="Viết phản hồi..."
              />
            </div>
          )}

          {/* Show/Hide Replies */}
          {hasReplies && (
            <button
              className="text-xs text-primary flex items-center gap-1 pt-2"
              onClick={() => setShowReplies(!showReplies)}
            >
              {showReplies ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  Ẩn {(comment as Comment).replies.length} phản hồi
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  Xem {(comment as Comment).replies.length} phản hồi
                </>
              )}
            </button>
          )}

          {/* Replies */}
          {showReplies && hasReplies && (
            <div className="space-y-4 pt-3">
              {(comment as Comment).replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  idBaiHoc={idBaiHoc}
                  idKhoaHoc={idKhoaHoc}
                  currentUserId={currentUserId}
                  onUpdate={onUpdate}
                  isReply
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      <ReportModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        idBinhLuan={comment.id}
        onSuccess={onUpdate}
      />
    </div>
  );
}

// Report Modal Component
interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  idBinhLuan: string;
  onSuccess: () => void;
}

function ReportModal({ open, onClose, idBinhLuan, onSuccess }: ReportModalProps) {
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  const REPORT_REASONS = [
    "Nội dung spam hoặc quảng cáo",
    "Ngôn ngữ thô tục, xúc phạm",
    "Nội dung không liên quan",
    "Quấy rối hoặc bắt nạt",
    "Thông tin sai lệch",
    "Khác",
  ];

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error("Vui lòng chọn lý do báo cáo");
      return;
    }

    startTransition(async () => {
      const { data, error } = await tryCatch(reportComment(idBinhLuan, reason));

      if (error) {
        toast.error("Không thể gửi báo cáo");
        return;
      }

      if (data.status === "success") {
        toast.success(data.message);
        setReason("");
        onClose();
        onSuccess();
      } else {
        toast.error(data.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Báo cáo bình luận</DialogTitle>
          <DialogDescription>
            Cho chúng tôi biết lý do bạn muốn báo cáo bình luận này
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {REPORT_REASONS.map((r) => (
            <button
              key={r}
              className={`w-full text-left px-4 py-2 rounded-lg border transition-colors ${
                reason === r
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-muted"
              }`}
              onClick={() => setReason(r)}
            >
              {r}
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={pending || !reason}>
            {pending ? "Đang gửi..." : "Gửi báo cáo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
