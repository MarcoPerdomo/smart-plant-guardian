# Connect AI capabilities to your own LLM backend

## Goal
Stop spending Lovable AI credits on chat ("AI Check") by routing the assistant to your own OpenAI-compatible LLM endpoint (Ollama / vLLM / llama.cpp / LM Studio), while keeping Lovable AI Gateway as an optional fallback.

## Current state (confirmed)
- `src/routes/api/chat.ts` uses `createLovableAiGatewayProvider(apiKey)` from `src/lib/ai-gateway.server.ts` → every chat message bills Lovable AI credits.
- Voice transcription also goes through the gateway (`openai/gpt-4o-transcribe`).
- Species profile + image generation (`src/lib/plants.server.ts`) also use the gateway — these are low-volume; keep on gateway (or optionally also reroute profile generation to your LLM).

## What to build

1. **Configurable provider in `src/lib/ai-gateway.server.ts`**
   - Read new secrets: `LLM_PROVIDER` (`gateway` | `local`), `LOCAL_LLM_BASE_URL`, `LOCAL_LLM_API_KEY` (optional for Ollama), `LOCAL_LLM_MODEL` (e.g. `qwen2.5:14b`).
   - When `LLM_PROVIDER=local`, build the chat provider with `createOpenAICompatible({ baseURL: LOCAL_LLM_BASE_URL, apiKey, name: "local" })` instead of the Lovable gateway.

2. **Update `/api/chat` route**
   - Use the provider factory based on `LLM_PROVIDER`.
   - Model string comes from `LOCAL_LLM_MODEL` when local.
   - Keep tools identical — requires your local model to support function/tool calling (e.g. Qwen 2.5, Llama 3.1+, Mistral Nemo).
   - Transcription stays on the gateway (small cost) unless you want a local Whisper endpoint too — flag for a follow-up.

3. **Secrets setup**
   - Add `LLM_PROVIDER`, `LOCAL_LLM_BASE_URL`, `LOCAL_LLM_API_KEY`, `LOCAL_LLM_MODEL` as project secrets; document them in README.

4. **Out of scope (kept on gateway)**
   - Species profile generation and image generation in `src/lib/plants.server.ts` (low volume; image gen has no local equivalent here).

## Notes for you
- Your local LLM must be reachable over HTTPS from the cloud backend (e.g. Cloudflare Tunnel, Tailscale Funnel, or a reverse proxy on your home server/Pi 5 — note a Pi 5 realistically runs only small quantized models; a GPU box or hosted vLLM works better).
- Recommended models with reliable tool calling: Qwen2.5 14B/32B, Llama 3.3, Mistral Small.
- Fallback: if the local endpoint is unreachable, surface a clear error in the chat UI (no silent gateway fallback, so you never get surprised by credit usage).
