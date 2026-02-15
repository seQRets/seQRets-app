
'use client';

import React, { useState, useRef, useEffect, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Loader2, Send, User, ExternalLink, Eraser } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { askBob } from '@/ai/flows/ask-bob-flow';
import { AskBobInput } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

type ChatMessage = {
    role: 'user' | 'model';
    content: string;
};

const CHAT_HISTORY_KEY = 'bob-chat-history';

function getChatHistory(): ChatMessage[] {
    try {
        const stored = localStorage.getItem(CHAT_HISTORY_KEY);
        if (!stored) return [];
        return JSON.parse(stored) as ChatMessage[];
    } catch {
        return [];
    }
}

function saveChatHistory(messages: ChatMessage[]) {
    try {
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    } catch {
        // Storage full or unavailable — silently ignore
    }
}

function clearChatHistory() {
    localStorage.removeItem(CHAT_HISTORY_KEY);
}

interface BobChatInterfaceProps {
  initialMessage?: string;
  showLinkToFullPage?: boolean;
}

export function BobChatInterface({ initialMessage, showLinkToFullPage = false }: BobChatInterfaceProps) {
    const { toast } = useToast();
    const [conversation, setConversation] = useState<ChatMessage[]>(() => {
        // Load persisted history on mount, or fall back to initial greeting
        if (typeof window === 'undefined') return [];
        const saved = getChatHistory();
        if (saved.length > 0) return saved;
        if (initialMessage) return [{ role: 'model' as const, content: initialMessage }];
        return [];
    });
    const [message, setMessage] = useState('');
    const [isPending, startTransition] = useTransition();
    const viewportRef = useRef<HTMLDivElement>(null);

    // Scroll the chat viewport to the bottom
    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            const vp = viewportRef.current;
            if (vp) vp.scrollTop = vp.scrollHeight;
        });
    };

    // Scroll to bottom on mount (so the user sees the most recent messages)
    useEffect(() => {
        scrollToBottom();
    }, []);

    // Scroll to bottom whenever conversation changes or loading state changes
    useEffect(() => {
        scrollToBottom();
    }, [conversation, isPending]);

    // Persist conversation to localStorage whenever it changes
    useEffect(() => {
        if (conversation.length > 0) {
            saveChatHistory(conversation);
        }
    }, [conversation]);

    // Listen for storage events so the popover and full page stay in sync
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === CHAT_HISTORY_KEY && e.newValue) {
                try {
                    const updated = JSON.parse(e.newValue) as ChatMessage[];
                    setConversation(updated);
                } catch { /* ignore parse errors */ }
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const handleClearChat = () => {
        clearChatHistory();
        const fresh: ChatMessage[] = initialMessage
            ? [{ role: 'model', content: initialMessage }]
            : [];
        setConversation(fresh);
        saveChatHistory(fresh);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        const userMessage: ChatMessage = { role: 'user', content: message };
        setConversation(prev => [...prev, userMessage]);

        const currentQuestion = message;
        setMessage('');

        startTransition(async () => {
            const flowInput: AskBobInput = {
                history: conversation,
                question: currentQuestion,
            };

            try {
                const response = await askBob(flowInput);
                const bobMessage: ChatMessage = { role: 'model', content: response };
                setConversation(prev => [...prev, bobMessage]);
            } catch (error) {
                console.error("AI Error:", error);
                const errorMessage: ChatMessage = { role: 'model', content: "Sorry, I ran into an unexpected error. Please try again." };
                setConversation(prev => [...prev, errorMessage]);
                toast({
                    variant: "destructive",
                    title: "AI Error",
                    description: "Could not get a response from the assistant.",
                });
            }
        });
    };


    return (
        <div className="flex flex-col h-full">
            <ScrollArea className="flex-grow h-0 pr-4" viewportRef={viewportRef}>
                <div className="space-y-6">
                {conversation.map((chat, index) => (
                    <div key={index} className={cn("flex items-start gap-3", chat.role === 'user' && "justify-end")}>
                        {chat.role === 'model' && (
                            <Avatar className="h-8 w-8">
                                <AvatarFallback><Bot size={20}/></AvatarFallback>
                            </Avatar>
                        )}
                        <div className={cn("max-w-sm p-3 rounded-lg text-sm",
                            chat.role === 'user' ? "bg-primary text-white" : "bg-muted"
                        )}>
                            <ReactMarkdown
                              components={{
                                  p: ({node, ...props}) => <p className="text-sm" {...props} />,
                                  ol: ({node, ...props}) => <ol className="list-decimal space-y-1 pl-4" {...props} />,
                                  ul: ({node, ...props}) => <ul className="list-disc space-y-1 pl-4" {...props} />,
                                  li: ({node, ...props}) => <li className="text-sm" {...props} />,
                              }}
                            >
                                {chat.content}
                            </ReactMarkdown>
                        </div>
                            {chat.role === 'user' && (
                            <Avatar className="h-8 w-8">
                                <AvatarFallback><User size={20}/></AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                ))}
                    {isPending && (
                    <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8">
                            <AvatarFallback><Bot size={20}/></AvatarFallback>
                        </Avatar>
                        <div className="max-w-sm p-3 rounded-lg bg-muted">
                            <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                    </div>
                )}
                </div>
            </ScrollArea>
             <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-4 border-t mt-4">
                <Input
                    id="message"
                    placeholder="Ask Bob about security or inheritance..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={isPending}
                    autoComplete="off"
                />
                <Button type="submit" size="icon" disabled={isPending || !message.trim()} className="bg-primary text-primary-foreground hover:bg-primary/80 hover:shadow-md flex-shrink-0">
                    <Send className="h-5 w-5" />
                </Button>
            </form>
            <div className="flex items-center justify-center gap-3 mt-2">
                {showLinkToFullPage && (
                    <Button variant="link" asChild size="sm">
                        <Link href="/support">
                           Open in full page
                           <ExternalLink className="ml-2 h-4 w-4"/>
                        </Link>
                    </Button>
                )}
                <Button
                    variant="link"
                    size="sm"
                    onClick={handleClearChat}
                    disabled={conversation.length <= 1}
                    className="text-muted-foreground hover:text-foreground"
                >
                    <Eraser className="mr-1 h-3 w-3" />
                    Clear Chat
                </Button>
            </div>
        </div>
    );
}
