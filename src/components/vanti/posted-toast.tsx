import { Check } from "lucide-react";
import { toast } from "sonner";

interface PostedToastProps {
  id: string | number;
  onView?: (() => void) | undefined;
}

export function PostedToast({ id, onView }: PostedToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto mx-4 flex w-max max-w-[min(340px,calc(100vw-32px))] items-center gap-3 rounded-[12px] border border-[rgba(255,255,255,0.10)] bg-[#1C1C1F] px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
    >
      <Check
        className="size-[18px] shrink-0 text-[#34D399]"
        strokeWidth={2.5}
        aria-hidden="true"
      />
      <span className="flex-1 text-[15px] font-medium text-foreground">Posted</span>
      <button
        type="button"
        onClick={() => {
          onView?.();
          toast.dismiss(id);
        }}
        className="text-[15px] font-medium text-foreground underline underline-offset-4 hover:text-accent-solid"
      >
        View
      </button>
    </div>
  );
}

export function showPostedToast({ onView }: { onView?: (() => void) | undefined } = {}) {
  return toast.custom(
    (id) => <PostedToast id={id} onView={onView} />,
    {
      duration: 2200,
      className:
        "posted-toast !bg-transparent !border-0 !shadow-none !p-0 !m-0",
    },
  );
}
