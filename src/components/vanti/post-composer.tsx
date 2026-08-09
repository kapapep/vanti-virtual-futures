import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useProfile, useSession } from "@/hooks/use-vanti-session";
import { formatCents } from "@/lib/format";
import { marketsQuery } from "@/lib/markets";
import { createPost } from "@/lib/posts";
import { cn } from "@/lib/utils";

const MAX_LENGTH = 500;

function MarketPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (marketId: string | null) => void;
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
          <Button variant="outline" size="sm" className="max-w-full">
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
        <Button variant="ghost" size="icon" aria-label="Remove market" onClick={() => onChange(null)}>
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
  lockedMarket = false,
  placeholder = "What's your read on the market?",
  compact = false,
  onPosted,
}: {
  parentId?: string;
  marketId?: string | null;
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

  const remaining = MAX_LENGTH - body.length;

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to post.");
      await createPost({
        userId: user.id,
        body,
        marketId: lockedMarket ? (marketId ?? null) : attached,
        parentId: parentId ?? null,
      });
    },
    onSuccess: () => {
      setBody("");
      if (!lockedMarket) setAttached(null);
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["market-posts"] });
      void queryClient.invalidateQueries({ queryKey: ["post-replies"] });
      void queryClient.invalidateQueries({ queryKey: ["user-posts"] });
      toast.success(parentId ? "Reply posted" : "Posted");
      onPosted?.();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const disabled = submit.isPending || body.trim().length === 0 || remaining < 0;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-3",
        compact && "border-0 bg-transparent p-0",
      )}
    >
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, MAX_LENGTH + 40))}
        placeholder={placeholder}
        rows={compact ? 2 : 3}
        className="resize-none text-sm"
        aria-label={parentId ? "Write a reply" : "Write a post"}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        {lockedMarket || parentId ? <span /> : <MarketPicker value={attached} onChange={setAttached} />}
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
            {submit.isPending ? "Posting…" : parentId ? "Reply" : "Post"}
          </Button>
        </div>
      </div>
      {!user ? (
        <p className="mt-2 text-meta text-muted-foreground">Sign in to join the conversation.</p>
      ) : (
        <p className="mt-2 text-meta text-muted-foreground">
          Posting as @{profile?.username ?? "…"}
        </p>
      )}
    </div>
  );
}
