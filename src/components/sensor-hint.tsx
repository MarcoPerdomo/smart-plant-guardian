import { Info } from "lucide-react";
import {
  Tooltip as UITooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

export const SENSOR_HINTS = {
  moisture:
    "Soil water content from the capacitive probe, 0-100%. The target range comes from the plant's species care profile.",
  temp: "Ambient air temperature in °C measured next to the plant.",
  light:
    "Relative brightness, 0-100%. 100% is direct sunlight and 0% is complete darkness — this is not a nominal lux value.",
  humidity: "Relative air humidity around the plant, 0-100%.",
} as const;

export function SensorHint({ text, className = "" }: { text: string; className?: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <UITooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={text}
            onClick={(e) => e.preventDefault()}
            className={`text-muted-foreground/70 hover:text-foreground focus-visible:outline-none ${className}`}
          >
            <Info className="w-3 h-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-56 text-[11px] leading-relaxed normal-case tracking-normal">
          {text}
        </TooltipContent>
      </UITooltip>
    </TooltipProvider>
  );
}
