"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Bug, Lightbulb, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createFeedback } from "@/lib/feedback.functions";
import { toast } from "sonner";

const categories = [
  { id: "bug", label: "Bug", icon: Bug },
  { id: "feature", label: "Feature idea", icon: Lightbulb },
  { id: "plant_data", label: "Plant data issue", icon: MessageSquare },
  { id: "other", label: "Other", icon: MessageSquare },
] as const;

type Category = (typeof categories)[number]["id"];

export function FeedbackForm({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [category, setCategory] = React.useState<Category>("bug");
  const [message, setMessage] = React.useState("");

  const submit = useMutation({
    mutationFn: () =>
      createFeedback({
        data: {
          category,
          message: message.trim(),
          pagePath: typeof window !== "undefined" ? window.location.pathname : undefined,
          userAgent: typeof window !== "undefined" ? window.navigator.userAgent : undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Feedback sent — thank you!");
      setMessage("");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    submit.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children ?? <Button variant="outline">Send feedback</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Send beta feedback</DialogTitle>
            <DialogDescription>
              Found a bug, have an idea or spotted wrong plant data? Let us know.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Category</Label>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        category === c.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="feedback-message">Message</Label>
              <Textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe what happened or what you'd like to see..."
                rows={4}
                required
                maxLength={5000}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submit.isPending || !message.trim()}>
              <Send className="mr-2 h-4 w-4" />
              {submit.isPending ? "Sending..." : "Send feedback"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
