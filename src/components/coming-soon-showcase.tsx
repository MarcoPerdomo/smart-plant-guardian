// ============= Full file contents =============
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Cpu, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

type ComingSoonSlide = {
  tag: string;
  icon: typeof Store;
  title: string;
  description: React.ReactNode;
};

const SLIDES: ComingSoonSlide[] = [
  {
    tag: "Coming soon",
    icon: Store,
    title: "Trade with trusted plant owners",
    description: (
      <>
        Swap cuttings, trade plants and buy{" "}
        <span className="font-medium text-surface-inverse-foreground">
          offspring raised by caretakers you can trust
        </span>
        .
      </>
    ),
  },
  {
    tag: "Coming soon",
    icon: Cpu,
    title: "Connect smart sensors",
    description: (
      <>
        Pair Arduino and Raspberry Pi sensors to follow{" "}
        <span className="font-medium text-surface-inverse-foreground">
          moisture, temperature and light
        </span>{" "}
        for every plant, in real time.
      </>
    ),
  },
];

export function ComingSoonShowcase() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (paused) return;
    // Same playback rhythm as the hero showcase: reduced-motion devices rotate
    // more slowly, fade only.
    const delay = reducedMotion ? 8000 : 5200;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % SLIDES.length), delay);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion]);

  const move = (direction: number) => {
    setActive((current) => (current + direction + SLIDES.length) % SLIDES.length);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") move(-1);
    if (event.key === "ArrowRight") move(1);
  };

  const slide = SLIDES[active];
  const Icon = slide.icon;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Coming soon on Sentia"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
      className="overflow-hidden rounded-3xl border border-border bg-surface-inverse shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div key={active} className="animate-fade-in" aria-live="polite">
        <div className="relative p-8 md:p-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--accent)_22%,transparent),transparent_55%)]" />
          <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <span className="inline-block rounded-sm bg-accent px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.25em] text-accent-foreground">
                {slide.tag}
              </span>
              <h3 className="mt-5 font-display text-3xl font-semibold leading-tight text-surface-inverse-foreground md:text-4xl">
                {slide.title}
              </h3>
              <p className="mt-3 leading-relaxed text-surface-inverse-foreground/70">{slide.description}</p>
            </div>
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-accent/60 bg-accent/15 text-accent">
              <Icon className="h-10 w-10" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="Previous coming soon feature"
            className="absolute left-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-surface-inverse-foreground/20 bg-surface-inverse-foreground/10 text-surface-inverse-foreground shadow-md transition hover:bg-surface-inverse-foreground/20 sm:left-3"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label="Next coming soon feature"
            className="absolute right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-surface-inverse-foreground/20 bg-surface-inverse-foreground/10 text-surface-inverse-foreground shadow-md transition hover:bg-surface-inverse-foreground/20 sm:right-3"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between border-t border-surface-inverse-foreground/15 px-3 py-3">
        <span className="text-xs font-medium tabular-nums text-surface-inverse-foreground/70" aria-live="polite">
          {active + 1} / {SLIDES.length}
        </span>
        <div className="flex gap-2.5" role="tablist" aria-label="Coming soon slides">
          {SLIDES.map((item, index) => (
            <Button
              key={item.title}
              type="button"
              variant="ghost"
              size="icon"
              role="tab"
              aria-selected={active === index}
              aria-label={`Show ${item.title}`}
              onClick={() => setActive(index)}
              className="group h-8 w-8 rounded-full p-0"
            >
              <span
                className={`h-2.5 w-2.5 rounded-full transition-[background-color] ${
                  active === index
                    ? "bg-accent"
                    : "bg-surface-inverse-foreground/25 group-hover:bg-surface-inverse-foreground/50"
                }`}
              />
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => move(-1)}
            aria-label="Previous coming soon feature"
            className="h-8 w-8 text-surface-inverse-foreground/80 hover:text-surface-inverse-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => move(1)}
            aria-label="Next coming soon feature"
            className="h-8 w-8 text-surface-inverse-foreground/80 hover:text-surface-inverse-foreground"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
