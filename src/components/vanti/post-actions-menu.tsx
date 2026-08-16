import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ban, Flag, MoreHorizontal, VolumeX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/hooks/use-vanti-session";
import {
  REPORT_REASONS,
  reportPost,
  setBlocked,
  setMuted,
  type ReportReason,
} from "@/lib/moderation-actions";
import { cn } from "@/lib/utils";

/** Report / block / mute menu attached to every post and reply. */
export function PostActionsMenu({
  postId,
  authorId,
  username,
  className,
}: {
  postId: string;
  authorId: string;
  username: string;
  className?: string;
}) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const isOwn = user?.id === authorId;

  function refreshFeeds() {
    void queryClient.invalidateQueries({ queryKey: ["hidden-authors"] });
    void queryClient.invalidateQueries({ queryKey: ["feed"] });
    void queryClient.invalidateQueries({ queryKey: ["market-posts"] });
    void queryClient.invalidateQueries({ queryKey: ["post-replies"] });
    void queryClient.invalidateQueries({ queryKey: ["user-posts"] });
    void queryClient.invalidateQueries({ queryKey: ["pool-posts"] });
  }

  const report = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("Sign in to report posts.");
      return reportPost({ reporterId: user.id, postId, reason, details });
    },
    onSuccess: () => {
      setReportOpen(false);
      setDetails("");
      toast.success("Report sent. Thanks for keeping Vanti clean.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const block = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("Sign in to block people.");
      return setBlocked({ viewerId: user.id, userId: authorId, blocked: true });
    },
    onSuccess: () => {
      refreshFeeds();
      toast.success(`Blocked @${username}. Their posts are hidden.`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const mute = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("Sign in to mute people.");
      return setMuted({ viewerId: user.id, userId: authorId, muted: true });
    },
    onSuccess: () => {
      refreshFeeds();
      toast.success(`Muted @${username}.`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`More options for this post by @${username}`}
            className={cn(
              "rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground",
              className,
            )}
          >
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem className="text-negative" onSelect={() => setReportOpen(true)}>
            <Flag className="size-4" /> Report post
          </DropdownMenuItem>
          {isOwn ? null : (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => mute.mutate()}>
                <VolumeX className="size-4" /> Mute @{username}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-negative" onSelect={() => setBlockOpen(true)}>
                <Ban className="size-4" /> Block @{username}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-left text-base">Report this post</DialogTitle>
            <DialogDescription className="text-left text-meta">
              Tell us what's wrong. Reports are reviewed by the Vanti team and stay anonymous.
            </DialogDescription>
          </DialogHeader>
          <RadioGroup
            value={reason}
            onValueChange={(value) => setReason(value as ReportReason)}
            className="gap-2"
          >
            {REPORT_REASONS.map((item) => (
              <div key={item.value} className="flex items-center gap-3">
                <RadioGroupItem value={item.value} id={`post-reason-${postId}-${item.value}`} />
                <Label
                  htmlFor={`post-reason-${postId}-${item.value}`}
                  className="text-sm font-medium"
                >
                  {item.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
          <Textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Add details (optional)"
            maxLength={500}
            className="min-h-20"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => report.mutate()} disabled={report.isPending}>
              {report.isPending ? "Sending…" : "Submit report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={blockOpen} onOpenChange={setBlockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block @{username}?</AlertDialogTitle>
            <AlertDialogDescription>
              Their posts and replies disappear from your feeds right away. You can unblock them
              from their profile any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => block.mutate()}>Block</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
