import { Bot, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";

export function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const text = message.parts?.map((p) => (p.type === "text" ? p.text : "")).join("");

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <Card
        className={cn(
          "max-w-[80%] border-0 shadow-none",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        <CardContent className="px-4 py-2">
          <p className="text-sm whitespace-pre-wrap">{text}</p>
        </CardContent>
      </Card>
    </div>
  );
}
