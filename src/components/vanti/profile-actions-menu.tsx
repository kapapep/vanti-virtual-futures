import { Ban, Flag, MoreHorizontal, Share2 } from "lucide-react";
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

const REASONS = [
  { value: "spam", label: "Spam or scam" },
  { value: "manipulation", label: "Market manipulation" },
  { value: "harassment", label: "Harassment or hate" },
  { value: "impersonation", label: "Impersonation" },
  { value: "other", label: "Something else" },
] as const;

/** Overflow menu shown on every profile: share, report, block. */
export function ProfileActionsMenu({ username, isOwn }: { username: string; isOwn: boolean }) {
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [reason, setReason] = useState<string>("spam");
  const [details, setDetails] = useState("");

  async function share() {
    const url = `${window.location.origin}/u/${username}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `@${username} on Vanti`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied.");
    } catch {
      /* user dismissed the share sheet */
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 text-muted-foreground"
            aria-label={`More options for @${username}`}
          >
            <MoreHorizontal className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => void share()}>
            <Share2 className="size-4" /> Share profile
          </DropdownMenuItem>
          {isOwn ? null : (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-negative" onSelect={() => setReportOpen(true)}>
                <Flag className="size-4" /> Report
              </DropdownMenuItem>
              <DropdownMenuItem className="text-negative" onSelect={() => setBlockOpen(true)}>
                <Ban className="size-4" /> Block
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-left text-base">Report @{username}</DialogTitle>
            <DialogDescription className="text-left text-meta">
              Tell us what's wrong. Reports are reviewed by the Vanti team and stay anonymous.
            </DialogDescription>
          </DialogHeader>
          <RadioGroup value={reason} onValueChange={setReason} className="gap-2">
            {REASONS.map((item) => (
              <div key={item.value} className="flex items-center gap-3">
                <RadioGroupItem value={item.value} id={`reason-${item.value}`} />
                <Label htmlFor={`reason-${item.value}`} className="text-sm font-medium">
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
            <Button
              onClick={() => {
                setReportOpen(false);
                setDetails("");
                toast.success("Report sent. Thanks for keeping Vanti clean.");
              }}
            >
              Submit report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={blockOpen} onOpenChange={setBlockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block @{username}?</AlertDialogTitle>
            <AlertDialogDescription>
              They won't show up in your feed, and you won't see their posts or replies. You can
              unblock them any time from this menu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => toast.success(`Blocked @${username}.`)}>
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
