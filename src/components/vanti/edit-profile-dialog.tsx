import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { fileToAvatarDataUrl } from "@/lib/image-file";
import { updateOwnProfile } from "@/lib/social";

export function EditProfileDialog({
  userId,
  username,
  displayName: initialDisplayName,
  bio: initialBio = "",
  avatarUrl: initialAvatarUrl,
  hideFollowing: initialHideFollowing = false,
  showBio = true,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  userId: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl: string;
  hideFollowing?: boolean;
  showBio?: boolean;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [hideFollowing, setHideFollowing] = useState(initialHideFollowing);
  const fileInput = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);

  async function pickImage(file: File | undefined) {
    if (!file) return;
    setProcessing(true);
    try {
      setAvatarUrl(await fileToAvatarDataUrl(file));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't use that image.");
    } finally {
      setProcessing(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    setDisplayName(initialDisplayName);
    setBio(initialBio);
    setAvatarUrl(initialAvatarUrl);
    setHideFollowing(initialHideFollowing);
  }, [open, initialDisplayName, initialBio, initialAvatarUrl, initialHideFollowing]);

  const save = useMutation({
    mutationFn: () => updateOwnProfile({ userId, displayName, bio, avatarUrl, hideFollowing }),
    onSuccess: () => {
      toast.success("Profile updated");
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["public-profile", username] });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error("Couldn't save your profile. Try again."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription className="text-meta">
            Change your display name and profile picture.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {avatarUrl.trim() ? (
              <img
                src={avatarUrl}
                alt="Profile picture preview"
                className="size-14 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="grid size-14 place-items-center rounded-full border border-border bg-surface text-sm font-semibold text-muted-foreground">
                {(displayName || username).slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-meta text-muted-foreground">@{username}</p>
              <Button
                type="button"
                variant="outline"
                className="mt-2 min-h-11"
                disabled={processing}
                onClick={() => fileInput.current?.click()}
              >
                <ImagePlus className="size-4" />
                {processing ? "Processing…" : "Choose photo"}
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="sr-only"
                aria-label="Upload a profile picture from your device"
                onChange={(event) => {
                  void pickImage(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              value={displayName}
              maxLength={40}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="avatarUrl">Or paste an image URL</Label>
            <Input
              id="avatarUrl"
              value={avatarUrl.startsWith("data:") ? "" : avatarUrl}
              placeholder="https://…"
              disabled={avatarUrl.startsWith("data:")}
              onChange={(event) => setAvatarUrl(event.target.value)}
            />
            {avatarUrl.startsWith("data:") ? (
              <button
                type="button"
                className="text-meta text-muted-foreground underline"
                onClick={() => setAvatarUrl("")}
              >
                Remove chosen photo
              </button>
            ) : null}
          </div>
          {showBio ? (
            <div className="space-y-1.5">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                rows={3}
                maxLength={240}
                onChange={(event) => setBio(event.target.value)}
              />
            </div>
          ) : null}
          <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface p-3">
            <div className="space-y-0.5">
              <Label htmlFor="hideFollowing" className="text-sm">
                Hide who I follow
              </Label>
              <p className="text-meta text-muted-foreground">
                Your following list stays private. Your followers are always public.
              </p>
            </div>
            <Switch id="hideFollowing" checked={hideFollowing} onCheckedChange={setHideFollowing} />
          </div>
          <p className="text-meta text-muted-foreground">
            Username and balance can't be changed here.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
