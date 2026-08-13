import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useProfile, useSession } from "@/hooks/use-vanti-session";
import { supabase } from "@/integrations/supabase/client";
import { AudioRecorder, type RecordedAudio } from "@/components/vanti/audio-recorder";
import { formatCents } from "@/lib/format";
import { marketsQuery } from "@/lib/markets";
import { fileToPostImageDataUrl } from "@/lib/media-file";
import { lightHaptic } from "@/lib/haptics";
import { moderatePostMedia } from "@/lib/moderation.functions";
import { createPost } from "@/lib/posts";
import { cn } from "@/lib/utils";

const MAX_LENGTH = 500;

function MarketPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string | null;
  onChange: (marketId: string | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const markets = useQuery(marketsQuery);
  const list = markets.data ?? [];
  const selected = list.find((m) => m.id === value);
  const filtered = term.trim()
    ? list.filter((m) => m.question.toLowerCase().includes(term.trim().toLowerCase())).slice(0, 30)
    : list.slice(0, 30);

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="max-w-full" disabled={disabled}>
            <span className="truncate">
              {selected ? selected.question : "Attach a market"}
            </span>
            <ChevronDown className="size-3.5 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-2">
          <Input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search markets"
            className="h-9 text-sm"
            aria-label="Search markets to attach"
          />
          <ul className="mt-2 max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-2 py-3 text-meta text-muted-foreground">No markets match.</li>
            ) : (
              filtered.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(m.id);
                      setOpen(false);
                    }}
                    className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-secondary"
                  >
                    <span className="line-clamp-2 flex-1">{m.question}</span>
                    <span className="num shrink-0 text-meta text-positive">
                      {formatCents(m.yesPrice)}
                    </span>
                    {m.id === value ? <Check className="size-3.5 text-accent-solid" /> : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </PopoverContent>
      </Popover>
      {selected ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Remove market"
          disabled={disabled}
          onClick={() => onChange(null)}
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}

/** Composer for a new post, a market-attached post, or a reply. */
export function PostComposer({
  parentId,
  marketId,
  poolId,
  lockedMarket = false,
  placeholder = "What's your read on the market?",
  compact = false,
  onPosted,
}: {
  parentId?: string;
  marketId?: string | null;
  poolId?: string | null;
  lockedMarket?: boolean;
  placeholder?: string;
  compact?: boolean;
  onPosted?: () => void;
}) {
  const { user } = useSession();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [attached, setAttached] = useState<string | null>(marketId ?? null);
  const [image, setImage] = useState<string | null>(null);
  const [audio, setAudio] = useState<RecordedAudio | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const suspendedUntil = profile?.suspended_until ?? null;
  const suspended = Boolean(suspendedUntil && new Date(suspendedUntil).getTime() > Date.now());

  const remaining = MAX_LENGTH - body.length;

  async function pickImage(file: File | undefined) {
    if (!file) return;
    setPreparing(true);
    try {
      setImage(await fileToPostImageDataUrl(file));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't use that image.");
    } finally {
      setPreparing(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const submit = useMutation({
    mutationFn: async () => {
      setError(null);
      if (!user) throw new Error("Sign in to post.");
      if (suspended) throw new Error("Your account is suspended. You can't post right now.");

      if (image || audio) {
        const verdict = await moderatePostMedia({
          data: {
            body,
            ...(image ? { imageDataUrl: image } : {}),
            ...(audio ? { audioDataUrl: audio.dataUrl, audioFormat: audio.format } : {}),
          },
        });
        if (verdict.explicit) {
          await supabase.rpc("record_explicit_violation", { p_reason: "explicit_content" });
          void queryClient.invalidateQueries({ queryKey: ["profile"] });
          setImage(null);
          setAudio(null);
          throw new Error(
            "That media breaks the explicit-content rule. Your account is suspended for 7 days.",
          );
        }
      }

      await createPost({
        userId: user.id,
        body,
        marketId: lockedMarket ? (marketId ?? null) : attached,
        poolId: poolId ?? null,
        parentId: parentId ?? null,
        imageUrl: image,
        audioUrl: audio?.dataUrl ?? null,
      });
    },
    onSuccess: () => {
      setBody("");
      setImage(null);
      setAudio(null);
      if (!lockedMarket) setAttached(null);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["market-posts"] });
      void queryClient.invalidateQueries({ queryKey: ["pool-posts"] });
      void queryClient.invalidateQueries({ queryKey: ["post-replies"] });
      void queryClient.invalidateQueries({ queryKey: ["user-posts"] });
      onPosted?.();
      toast.success(parentId ? "Reply posted" : "Posted", {
        position: "bottom-center",
        className: "mb-20 lg:mb-0",
      });
      void lightHaptic();
    },
    onError: (err: Error) => setError(err.message || "Couldn't post — try again"),
  });

  const hasMedia = Boolean(image || audio);
  const busy = submit.isPending || preparing;
  const disabled =
    busy ||
    suspended ||
    (body.trim().length === 0 && !hasMedia) ||
    remaining < 0;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-3",
        compact && "border-0 bg-transparent p-0",
      )}
    >
      {suspended ? (
        <p className="mb-2 rounded-md border border-border bg-surface px-3 py-2 text-meta text-negative">
          Posting is suspended until{" "}
          <span className="num">{new Date(suspendedUntil!).toLocaleDateString()}</span> for breaking
          the explicit-content rule.
        </p>
      ) : null}
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, MAX_LENGTH + 40))}
        placeholder={placeholder}
        rows={compact ? 2 : 3}
        className="resize-none text-sm"
        disabled={suspended || submit.isPending}
        aria-label={parentId ? "Write a reply" : "Write a post"}
      />

      {image ? (
        <div className="relative mt-2">
          <img
            src={image}
            alt="Attached image preview"
            className="max-h-64 w-full rounded-lg border border-border object-cover"
          />
          <Button
            variant="secondary"
            size="icon"
            aria-label="Remove image"
            className="absolute right-2 top-2"
            disabled={submit.isPending}
            onClick={() => setImage(null)}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : null}

      {audio ? (
        <div className="mt-2">
          <AudioRecorder value={audio} onChange={setAudio} />
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {lockedMarket || parentId ? null : (
            <MarketPicker value={attached} onChange={setAttached} disabled={submit.isPending} />
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void pickImage(e.target.files?.[0])}
          />
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label="Add an image"
            disabled={suspended || busy}
            onClick={() => fileInput.current?.click()}
          >
            <ImagePlus className="size-4" />
          </Button>
          {audio ? null : <AudioRecorder value={null} onChange={setAudio} />}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span
            className={cn(
              "num text-meta",
              remaining < 0 ? "text-negative" : "text-muted-foreground",
            )}
          >
            {remaining}
          </span>
          <Button size="sm" disabled={disabled} onClick={() => submit.mutate()}>
            {submit.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-label="Posting" />
            ) : parentId ? (
              "Reply"
            ) : (
              "Post"
            )}
          </Button>
        </div>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-right text-meta text-negative">
          {error}
        </p>
      ) : null}
      {!user ? (
        <p className="mt-2 text-meta text-muted-foreground">Sign in to join the conversation.</p>
      ) : (
        <p className="mt-2 text-meta text-muted-foreground">
          Posting as @{profile?.username ?? "…"} · Images and 10s voice notes are screened for
          explicit content.
        </p>
      )}
    </div>
  );
}
