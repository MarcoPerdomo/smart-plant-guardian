import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { PLANT_CARE_SYSTEM_PROMPT } from "@/lib/assistant/prompts";
import { createAssistantTools } from "@/lib/assistant/tools";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = authHeader.replace("Bearer ", "");

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!supabaseUrl || !supabaseKey) {
          return new Response("Missing Supabase configuration", { status: 500 });
        }

        const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
          global: {
            fetch: createSupabaseFetch(supabaseKey),
            headers: { Authorization: `Bearer ${token}` },
          },
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
        if (claimsError || !claimsData?.claims) {
          return new Response("Invalid token", { status: 401 });
        }
        const claims = claimsData.claims as Record<string, unknown>;
        const userEmail = typeof claims.email === "string" ? claims.email.toLowerCase() : "";
        if (!userEmail) {
          return new Response("Token missing email claim", { status: 401 });
        }

        let messages: UIMessage[] = [];
        let audio: File | null = null;

        const contentType = request.headers.get("content-type") ?? "";
        if (contentType.includes("multipart/form-data")) {
          const formData = await request.formData();
          const messagesField = formData.get("messages");
          if (typeof messagesField === "string") {
            messages = JSON.parse(messagesField) as UIMessage[];
          }
          const audioField = formData.get("audio");
          if (audioField instanceof File && audioField.size > 2048) {
            audio = audioField;
          }
        } else {
          const body = (await request.json()) as { messages?: UIMessage[] };
          messages = body.messages ?? [];
        }

        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response("Messages are required", { status: 400 });
        }

        let userText = "";
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === "user") {
          const textPart = lastMessage.parts?.find((p) => p.type === "text");
          userText = textPart?.type === "text" ? textPart.text : "";
        }

        if (audio) {
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return new Response("AI unavailable", { status: 500 });
          }

          const upstream = new FormData();
          const ext = ({ "audio/wav": "wav", "audio/webm": "webm", "audio/mp4": "mp4", "audio/mpeg": "mp3" } as Record<string, string>)[audio.type.split(";")[0] ?? ""] ?? "wav";
          upstream.append("file", audio, `recording.${ext}`);
          upstream.append("model", "openai/gpt-4o-transcribe");
          upstream.append("stream", "false");

          const resp = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: upstream,
          });
          if (!resp.ok) {
            const txt = await resp.text();
            return new Response(`Transcription failed: ${resp.status} ${txt}`, { status: 502 });
          }
          const transcriptJson = await resp.json();
          userText = transcriptJson.text ?? "";

          // Replace the last user message text part with the transcript
          messages = messages.slice(0, -1);
          messages.push({
            role: "user",
            content: userText,
            parts: [{ type: "text", text: userText }],
            id: crypto.randomUUID(),
            createdAt: new Date(),
          } as UIMessage);
        }

        if (!userText.trim()) {
          return new Response("No user message text available", { status: 400 });
        }

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response("AI unavailable", { status: 500 });
        }

        const gateway = createLovableAiGatewayProvider(apiKey);
        const tools = createAssistantTools({ supabase, userEmail, claims });

        const result = streamText({
          model: gateway("openai/gpt-5.6-sol"),
          system: PLANT_CARE_SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages),
          tools,
          toolChoice: "auto",
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
        });
      },
    },
  },
});
