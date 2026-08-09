import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { updateOwnProfile } from "@/lib/social";

export function EditProfileDialog({
  userId,
  username,
  displayName: initialDisplayName,
  bio: initialBio = "",
  avatarUrl: initialAvatarUrl,
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

  useEffect(() => {
    if (!open) return;
    setDisplayName(initialDisplayName);
    setBio(initialBio);
    setAvatarUrl(initialAvatarUrl);
  }, [open, initialDisplayName, initialBio, initialAvatarUrl]);

  const save = useMutation({
    mutationFn: () => updateOwnProfile({ userId, displayName, bio, avatarUrl }),
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
            <p className="text-meta text-muted-foreground">@{username}</p>
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
            <Label htmlFor="avatarUrl">Profile picture URL</Label>
            <Input
              id="avatarUrl"
              value={avatarUrl}
              placeholder="https://…"
              onChange={(event) => setAvatarUrl(event.target.value)}
            />
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
