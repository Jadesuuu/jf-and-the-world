"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const SIDEBAR_DEFAULT_WIDTH = 380;
export const SIDEBAR_MIN_WIDTH = 320;
const SIDEBAR_MAX_WIDTH = 800;
const STORAGE_KEY = "jf:sidebar-width";
const KEY_STEP = 16;
const KEY_STEP_LARGE = 64;

// Never let the sidebar swallow the map: cap at 60% of the viewport.
export function sidebarMaxWidth(): number {
  if (typeof window === "undefined") return SIDEBAR_MAX_WIDTH;
  return Math.max(
    SIDEBAR_MIN_WIDTH,
    Math.min(SIDEBAR_MAX_WIDTH, Math.round(window.innerWidth * 0.6)),
  );
}

function clamp(w: number): number {
  return Math.min(
    sidebarMaxWidth(),
    Math.max(SIDEBAR_MIN_WIDTH, Math.round(w)),
  );
}

function readStored(): number {
  try {
    const v = Number(localStorage.getItem(STORAGE_KEY));
    return v > 0 ? clamp(v) : SIDEBAR_DEFAULT_WIDTH;
  } catch {
    return SIDEBAR_DEFAULT_WIDTH;
  }
}

function store(w: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(w));
  } catch {
    // Private mode or blocked storage: the width still works for this
    // session, it just is not remembered.
  }
}

// Drag-to-resize for the desktop sidebar.
//
// During a drag the width is written straight to the element so the
// map and panel reflow every frame without a React render; state and
// localStorage are committed once on release. Double-click resets to
// the default with the only animated width change. Arrow keys resize
// from the keyboard so the handle is not pointer-only.
export function useSidebarResize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [dragging, setDragging] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setWidth(readStored());
  }, []);

  // Keep within bounds if the window shrinks under a wide sidebar.
  useEffect(() => {
    const onResize = () => setWidth((w) => clamp(w));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const commit = useCallback((w: number) => {
    const c = clamp(w);
    setWidth(c);
    store(c);
    return c;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      const el = ref.current;
      if (!el) return;
      e.preventDefault();
      const handle = e.currentTarget;
      const startX = e.clientX;
      const startW = el.getBoundingClientRect().width;
      let last = startW;

      handle.setPointerCapture(e.pointerId);
      setDragging(true);
      document.body.classList.add("sidebar-resizing");

      const move = (ev: PointerEvent) => {
        last = clamp(startW + ev.clientX - startX);
        el.style.width = `${last}px`;
      };
      const up = () => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", up);
        handle.removeEventListener("pointercancel", up);
        document.body.classList.remove("sidebar-resizing");
        setDragging(false);
        commit(last);
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up);
      handle.addEventListener("pointercancel", up);
    },
    [commit],
  );

  const onDoubleClick = useCallback(() => {
    if (width === SIDEBAR_DEFAULT_WIDTH) return;
    setAnimating(true);
    commit(SIDEBAR_DEFAULT_WIDTH);
  }, [width, commit]);

  // Under reduced motion no transitionend fires, so time out as well.
  useEffect(() => {
    if (!animating) return;
    const t = window.setTimeout(() => setAnimating(false), 320);
    return () => window.clearTimeout(t);
  }, [animating]);

  const onTransitionEnd = useCallback((e: React.TransitionEvent) => {
    if (e.target === e.currentTarget && e.propertyName === "width") {
      setAnimating(false);
    }
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
      switch (e.key) {
        case "ArrowLeft":
          commit(width - step);
          break;
        case "ArrowRight":
          commit(width + step);
          break;
        case "Home":
          commit(SIDEBAR_MIN_WIDTH);
          break;
        case "End":
          commit(sidebarMaxWidth());
          break;
        default:
          return;
      }
      e.preventDefault();
    },
    [width, commit],
  );

  return {
    ref,
    width,
    dragging,
    animating,
    onTransitionEnd,
    handleProps: { onPointerDown, onDoubleClick, onKeyDown },
  };
}
