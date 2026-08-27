import { createFileRoute } from "@tanstack/react-router";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect } from "react";
import { Send, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/assistant/chat-message";
import { VoiceInput } from "@/components/assistant/voice-input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatPage,
  head: () => ({
    title: "Ask Verdant",
    meta: [
      { name: "description", content: "Chat with Verdant's AI plant care assistant." },
      { property: "og:title", content: "Ask Verdant" },
      { property: "og:description", content: "Chat with Verdant's AI plant care assistant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ChatPage() {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [audioLoading, setAudioLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const transportRef = useRef(
    new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: async ({ messages }) => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("Not authenticated");

        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`,
        };

        if (pendingAudioRef.current) {
          const formData = new FormData();
          formData.append("messages", JSON.stringify(messages));
          formData.append("audio", pendingAudioRef.current, "recording.wav");
          return { headers, body: formData as unknown as object };
        }

        headers["Content-Type"] = "application/json";
        return { headers, body: { messages } };
      },
    })
  );

  const chat = useChat({
    id: sessionId,
    transport: transportRef.current,
  });

  const pendingAudioRef = useRef<Blob | null>(null);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat.messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() && !pendingAudioRef.current) return;
    chat.sendMessage({ text: inputValue.trim() || " " });
    setInputValue("");
  };

  const handleAudio = (blob: Blob) => {
    pendingAudioRef.current = blob;
    setAudioLoading(true);
    chat.sendMessage({ text: " " });
    pendingAudioRef.current = null;
    setAudioLoading(false);
  };

  const isLoading = chat.status === "submitted" || chat.status === "streaming" || audioLoading;

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-8rem)]">
      <Card className="h-full flex flex-col">
        <CardHeader className="border-b shrink-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="w-5 h-5 text-primary" />
            Ask Verdant
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {chat.messages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8">
                  Ask me anything about your plants — for example:
                  <ul className="mt-2 space-y-1">
                    <li>“How is my Monstera doing?”</li>
                    <li>“Log watering for my Pothos”</li>
                    <li>“Add a new plant called Fern”</li>
                    <li>“What plants need less sun?”</li>
                  </ul>
                </div>
              )}
              {chat.messages.map((message: UIMessage) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0.1s]" />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0.2s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <form onSubmit={handleSubmit} className="border-t p-4 flex items-end gap-2 shrink-0">
            <VoiceInput onRecordingComplete={handleAudio} disabled={isLoading} />
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about your plants…"
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={isLoading || (!inputValue.trim() && !pendingAudioRef.current)}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
