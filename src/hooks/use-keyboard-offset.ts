import { useEffect, useRef, useState } from "react";

/**
 * Height in px that the on-screen keyboard currently covers. Uses the
 * VisualViewport API on the web and the Capacitor Keyboard plugin natively
 * (iOS reports the accessory-bar height only through the plugin).
 */
export function useKeyboardOffset() {
  const [offset, setOffset] = useState(0);
  const nativeHeight = useRef(0);

  useEffect(() => {
    const viewport = window.visualViewport;

    const sync = () => {
      const viewportOffset = viewport
        ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
        : 0;
      setOffset(Math.max(viewportOffset, nativeHeight.current));
    };

    viewport?.addEventListener("resize", sync);
    viewport?.addEventListener("scroll", sync);
    sync();

    type Handle = { remove: () => Promise<void> };
    const handles: Handle[] = [];
    let disposed = false;

    void (async () => {
      const [{ Capacitor }, { Keyboard }] = await Promise.all([
        import("@capacitor/core"),
        import("@capacitor/keyboard"),
      ]);
      if (!Capacitor.isNativePlatform()) return;
      const show = await Keyboard.addListener("keyboardWillShow", (event) => {
        nativeHeight.current = Math.max(0, event.keyboardHeight);
        sync();
      });
      const hide = await Keyboard.addListener("keyboardWillHide", () => {
        nativeHeight.current = 0;
        sync();
      });
      if (disposed) await Promise.all([show.remove(), hide.remove()]);
      else handles.push(show, hide);
    })();

    return () => {
      disposed = true;
      viewport?.removeEventListener("resize", sync);
      viewport?.removeEventListener("scroll", sync);
      for (const handle of handles) void handle.remove();
    };
  }, []);

  return offset;
}
