import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ClipboardList,
  Droplets,
  Flower2,
  Heart,
  Leaf,
  MessageCircle,
  Plus,
  ScanSearch,
  Scissors,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getHomepageShowcaseImages } from "@/lib/homepage-showcase.functions";

type ShowcaseSlide = {
  title: string;
  description: string;
  content: React.ReactNode;
};

type ShowcaseImage = { src: string; alt: string } | undefined;

const MONSTERA_SLUG = "monstera-deliciosa-swiss-cheese-plant";
const CALATHEA_SLUG = "calathea-orbifolia-round-leaf-calathea";

export function HomepageFeatureShowcase() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const regionRef = useRef<HTMLDivElement>(null);
  const { data: showcaseImages = {} } = useQuery({
    queryKey: ["homepage-showcase-images"],
    queryFn: () => getHomepageShowcaseImages(),
    staleTime: 60 * 60 * 1000,
  });
  const slides: ShowcaseSlide[] = [
    {
      title: "Add every plant",
      description: "Start a living profile with its species, location and care needs.",
      content: <AddPlantScene image={showcaseImages[MONSTERA_SLUG]} />,
    },
    {
      title: "Remember every moment",
      description: "Build a photo journal and keep watering, pruning, repotting and flowering together.",
      content: <JournalScene image={showcaseImages[CALATHEA_SLUG]} />,
    },
    {
      title: "Get thoughtful AI care",
      description: "Turn readings, weather and plant history into clear next steps.",
      content: <AdvisorScene />,
    },
    {
      title: "Ask Sentia AI anything",
      description: "Snap a leaf for disease identification and get an automatic health plan for your plant.",
      content: <AiPipelineScene image={showcaseImages[CALATHEA_SLUG]} />,
    },
    {
      title: "Grow with your community",
      description: "Share progress, ask for help and learn from plant lovers around you.",
      content: <CommunityScene />,
    },
  ];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 5200);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion]);

  const move = (direction: number) => {
    setActive((current) => (current + direction + slides.length) % slides.length);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") move(-1);
    if (event.key === "ArrowRight") move(1);
  };

  const slide = slides[active];

  return (
    <div
      ref={regionRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="What you can do with Sentia"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
      className="overflow-hidden rounded-lg border border-border bg-card shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Leaf className="h-3.5 w-3.5" />
          </span>
          Sentia
        </div>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-destructive/70" />
          <span className="h-2 w-2 rounded-full bg-warning/70" />
          <span className="h-2 w-2 rounded-full bg-success/70" />
        </div>
      </div>

      <div key={active} className="animate-fade-in" aria-live="polite">
        <div className="relative aspect-[4/3] min-h-[320px] overflow-hidden bg-muted/30 p-4 sm:p-6">
          {slide.content}
        </div>
        <div className="border-t border-border px-4 py-4 sm:px-5">
          <p className="font-display text-lg font-semibold text-foreground">{slide.title}</p>
          <p className="mt-1 min-h-10 text-sm text-muted-foreground">{slide.description}</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border px-3 py-2.5">
        <Button type="button" variant="ghost" size="icon" onClick={() => move(-1)} aria-label="Previous feature">
          <ArrowLeft />
        </Button>
        <div className="flex gap-2" role="tablist" aria-label="Feature slides">
          {slides.map((item, index) => (
            <Button
              key={item.title}
              type="button"
              variant="ghost"
              size="icon"
              role="tab"
              aria-selected={active === index}
              aria-label={`Show ${item.title}`}
              onClick={() => setActive(index)}
              className="group h-7 w-7 p-0"
            >
              <span className={`h-2 rounded-full transition-[width,background-color] ${active === index ? "w-7 bg-primary" : "w-2 bg-border group-hover:bg-muted-foreground"}`} />
            </Button>
          ))}
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={() => move(1)} aria-label="Next feature">
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}

function AddPlantScene({ image }: { image: ShowcaseImage }) {
  return (
    <div className="h-full rounded-lg border border-border bg-background p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">My plants</p>
          <p className="font-display text-xl font-semibold">Add a new plant</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground"><Plus className="h-4 w-4" /></span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-[110px_1fr]">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-md bg-primary/10">
          {image ? (
            <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
          ) : (
            <Leaf className="h-14 w-14 text-primary" strokeWidth={1.4} />
          )}
          <span className="absolute bottom-2 left-2 rounded bg-background/90 px-2 py-1 text-[10px] font-medium text-foreground shadow-sm">
            Catalogue match
          </span>
        </div>
        <div className="space-y-3">
          <MockField label="Nickname" value="Milo" />
          <MockField label="Species" value="Monstera deliciosa" />
          <MockField label="Location" value="Living room" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-xs text-success">
        <Check className="h-4 w-4 text-success" /> Ready to start growing
      </div>
    </div>
  );
}

function JournalScene({ image }: { image: ShowcaseImage }) {
  const events = [
    { icon: Flower2, label: "Flowered", time: "Today", tone: "text-accent-foreground bg-accent/20" },
    { icon: Scissors, label: "Pruned", time: "3 days ago", tone: "text-primary bg-primary/10" },
    { icon: Droplets, label: "Watered · 250 ml", time: "6 days ago", tone: "text-primary bg-primary/10" },
  ];
  return (
    <div className="grid h-full gap-3 sm:grid-cols-[0.8fr_1.2fr]">
      <div className="relative overflow-hidden rounded-lg border border-border bg-primary/10">
        {image ? (
          <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
        ) : (
          <Leaf className="absolute -bottom-5 right-1 h-36 w-36 rotate-[-18deg] text-primary/50" strokeWidth={1.1} />
        )}
        <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-md bg-background/90 text-primary shadow-sm">
          <Camera className="h-4 w-4" />
        </span>
        <div className="absolute inset-x-4 bottom-4 rounded-md bg-background/90 p-3 shadow-sm">
          <p className="text-xs text-muted-foreground">Photo journal</p>
          <p className="text-sm font-semibold">A new leaf unfurled</p>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="flex items-center justify-between">
          <p className="font-display font-semibold">Milo’s journal</p>
          <Plus className="h-4 w-4 text-primary" />
        </div>
        <div className="mt-4 space-y-3">
          {events.map(({ icon: Icon, label, time, tone }) => (
            <div key={label} className="flex items-center gap-3">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${tone}`}><Icon className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdvisorScene() {
  return (
    <div className="h-full rounded-lg border border-border bg-background p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground"><Sparkles className="h-5 w-5" /></span>
        <div><p className="font-display font-semibold">AI care advisor</p><p className="text-xs text-muted-foreground">Milo · checked just now</p></div>
      </div>
      <div className="mt-5 rounded-md border-l-4 border-primary bg-primary/5 p-4">
        <p className="text-sm leading-relaxed">Milo looks healthy. The soil is drying gradually, so wait another day before watering.</p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniMetric label="Moisture" value="48%" />
        <MiniMetric label="Light" value="72%" />
        <MiniMetric label="Humidity" value="61%" />
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Check className="h-4 w-4 text-success" /> Rotate the pot toward the morning light</div>
    </div>
  );
}

function AiPipelineScene({ image }: { image: ShowcaseImage }) {
  const plan = [
    { label: "Treat the spotted leaves", detail: "Fungicide spray, weekly for 3 weeks" },
    { label: "Isolate the pot", detail: "Keeps any spread contained" },
    { label: "Recheck in 7 days", detail: "We will remind you, photo in hand" },
  ];
  return (
    <div className="grid h-full gap-3 sm:grid-cols-[0.9fr_1.1fr]">
      <div className="relative overflow-hidden rounded-lg border border-border">
        {image ? (
          <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
        ) : (
          <Leaf className="absolute -bottom-5 right-1 h-36 w-36 rotate-[-18deg] text-primary/50" strokeWidth={1.1} />
        )}
        <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-md bg-background/90 text-primary shadow-sm">
          <ScanSearch className="h-4 w-4" />
        </span>
        <div className="absolute inset-x-3 bottom-3 rounded-md border border-warning/40 bg-background/95 p-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-warning">Disease check</p>
          <p className="mt-0.5 text-sm font-semibold">Leaf spot detected, 92% match</p>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="font-display text-sm font-semibold">Automatic health plan</p>
        </div>
        <div className="mt-3 space-y-3">
          {plan.map((item, index) => (
            <div key={item.label} className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-xs text-success">
          <ShieldCheck className="h-4 w-4" /> Plan adapts as your plant recovers
        </div>
      </div>
    </div>
  );
}

function CommunityScene() {
  return (
    <div className="h-full rounded-lg border border-border bg-background p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><p className="font-display font-semibold">Community feed</p></div>
        <span className="text-xs text-muted-foreground">Nearby growers</span>
      </div>
      <div className="mt-4 rounded-md border border-border p-3">
        <div className="flex items-center gap-2"><span className="h-8 w-8 rounded-full bg-accent/40" /><div><p className="text-xs font-semibold">Lena</p><p className="text-[11px] text-muted-foreground">needs help with Olive</p></div></div>
        <p className="mt-3 text-sm">Any ideas why these leaves are curling?</p>
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-destructive" /> 8</span><span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> 4 replies</span></div>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-md bg-muted p-2">
        <span className="flex-1 px-2 text-xs text-muted-foreground">Share what worked for your plant…</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground"><Send className="h-3.5 w-3.5" /></span>
      </div>
    </div>
  );
}

function MockField({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-border px-3 py-2"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="truncate text-sm font-medium">{value}</p></div>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-muted p-2 text-center"><p className="text-[10px] text-muted-foreground">{label}</p><p className="text-sm font-semibold">{value}</p></div>;
}