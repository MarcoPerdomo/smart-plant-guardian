import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Download, Send, Save, Trash2 } from "lucide-react";
import {
  listAnnouncements,
  getSubscriberStats,
  saveAnnouncement,
  publishAnnouncement,
  deleteAnnouncement,
  listConfirmedSubscribers,
} from "@/lib/newsletter-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/newsletter")({
  component: AdminNewsletter,
  head: () => ({
    meta: [
      { title: "Newsletter — Verdant Admin" },
      { name: "description", content: "Write product announcements and manage newsletter subscribers." },
      { property: "og:title", content: "Newsletter — Verdant Admin" },
      { property: "og:description", content: "Write product announcements and manage newsletter subscribers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const input = "w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm";

function AdminNewsletter() {
  const qc = useQueryClient();
  const { data: stats } = useQuery({ queryKey: ["newsletter_stats"], queryFn: () => getSubscriberStats() });
  const { data: items = [] } = useQuery({ queryKey: ["announcements", "admin"], queryFn: () => listAnnouncements() });

  const [id, setId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");

  const reset = () => { setId(null); setTitle(""); setSummary(""); setBody(""); setLinkUrl(""); setCtaLabel(""); };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["announcements"] });
    qc.invalidateQueries({ queryKey: ["newsletter_stats"] });
  };

  const save = useMutation({
    mutationFn: () =>
      saveAnnouncement({
        data: {
          ...(id ? { id } : {}),
          title: title.trim(),
          summary: summary.trim() || null,
          body: body.trim(),
          link_url: linkUrl.trim() || null,
          cta_label: ctaLabel.trim() || null,
        },
      }),
    onSuccess: (r) => { setId(r.id); toast.success("Draft saved"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const publish = useMutation({
    mutationFn: (announcementId: string) => publishAnnouncement({ data: { id: announcementId } }),
    onSuccess: (r) => { toast.success(`Published to ${r.recipients} subscriber${r.recipients === 1 ? "" : "s"}`); reset(); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (announcementId: string) => deleteAnnouncement({ data: { id: announcementId } }),
    onSuccess: () => { toast.success("Draft deleted"); reset(); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportCsv = async () => {
    try {
      const rows = await listConfirmedSubscribers();
      const csv = ["email,confirmed_at", ...rows.map((r) => `${r.email},${r.confirmed_at ?? ""}`)].join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `verdant-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const copyHtml = async () => {
    const html = `<h1>${title}</h1>${summary ? `<p><em>${summary}</em></p>` : ""}<p>${body.replace(/\n/g, "<br/>")}</p>${
      linkUrl ? `<p><a href="${linkUrl}">${ctaLabel || "Learn more"}</a></p>` : ""
    }`;
    await navigator.clipboard.writeText(html);
    toast.success("HTML copied");
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-3 max-w-lg">
        <Stat label="Confirmed" value={stats?.confirmed ?? 0} />
        <Stat label="Pending" value={stats?.pending ?? 0} />
        <Stat label="Unsubscribed" value={stats?.unsubscribed ?? 0} />
      </div>

      <p className="text-xs text-muted-foreground max-w-2xl">
        Publishing sends an in-app announcement to every confirmed subscriber (bell + What's new). Email
        blasts need a dedicated marketing email service — export the subscriber list and copy the HTML below
        until one is connected.
      </p>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-3 max-w-2xl">
        <h2 className="font-display text-lg font-semibold">{id ? "Edit announcement" : "New announcement"}</h2>
        <input className={input} placeholder="Title" maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className={input} placeholder="Short summary (shown in the bell)" maxLength={300} value={summary} onChange={(e) => setSummary(e.target.value)} />
        <textarea className={`${input} min-h-40`} placeholder="Body" maxLength={20000} value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <input className={input} placeholder="Link URL (optional)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
          <input className={input} placeholder="Button label (optional)" maxLength={60} value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => save.mutate()}
            disabled={!title.trim() || !body.trim() || save.isPending}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" /> {save.isPending ? "Saving…" : "Save draft"}
          </button>
          <button
            onClick={() => id && publish.mutate(id)}
            disabled={!id || publish.isPending}
            className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted disabled:opacity-50 flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" /> Publish
          </button>
          <button onClick={copyHtml} disabled={!title.trim()} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted disabled:opacity-50">
            Copy HTML
          </button>
          <button onClick={exportCsv} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Export subscribers
          </button>
          {id && (
            <button onClick={reset} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted">
              New
            </button>
          )}
        </div>
      </section>

      <section className="space-y-3 max-w-2xl">
        <h2 className="font-display text-lg font-semibold">Announcements</h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing written yet.</p>
        ) : (
          items.map((a) => (
            <div key={a.id} className="rounded-xl border border-border p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[220px]">
                <div className="font-medium">{a.title}</div>
                <div className="text-xs text-muted-foreground">
                  {a.status === "published"
                    ? `Published ${a.published_at ? format(new Date(a.published_at), "d MMM yyyy") : ""} · ${a.recipient_count} recipients`
                    : "Draft"}
                </div>
              </div>
              {a.status === "draft" && (
                <>
                  <button
                    onClick={() => {
                      setId(a.id);
                      setTitle(a.title ?? "");
                      setSummary(a.summary ?? "");
                      setBody(a.body ?? "");
                      setLinkUrl(a.link_url ?? "");
                      setCtaLabel(a.cta_label ?? "");
                    }}
                    className="px-3 py-1.5 rounded-md border border-border text-sm hover:bg-muted"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove.mutate(a.id)}
                    className="px-2 py-1.5 rounded-md border border-border text-sm hover:bg-muted text-destructive"
                    aria-label="Delete draft"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
