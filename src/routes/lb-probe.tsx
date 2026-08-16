import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ImageLightbox } from "@/components/vanti/image-lightbox";

export const Route = createFileRoute("/lb-probe")({ component: P });
const imgs = ["/apple-touch-icon.png", "/apple-touch-icon.png"];

function P() {
  const [open, setOpen] = useState(false);
  return (
    <div className="p-4">
      <button type="button" onClick={() => setOpen(true)} aria-label="open">open</button>
      {open ? <ImageLightbox images={imgs} index={0} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}
