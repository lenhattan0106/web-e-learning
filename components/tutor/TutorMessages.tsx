"use client";

import type { UIMessage } from "ai";
import { Sparkles, User, Search, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Markdown from "react-markdown";
import { useTutor } from "./TutorContext";

interface TutorMessagesProps {
  messages: UIMessage[];
  isLoading: boolean;
}

// Extend functionality for custom handling if needed, though 'toolInvocations' exists on UIMessage in newer SDK versions.
// If not, we use 'tool-invocation' part type check or manual type assertion.
// For safety with current valid lint errors, we'll assume standard Vercel AI SDK structure but typed carefully.




export function TutorMessages({ messages, isLoading }: TutorMessagesProps) {
  return (
    <div className="space-y-6">
      {messages.map((message) => (
        <div key={message.id} className="space-y-4">
          <div className={`flex gap-4 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
            {/* Avatar */}
            <div
              className={`
                shrink-0 w-8 h-8 rounded-lg flex items-center justify-center shadow-lg
                ${
                  message.role === "assistant"
                    ? "bg-gradient-to-br from-indigo-500 to-purple-600 border border-indigo-400/30"
                    : "bg-gradient-to-br from-slate-600 to-slate-700 border border-slate-500/30"
                }
              `}
            >
              {message.role === "assistant" ? (
                <Sparkles className="w-4 h-4 text-white" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>

            {/* Content Bubble */}
            <div className={`flex flex-col gap-2 max-w-[85%] ${message.role === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`
                  px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-md
                  ${
                    message.role === "assistant"
                      ? "bg-slate-800/80 border border-slate-700/50 text-slate-100 rounded-tl-none"
                      : "bg-indigo-600 text-white rounded-tr-none shadow-indigo-500/20"
                  }
                `}
              >
                {/* Use any cast to access parts/content safely across SDK versions */}
                {(message as any).parts ? (
                  (message as any).parts.map((part: any, index: number) => {
                    if (part.type === 'text') {
                      return <MessageContent key={index} content={part.text} role={message.role} />;
                    }
                    if (part.type === 'tool-invocation') {
                      const toolInvocation = part.toolInvocation;
                      return (
                        <div key={index} className="flex items-center gap-2 my-2 p-2 bg-black/20 rounded border border-white/10">
                          {toolInvocation.state === 'result' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                          )}
                           <span className="text-xs font-mono text-slate-300">
                             Calling: {toolInvocation.toolName}
                           </span>
                        </div>
                      );
                    }
                    return null;
                  })
                ) : (
                  // Fallback for simple string content
                   <MessageContent content={(message as any).content || ''} role={message.role} />
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Loading State */}
      {isLoading && messages[messages.length - 1]?.role === "user" && (
         <div className="flex gap-4">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-pulse">
                <Sparkles className="w-4 h-4 text-white/80" />
            </div>
            <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-slate-800/50 rounded-tl-none">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
            </div>
         </div>
      )}
    </div>
  );
}

function MessageContent({ content, role }: { content: string, role: string }) {
  const { closeChat } = useTutor();

  return (
    <Markdown
      components={{
        a: (props: any) => {
          const { href, children } = props;
          if (!href) return <span>{children}</span>;
          const isInternal = href.startsWith("/");
          const className = "text-sky-400 hover:text-sky-300 underline underline-offset-2 transition-colors font-medium";
          
          if (isInternal) {
            return <Link href={href} onClick={closeChat} className={className}>{children}</Link>;
          }
          return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
        },
        p: ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }: any) => <ul className="list-disc list-outside ml-4 mb-2 space-y-1 marker:text-sky-500">{children}</ul>,
        ol: ({ children }: any) => <ol className="list-decimal list-outside ml-4 mb-2 space-y-1 marker:text-sky-500">{children}</ol>,
        li: ({ children }: any) => <li className="pl-1">{children}</li>,
        code: (props: any) => {
            const { className, children } = props;
            const isInline = !className;
            if(isInline) {
                return <code className="px-1.5 py-0.5 rounded bg-black/20 text-sky-300 font-mono text-xs border border-sky-500/10">{children}</code>
            }
            return <code className={`${className} text-sm`}>{children}</code>
        },
        pre: ({ children }: any) => (
            <div className="relative group">
                <div className="absolute top-2 right-2 flex gap-1">
                   <div className="w-2 h-2 rounded-full bg-red-500/20" />
                   <div className="w-2 h-2 rounded-full bg-yellow-500/20" />
                   <div className="w-2 h-2 rounded-full bg-green-500/20" />
                </div>
                <pre className="p-4 pt-8 rounded-lg bg-slate-950/50 border border-slate-800 overflow-x-auto my-3 text-xs font-mono shadow-inner">
                    {children}
                </pre>
            </div>
        ),
        strong: ({children}: any) => <strong className="font-semibold text-sky-200">{children}</strong>,
        blockquote: ({children}: any) => (
            <blockquote className="border-l-2 border-indigo-500/50 pl-3 py-1 my-2 bg-indigo-500/5 text-slate-300 italic text-xs">
                {children}
            </blockquote>
        )
      }}
    >
      {content}
    </Markdown>
  );
}