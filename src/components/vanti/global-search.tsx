import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { formatProbability } from "@/lib/format";
import { searchQuery } from "@/lib/posts";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 250;

function Heading({ children }: { children: string }) {
  return (
    <p className="px-2 pb-1 pt-2 text-meta font-semibold uppercase text-muted-foreground">
      {children}
    </p>
  );
}

/** Debounced global search across market questions and trader usernames. */
export function GlobalSearch({
  autoFocus = false,
  onNavigate,
  className,
}: {
  autoFocus?: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const results = useQuery(searchQuery(debounced));
  const markets = results.data?.markets ?? [];
  const users = results.data?.users ?? [];
  const active = open && debounced.trim().length >= 2;
  const empty = results.isSuccess && markets.length === 0 && users.length === 0;

  function close() {
    setOpen(false);
    onNavigate?.();
  }

  return (
    <div ref={containerRef} className={cn("relative min-w-0", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        autoFocus={autoFocus}
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search markets and traders"
        className="h-9 bg-surface pl-9 text-sm"
        aria-label="Search markets and traders"
      />

      {active ? (
        <div className="absolute right-0 top-11 z-40 w-[max(100%,20rem)] max-w-[calc(100vw-2rem)] max-h-80 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md">
          {results.isPending ? (
            <p className="px-2 py-3 text-meta text-muted-foreground">Searching…</p>
          ) : empty ? (
            <p className="px-2 py-3 text-meta text-muted-foreground">No matches.</p>
          ) : (
            <>
              {markets.length > 0 ? (
                <>
                  <Heading>Markets</Heading>
                  <ul>
                    {markets.map((market) => (
                      <li key={market.id}>
                        <Link
                          to="/market/$marketId"
                          params={{ marketId: market.id }}
                          onClick={close}
                          className="flex items-start gap-2 rounded-md px-2 py-2 text-sm hover:bg-secondary"
                        >
                          <span className="line-clamp-2 flex-1">{market.question}</span>
                          <span className="num shrink-0 text-meta text-positive">
                            {formatProbability(market.yesPrice)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {users.length > 0 ? (
                <>
                  <Heading>Users</Heading>
                  <ul>
                    {users.map((user) => (
                      <li key={user.id}>
                        <Link
                          to="/u/$username"
                          params={{ username: user.username }}
                          onClick={close}
                          className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-secondary"
                        >
                          <Avatar className="size-6 border border-border">
                            {user.avatarUrl ? (
                              <AvatarImage src={user.avatarUrl} alt={user.username} />
                            ) : null}
                            <AvatarFallback className="bg-secondary text-[10px] font-medium">
                              {(user.displayName ?? user.username).slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">
                            {user.displayName ?? user.username}
                            <span className="text-muted-foreground"> @{user.username}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
