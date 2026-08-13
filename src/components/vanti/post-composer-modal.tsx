import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, ImagePlus, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AudioRecorder, type RecordedAudio } from "@/components/vanti/audio-recorder";
import { useProfile, useSession } from "@/hooks/use-vanti-session";
import { supabase } from "@/integrations/supabase/client";
import { formatCents } from "@/lib/format";
import { lightHaptic } from "@/lib/haptics";
import { marketsQuery } from "@/lib/markets";
import { fileToPostImageDataUrl } from "@/lib/media-file";
import { moderatePostMedia } from "@/lib/moderation.functions";
import { createPost } from "@/lib/posts";
import { cn } from "@/lib/utils";

const MAX_LENGTH = 500;

function MarketPill({
  value,
  onChange,
  disabled,
}: {
  value: string | null;
  onChange: (marketId: string | null) => void;
  disabled: boolean;
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-8 max-w-[12rem] rounded-full px-3 text-meta"
        >
          <span className="truncate">{selected ? selected.question : "Attach a market"}</span>
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
  );
}

/** 20px ring that fills with the character count and warns near/over the limit. */
function CountRing({ used }: { used: number }) {
  const remaining = MAX_LENGTH - used;
  const pct = Math.min(1, used / MAX_LENGTH);
  const r = 8;
  const c = 2 * Math.PI * r;
  const tone =
    remaining < 0 ? "text-negative" : remaining <= 50 ? "text-warning" : "text-accent-solid";

  return (
    <div className="flex items-center gap-1.5" role="status" aria-label={`${remaining} characters left`}>
      {remaining <= 50 ? (
        <span className={cn("num text-meta", remaining < 0 ? "text-negative" : "text-warning")}>
          {remaining}
        </span>
      ) : null}
      <svg width="20" height="20" viewBox="0 0 20 20" className={tone} aria-hidden="true">
        <circle cx="10" cy="10" r={r} fill="none" strokeWidth="2" className="stroke-border" />
        <circle
          cx="10"
          cy="10"
          r={r}
          fill="none"
          strokeWidth="2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform="rotate(-90 10 10)"
        />
      </svg>
    </div>
  );
}

/** Full-screen Twitter-style composer for a new post. */
export function PostComposerModal({ onClose }: { onClose: () => void }) {
  const { user } = useSession();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [attached, setAttached] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [audio, setAudio] = useState<RecordedAudio | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const markets = useQuery(marketsQuery);
  const attachedMarket = (markets.data ?? []).find((m) => m.id === attached);

  const suspendedUntil = profile?.suspended_until ?? null;
  const suspended = Boolean(suspendedUntil && new Date(suspendedUntil).getTime() > Date.now());

  useEffect(() => {
    textarea.current?.focus();
  }, []);

  useEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [body]);

  async function pickImage(file: File | undefined) {
    if (!file) return;
    setPreparing(true);
    try {
      setImage(await fileToPostImageDataUrl(file));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't use that image.");
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
        marketId: attached,
        poolId: null,
        parentId: null,
        imageUrl: image,
        audioUrl: audio?.dataUrl ?? null,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["market-posts"] });
      void queryClient.invalidateQueries({ queryKey: ["user-posts"] });
      onClose();
      toast.success("Posted", { position: "bottom-center", className: "mb-20 lg:mb-0" });
      void lightHaptic();
    },
    onError: (err: Error) => setError(err.message || "Couldn't post — try again"),
  });

  const hasMedia = Boolean(image || audio);
  const busy = submit.isPending || preparing;
  const remaining = MAX_LENGTH - body.length;
  const canPost =
    !busy && !suspended && (body.trim().length > 0 || hasMedia) && remaining >= 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          disabled={submit.isPending}
          className="min-h-11 text-sm text-foreground disabled:opacity-50"
        >
          Cancel
        </button>
        <Button
          size="sm"
          className="rounded-full px-5"
          disabled={!canPost}
          onClick={() => submit.mutate()}
        >
          {submit.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-label="Posting" />
          ) : (
            "Post"
          )}
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="flex gap-3">
          <Avatar className="size-10 shrink-0 border border-border">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile.username} />
            ) : null}
            <AvatarFallback className="bg-secondary text-xs font-medium">
              {(profile?.display_name ?? profile?.username ?? "V").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <textarea
              ref={textarea}
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, MAX_LENGTH + 40))}
              placeholder="What's your read on the market?"
              rows={1}
              disabled={suspended || submit.isPending}
              aria-label="Write a post"
              className="w-full resize-none border-0 bg-transparent p-0 text-[18px] leading-snug text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
            />
            <p className="mt-2 text-[12px] text-muted-foreground">
              Posting as @{profile?.username ?? "…"} · Images and 10s voice notes are screened for
              explicit content.
            </p>

            {attachedMarket ? (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-surface p-3">
                <span className="line-clamp-2 flex-1 text-sm text-foreground">
                  {attachedMarket.question}
                </span>
                <span className="num shrink-0 text-meta text-positive">
                  {formatCents(attachedMarket.yesPrice)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove market"
                  disabled={submit.isPending}
                  onClick={() => setAttached(null)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : null}

            {image ? (
              <div className="relative mt-3">
                <img
                  src={image}
                  alt="Attached image preview"
                  className="max-h-72 w-full rounded-lg border border-border object-cover"
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
              <div className="mt-3 rounded-lg border border-border bg-surface p-2">
                <AudioRecorder value={audio} onChange={setAudio} />
              </div>
            ) : null}

            {suspended ? (
              <p className="mt-3 rounded-md border border-border bg-surface px-3 py-2 text-meta text-negative">
                Posting is suspended until{" "}
                <span className="num">{new Date(suspendedUntil!).toLocaleDateString()}</span> for
                breaking the explicit-content rule.
              </p>
            ) : null}

            {error ? (
              <p role="alert" className="mt-3 text-meta text-negative">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-5 border-t border-border px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <MarketPill value={attached} onChange={setAttached} disabled={submit.isPending} />
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void pickImage(e.target.files?.[0])}
        />
        <button
          type="button"
          aria-label="Add an image"
          disabled={suspended || busy}
          onClick={() => fileInput.current?.click()}
          className="grid size-11 place-items-center text-accent-solid disabled:opacity-50"
        >
          <ImagePlus style={{ width: 22, height: 22 }} />
        </button>
        {audio ? null : (
          <AudioRecorder value={null} onChange={setAudio} />
        )}
        <div className="ml-auto">
          <CountRing used={body.length} />
        </div>
      </div>
    </div>
  );
}
