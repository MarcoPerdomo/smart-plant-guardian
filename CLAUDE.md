# Smart Plant Guardian

Web dashboard (built with Lovable, TanStack Start + Supabase) that ingests Arduino/Raspberry Pi sensor data for indoor plants, tracks status over time, predicts watering, and produces short AI care summaries. Owner's main personal project; themes they care about: ecology, society, solving real problems.

## Layout
- `src/` app code (server functions in `src/lib/*.functions.ts`, API routes in `src/routes/api/`)
- `supabase/` migrations and DB docs
- `pi-agent/` Raspberry Pi sensor agent (posts to `/api/public/ingest`)
- `.lovable/plan/` Lovable planning docs

## AI summaries (cost-reduced)
- `generateSummary` in `src/lib/plants.functions.ts` calls Groq (OpenAI-compatible) with `llama-3.1-8b-instant`.
- Env: `GROQ_API_KEY` (required), `AI_SUMMARY_BASE_URL`, `AI_SUMMARY_MODEL` (optional overrides, e.g. Together AI / Qwen 2.5 7B).
- JSON parse is defensive; status falls back to `unknown`.

## Out of scope for now (to be handled differently later)
Chat assistant (`src/routes/api/chat.ts`), catalog import, and image generation still use the Lovable AI Gateway. Don't migrate them unless asked.

## Notes
- Connected to Lovable: never rewrite published git history (see AGENTS.md).
- Never print `.env` contents.
