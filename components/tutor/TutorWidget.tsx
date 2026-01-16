"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { MessageCircle, Sparkles, PanelRightClose, Crown } from "lucide-react";
import { useRef, useEffect } from "react";
import { TutorChat } from "./TutorChat";
import { TutorProvider, useTutor } from "./TutorContext";
import Pusher from "pusher-js";
import { env } from "@/lib/env";
import { toast } from "sonner";

interface TutorPanelProps {
  isPremium?: boolean;
  premiumExpires?: Date | null;
  userId?: string;
}

function TutorPanel({ isPremium, premiumExpires, userId }: TutorPanelProps) {
  const { isOpen, closeChat, toggleChat } = useTutor();
  const pathname = usePathname();
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    const pusher = new Pusher(env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: 'ap1',
      authEndpoint: '/api/pusher/auth',
    });

    const channel = pusher.subscribe(`private-user-${userId}`);
    channel.bind('premium-activated', (data: { isPremium: boolean }) => {
      toast.success("🎉 Gói AI Pro đã được kích hoạt! Đang cập nhật...");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-user-${userId}`);
      pusher.disconnect();
    };
  }, [userId]);

  // Only hide on Banned page
  if (pathname === "/banned") return null;

  const handleDragStart = () => {
    isDraggingRef.current = true;
  };

  const handleDragEnd = () => {
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 200);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    toggleChat();
  };

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close chat"
        className={`
          fixed inset-0 z-40 bg-black/40 backdrop-blur-sm
          transition-opacity duration-300 cursor-default
          ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
        onClick={closeChat}
      />

      {/* Slide-out Panel */}
      <div
        className={`
          fixed top-0 right-0 z-50
          h-full w-full sm:w-[640px] lg:w-[720px]
          transform transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        <div
          className="
            h-full w-full
            bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950
            border-l border-cyan-500/20
            shadow-2xl shadow-black/50
            flex flex-col
          "
        >
          {/* Header */}
          <div
            className="
              flex items-center justify-between
              px-6 py-5
              bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-cyan-500/10
              border-b border-cyan-500/20
            "
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-slate-900" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white text-lg">
                    ChatBot Tư Vấn
                  </h3>
                  {isPremium && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-medium flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      Pro
                    </span>
                  )}
                </div>
                <p className="text-sm text-cyan-300/70">
                  Powered by Gemini AI
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeChat}
              className="
                p-2.5 rounded-xl
                text-slate-400 hover:text-white
                hover:bg-white/10
                transition-colors
              "
              aria-label="Close chat"
            >
              <PanelRightClose className="w-6 h-6" />
            </button>
          </div>

          {/* Chat Content - Takes remaining space */}
          <div className="flex-1 overflow-hidden">
            <TutorChat isPremium={isPremium} premiumExpires={premiumExpires} userId={userId} />
          </div>
        </div>
      </div>

      {/* Floating Action Button - Draggable */}
      {!isOpen && (
        <motion.button
          drag
          dragMomentum={false}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onClick={handleClick}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          type="button"
          className={`
            fixed bottom-28 right-6 z-50
            w-16 h-16
            bg-gradient-to-br from-cyan-400 to-blue-600
            rounded-full
            shadow-lg shadow-cyan-500/30
            cursor-move
            flex items-center justify-center
            group
          `}
          aria-label="Open AI tutor"
        >
          <div
            className="
              absolute inset-0 rounded-full
              bg-gradient-to-br from-cyan-400 to-blue-600
              animate-ping opacity-30
            "
          />
          <MessageCircle className="w-7 h-7 text-white" />
          
          {/* Premium Badge on FAB */}
          {isPremium && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <Crown className="w-3 h-3 text-white" />
            </span>
          )}
        </motion.button>
      )}
    </>
  );
}

interface TutorWidgetProps {
  isPremium?: boolean;
  premiumExpires?: Date | null;
  userId?: string;
}

export function TutorWidget({ isPremium = false, premiumExpires, userId }: TutorWidgetProps) {
  return (
    <TutorProvider>
      <TutorPanel isPremium={isPremium} premiumExpires={premiumExpires} userId={userId} />
    </TutorProvider>
  );
}
