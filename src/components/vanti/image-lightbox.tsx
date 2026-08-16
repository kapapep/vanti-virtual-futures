import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

type Point = { x: number; y: number };

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Full-screen image viewer: pinch/double-tap zoom, drag to pan when zoomed,
 * horizontal swipe between images and a downward swipe (or the close button)
 * to dismiss. Rendered in a portal so it sits above the header and tab bar.
 */
export function ImageLightbox({
  images,
  index,
  alt,
  onClose,
}: {
  images: string[];
  index: number;
  alt?: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [current, setCurrent] = useState(index);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [drag, setDrag] = useState<Point>({ x: 0, y: 0 });
  const [dismissing, setDismissing] = useState(false);

  const surfaceRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{
    startZoom: number;
    startOffset: Point;
    startDistance: number;
    startCenter: Point;
    lastTap: number;
    mode: "none" | "pan" | "pinch";
  }>({
    startZoom: 1,
    startOffset: { x: 0, y: 0 },
    startDistance: 0,
    startCenter: { x: 0, y: 0 },
    lastTap: 0,
    mode: "none",
  });

  useLayoutEffect(() => setMounted(true), []);

  // Lock background scrolling while the viewer is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const close = useCallback(() => {
    setDismissing(true);
    onClose();
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setCurrent((c) => Math.min(images.length - 1, c + 1));
      if (e.key === "ArrowLeft") setCurrent((c) => Math.max(0, c - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, images.length]);

  const resetView = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setDrag({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    resetView();
  }, [current, resetView]);

  /** Zoom about a viewport point so the pixel under the fingers stays put. */
  const zoomAt = useCallback(
    (nextZoom: number, point: Point, base: { zoom: number; offset: Point }) => {
      const z = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
      const k = z / base.zoom;
      setZoom(z);
      setOffset(
        z === MIN_ZOOM
          ? { x: 0, y: 0 }
          : {
              x: point.x - (point.x - base.offset.x) * k,
              y: point.y - (point.y - base.offset.y) * k,
            },
      );
    },
    [],
  );

  // Trackpad / wheel zoom needs a non-passive listener to block page scroll.
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const rect = el.getBoundingClientRect();
      const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      setZoom((z) => {
        const next = clamp(z * Math.exp(-dy * 0.0018), MIN_ZOOM, MAX_ZOOM);
        const k = next / z;
        setOffset((o) =>
          next === MIN_ZOOM
            ? { x: 0, y: 0 }
            : { x: point.x - (point.x - o.x) * k, y: point.y - (point.y - o.y) * k },
        );
        return next;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const localPoint = (e: React.PointerEvent): Point => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, localPoint(e));
    const pts = [...pointers.current.values()];

    if (pts.length === 2) {
      const [a, b] = pts as [Point, Point];
      gesture.current = {
        ...gesture.current,
        mode: "pinch",
        startZoom: zoom,
        startOffset: offset,
        startDistance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        startCenter: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
      return;
    }

    // Double tap toggles between fit and 2.5x at the tapped point.
    const now = Date.now();
    if (now - gesture.current.lastTap < 280) {
      const point = pts[0] ?? { x: 0, y: 0 };
      if (zoom > 1) resetView();
      else zoomAt(2.5, point, { zoom: 1, offset: { x: 0, y: 0 } });
      gesture.current.lastTap = 0;
      return;
    }
    gesture.current.lastTap = now;
    gesture.current = {
      ...gesture.current,
      mode: "pan",
      startZoom: zoom,
      startOffset: offset,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, localPoint(e));
    const pts = [...pointers.current.values()];

    if (pts.length >= 2 && gesture.current.mode === "pinch") {
      const [a, b] = pts as [Point, Point];
      const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const g = gesture.current;
      zoomAt((distance / g.startDistance) * g.startZoom, g.startCenter, {
        zoom: g.startZoom,
        offset: g.startOffset,
      });
      return;
    }

    if (gesture.current.mode !== "pan" || pts.length !== 1) return;
    const start = gesture.current;

    if (zoom > 1) {
      // Panning the zoomed image.
      setOffset({
        x: start.startOffset.x + (e.movementX || 0),
        y: start.startOffset.y + (e.movementY || 0),
      });
      setDrag((d) => ({
        x: d.x + (e.movementX || 0),
        y: d.y + (e.movementY || 0),
      }));
      return;
    }
    // At fit scale the drag becomes a swipe: sideways pages, down dismisses.
    setDrag((d) => ({ x: d.x + (e.movementX || 0), y: d.y + (e.movementY || 0) }));
  };

  const endGesture = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const remaining = pointers.current.size;

    if (remaining === 0) {
      if (zoom <= 1) {
        const { x, y } = drag;
        if (y > 110 && Math.abs(y) > Math.abs(x)) {
          close();
          return;
        }
        if (Math.abs(x) > 70 && Math.abs(x) > Math.abs(y)) {
          setCurrent((c) =>
            x < 0 ? Math.min(images.length - 1, c + 1) : Math.max(0, c - 1),
          );
        }
        setDrag({ x: 0, y: 0 });
      } else {
        setDrag({ x: 0, y: 0 });
      }
      gesture.current.mode = "none";
      return;
    }
    // One finger left after a pinch: restart a pan from the current state.
    gesture.current = {
      ...gesture.current,
      mode: "pan",
      startZoom: zoom,
      startOffset: offset,
    };
  };

  if (!mounted) return null;

  const src = images[current];
  const fitDrag = zoom <= 1 ? drag : { x: 0, y: 0 };
  const backdropOpacity =
    zoom <= 1 ? clamp(1 - Math.max(0, fitDrag.y) / 420, 0.5, 1) : 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      style={{
        background: `rgba(0,0,0,${dismissing ? 0 : backdropOpacity})`,
        transition: "background 120ms ease-out",
      }}
    >
      <div
        ref={surfaceRef}
        className="absolute inset-0 overflow-hidden"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
      >
        {src ? (
          <img
            key={src}
            src={src}
            alt={alt ?? "Full screen image"}
            draggable={false}
            className="absolute left-1/2 top-1/2 max-h-full max-w-full select-none object-contain"
            style={{
              transform: `translate(-50%, -50%) translate(${offset.x + fitDrag.x}px, ${offset.y + fitDrag.y}px) scale(${zoom})`,
              transition: pointers.current.size === 0 ? "transform 140ms ease-out" : "none",
              maxHeight: "100dvh",
            }}
          />
        ) : null}
      </div>

      <button
        type="button"
        onClick={close}
        aria-label="Close image viewer"
        className="absolute right-3 grid size-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
        style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
      >
        <X className="size-5" />
      </button>

      {images.length > 1 ? (
        <div
          className="pointer-events-none absolute inset-x-0 flex items-center justify-center gap-1.5"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 20px)" }}
        >
          {images.map((image, i) => (
            <span
              key={image}
              className="size-1.5 rounded-full"
              style={{ background: i === current ? "#FFFFFF" : "rgba(255,255,255,0.35)" }}
            />
          ))}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
