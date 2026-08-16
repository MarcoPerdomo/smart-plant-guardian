import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile, listNotifications } from "@/lib/plants.functions";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Bell, Mail, MessageSquare, Cpu } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { LocationSettings } from "@/components/location-settings";
import { getMyUsername, setUsername as setUsernameFn, checkUsername } from "@/lib/social.functions";
import { AtSign, Check, Pencil } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings")({
  component: Settings,
  head: () => ({ meta: [{ title: "Settings — Verdant" }, { name: "description", content: "Notification preferences and Arduino ingestion details." }] }),
});

function Settings() {
  const qc = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const { data: notifications = [] } = useQuery({ queryKey: ["notifications"], queryFn: () => listNotifications() });

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [inApp, setInApp] = useState(true);
  const [email, setEmail] = useState(false);
  const [sms, setSms] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setPhone(profile.phone ?? "");
      setInApp(profile.notify_in_app);
      setEmail(profile.notify_email);
      setSms(profile.notify_sms);
    }
  }, [profile]);

  const saveMut = useMutation({
    mutationFn: () => updateProfile({ data: {
      display_name: displayName || null, phone: phone || null,
      notify_in_app: inApp, notify_email: email, notify_sms: sms,
    } }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const ingestUrl = typeof window !== "undefined" ? `${window.location.origin}/api/public/ingest` : "";
  const snapshotUrl = typeof window !== "undefined" ? `${window.location.origin}/api/public/snapshot-upload` : "";

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="font-display text-3xl font-semibold">Settings</h1>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Profile</h2>
        <div className="mt-3 space-y-3">
          <UsernameField />
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (E.164, e.g. +14155551234) — for SMS" className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" />
        </div>
      </section>


      <LocationSettings />



      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Notifications</h2>
        <p className="text-xs text-muted-foreground mt-1">Verdant sends you a short AI status summary a few times per week per plant.</p>
        <div className="mt-4 space-y-3">
          <Toggle icon={Bell} label="In-app" desc="Feed on this page and status badges." value={inApp} onChange={setInApp} />
          <Toggle icon={Mail} label="Email" desc="Needs an email provider connected." value={email} onChange={setEmail} />
          <Toggle icon={MessageSquare} label="SMS" desc="Needs Twilio (or similar) connected." value={sms} onChange={setSms} />
        </div>
      </section>

      <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
        {saveMut.isPending ? "Saving…" : "Save preferences"}
      </button>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2"><Cpu className="w-5 h-5 text-primary" /> Arduino ingestion</h2>
        <p className="text-sm text-muted-foreground mt-1">Point your Arduino's HTTP client to this endpoint. Set each device's <code>device_id</code> to match the value you saved on a plant.</p>
        <div className="mt-4 space-y-3 text-sm">
          <Field label="Endpoint URL">
            <div className="flex gap-2">
              <input readOnly value={ingestUrl} className="flex-1 px-3 py-2 rounded-md border border-input bg-muted font-mono text-xs" />
              <button onClick={() => { navigator.clipboard.writeText(ingestUrl); toast.success("Copied"); }} className="px-2 rounded-md border border-border hover:bg-muted">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </Field>
          <Field label="Required header">
            <code className="block px-3 py-2 rounded-md bg-muted font-mono text-xs">X-Ingest-Secret: &lt;your secret, stored in Cloud secrets as ARDUINO_INGEST_SECRET&gt;</code>
          </Field>
          <Field label="Example body">
<pre className="px-3 py-2 rounded-md bg-muted font-mono text-xs overflow-x-auto">{`{
  "device_id": "arduino-kitchen-01",
  "soil_moisture": 42,
  "temperature_c": 21.5,
  "humidity": 55,
  "light_lux": 320,
  "motion_events": 0
}`}</pre>
          </Field>
          <Field label="Snapshot upload endpoint">
            <div className="flex gap-2">
              <input readOnly value={snapshotUrl} className="flex-1 px-3 py-2 rounded-md border border-input bg-muted font-mono text-xs" />
              <button onClick={() => { navigator.clipboard.writeText(snapshotUrl); toast.success("Copied"); }} className="px-2 rounded-md border border-border hover:bg-muted">
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pi agents POST camera snapshots here as multipart/form-data with fields <code>device_id</code> and <code>snapshot</code>.</p>
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Recent notifications</h2>
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-2">No notifications yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {notifications.map((n) => (
              <li key={n.id} className="py-3">
                <div className="text-sm font-medium">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Toggle({ icon: Icon, label, desc, value, onChange }: { icon: React.ElementType; label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/40 cursor-pointer">
      <Icon className="w-5 h-5 mt-0.5 text-primary" />
      <div className="flex-1">
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="w-5 h-5 accent-primary" />
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
      {children}
    </div>
  );
}
