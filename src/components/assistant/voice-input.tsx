import { useState, useRef, useCallback } from "react";
import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function encodeWav(pcmChunks: Float32Array[], sampleRate: number): Blob {
  // Downsample to 16 kHz mono for a smaller, model-friendly upload.
  const targetRate = 16000;
  const ratio = sampleRate / targetRate;
  const totalSourceSamples = pcmChunks.reduce((sum, c) => sum + c.length, 0);
  const targetLength = Math.floor(totalSourceSamples / ratio);

  const downsampled = new Float32Array(targetLength);
  let sourceIdx = 0;
  for (const chunk of pcmChunks) {
    for (let i = 0; i < chunk.length; i++) {
      const targetPos = Math.floor((sourceIdx + i) / ratio);
      if (targetPos < targetLength) {
        downsampled[targetPos] = chunk[i];
      }
    }
    sourceIdx += chunk.length;
  }

  const buffer = new ArrayBuffer(44 + downsampled.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + downsampled.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, downsampled.length * 2, true);

  let offset = 44;
  for (let i = 0; i < downsampled.length; i++) {
    const s = Math.max(-1, Math.min(1, downsampled[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

type VoiceInputProps = {
  onRecordingComplete: (blob: Blob) => void;
  disabled?: boolean;
};

export function VoiceInput({ onRecordingComplete, disabled }: VoiceInputProps) {
  const [recording, setRecording] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pcmRef = useRef<Float32Array[]>([]);

  const stopRecording = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    audioCtxRef.current?.close();

    const ctx = audioCtxRef.current;
    const chunks = pcmRef.current;
    if (ctx && chunks.length > 0) {
      const blob = encodeWav(chunks, ctx.sampleRate);
      if (blob.size > 2048) {
        onRecordingComplete(blob);
      }
    }

    setRecording(false);
    pcmRef.current = [];
    audioCtxRef.current = null;
    sourceRef.current = null;
    processorRef.current = null;
    streamRef.current = null;
  }, [onRecordingComplete]);

  const startRecording = useCallback(async () => {
    setPermissionDenied(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      pcmRef.current = [];

      processor.onaudioprocess = (e) => {
        pcmRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };

      source.connect(processor);
      processor.connect(ctx.destination);
      setRecording(true);
    } catch {
      setPermissionDenied(true);
      setRecording(false);
    }
  }, []);

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="icon"
        variant={recording ? "destructive" : "secondary"}
        disabled={disabled}
        onClick={recording ? stopRecording : startRecording}
        aria-label={recording ? "Stop recording" : "Start recording"}
        className={cn("rounded-full transition-colors", recording && "animate-pulse")}
      >
        {recording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </Button>
      {permissionDenied && (
        <span className="text-xs text-destructive">Microphone access denied</span>
      )}
      {recording && (
        <span className="text-xs text-muted-foreground">Recording… click stop to send</span>
      )}
    </div>
  );
}
