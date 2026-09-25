"use client";

import { useLayoutEffect, useRef, useState } from "react";

export type GalleryPhoto = {
  key: string;
  // Source for the strip variant (small, fixed-size tiles).
  src: string;
  // Source for the grid variant; falls back to `src`.
  largeSrc?: string;
  srcSet?: string;
  alt?: string;
};

type StripProps = {
  variant: "strip";
  // Fixed tile box for the filmstrip; matches the surface it lives on.
  tile: { width: number; height: number };
};

type GridProps = {
  variant: "grid";
};

type Props = (StripProps | GridProps) & {
  photos: GalleryPhoto[];
  onOpen: (index: number) => void;
};

const GAP = 8;
// Sidebar content width at which the grid moves from two to three
// columns. Measured on the grid itself, so it tracks the drag handle.
const THREE_COL_MIN = 520;

// Shared photo surface for the pin drawer.
//
// "strip" is the mobile drawer's horizontal filmstrip — unchanged from
// before, fixed tiles, bleeds to the drawer edge.
//
// "grid" is the desktop panel. It fills whatever width the user has
// dragged the sidebar to, and lays the day's photos out like a spread:
// when the count doesn't divide evenly into the columns, the first
// photo becomes a wide hero so nothing is left orphaned at the end.
// Each tile carries a measured `sizes` so the browser fetches the
// right density for the slot instead of a fixed thumbnail.
export function PhotoGallery(props: Props) {
  const { photos, onOpen } = props;

  if (props.variant === "strip") {
    const { width, height } = props.tile;
    return (
      <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1">
        {photos.map((p, i) => (
          <PhotoTile
            key={p.key}
            src={p.src}
            alt={p.alt}
            onClick={() => onOpen(i)}
            className="shrink-0"
            style={{ width, height }}
          />
        ))}
      </div>
    );
  }

  return <PhotoGrid photos={photos} onOpen={onOpen} />;
}

function PhotoGrid({
  photos,
  onOpen,
}: {
  photos: GalleryPhoto[];
  onOpen: (index: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  // Measure before paint so the first image request already carries
  // the right `sizes`; tiles render only once we know the width.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const count = photos.length;
  let cols = width >= THREE_COL_MIN ? 3 : 2;
  if (count < cols) cols = Math.max(count, 1);
  const hero = count > 1 && count % cols === 1;
  const cellWidth = Math.floor((width - GAP * (cols - 1)) / cols);

  return (
    <div
      ref={ref}
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: GAP,
      }}
    >
      {width > 0 &&
        photos.map((p, i) => {
          const isHero = (hero && i === 0) || count === 1;
          return (
            <PhotoTile
              key={p.key}
              src={p.largeSrc ?? p.src}
              srcSet={p.srcSet}
              sizes={`${isHero ? width : cellWidth}px`}
              alt={p.alt}
              onClick={() => onOpen(i)}
              style={{
                gridColumn: isHero ? "1 / -1" : undefined,
                aspectRatio: isHero ? "16 / 10" : "1 / 1",
              }}
            />
          );
        })}
    </div>
  );
}

function PhotoTile({
  src,
  srcSet,
  sizes,
  alt,
  onClick,
  className,
  style,
}: {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt?: string;
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  // A photo that can't load leaves the layout instead of sitting as an
  // empty box; the grid re-flows around it.
  if (state === "error") return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={alt ? `View photo: ${alt}` : "View photo"}
      className={`photo-tile relative overflow-hidden rounded-lg bg-bg outline-none ring-offset-2 ring-offset-surface focus-visible:ring-2 focus-visible:ring-accent ${className ?? ""}`}
      style={style}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt=""
        loading="lazy"
        decoding="async"
        data-loaded={state === "ok" ? "" : undefined}
        onLoad={() => setState("ok")}
        onError={() => setState("error")}
        className="h-full w-full object-cover"
      />
    </button>
  );
}
