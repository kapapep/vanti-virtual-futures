import { Mic, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { audioFormatFromMime, blobToDataUrl, MAX_AUDIO_SECONDS } from "@/lib/media-file";

export type RecordedAudio = { dataUrl: string; format: string; seconds: number };

/** Records a voice note capped at 10 seconds and returns it as a data URL. */
export function AudioRecorder({
  value,
  onChange,
}: {
  value: RecordedAudio | null;
  onChange: (audio: RecordedAudio | null) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    timerRef.current = null;
    stopTimeoutRef.current = null;
  }

  useEffect(() => () => {
    clearTimers();
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
  }, []);

  function stop() {
    recorderRef.current?.stop();
  }

  async function start() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Recording isn't supported on this device.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      const chunks: Blob[] = [];
      const startedAt = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        clearTimers();
        setRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        const seconds = Math.min(MAX_AUDIO_SECONDS, (Date.now() - startedAt) / 1000);
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        void blobToDataUrl(blob)
          .then((dataUrl) =>
            onChange({
              dataUrl,
              format: audioFormatFromMime(recorder.mimeType || "audio/webm"),
              seconds: Math.max(1, Math.round(seconds)),
            }),
          )
          .catch(() => toast.error("Couldn't save that recording."));
      };

      recorder.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((v) => Math.min(MAX_AUDIO_SECONDS, v + 1));
      }, 1000);
      stopTimeoutRef.current = setTimeout(stop, MAX_AUDIO_SECONDS * 1000);
    } catch {
      toast.error("Microphone access was blocked.");
    }
  }

  if (value) {
    return (
      <div className="flex items-center gap-2">
        <audio src={value.dataUrl} controls className="h-11 min-w-0 flex-1" aria-label="Voice note preview" />
        <Button variant="ghost" size="icon" aria-label="Remove voice note" onClick={() => onChange(null)}>
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant={recording ? "outline" : "ghost"}
      size="sm"
      className="h-11 gap-1.5"
      aria-label={recording ? "Stop recording" : "Record a voice note, 10 seconds max"}
      onClick={() => (recording ? stop() : void start())}
    >
      {recording ? <Square className="size-4 text-negative" /> : <Mic className="size-4" />}
      <span className="num text-meta">
        {recording ? `${MAX_AUDIO_SECONDS - elapsed}s` : `${MAX_AUDIO_SECONDS}s audio`}
      </span>
    </Button>
  );
}
