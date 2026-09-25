"use client";

import type { LightboxPhoto } from "./ImageLightbox";
import { DEMO_PLACE_PHOTOS } from "@/lib/demo-data";
import { photoSrcSet } from "@/lib/image-url";
import { PhotoGallery } from "./ui/PhotoGallery";

// Demo-mode stand-in for PrelivedPlaceBlock. The real app shows Google
// Places photos for a pin until the couple logs their first visit; the
// demo can't call Google, so it shows bundled Wikimedia Commons photos
// instead. Same layout as the Google block so the drawer reads the same.
// Credits travel with each photo and render inside the lightbox.
export default function DemoPlaceBlock({
  pinId,
  variant,
  onOpenPhotos,
}: {
  pinId: string;
  variant: "strip" | "grid";
  onOpenPhotos: (photos: LightboxPhoto[], index: number) => void;
}) {
  const photos = DEMO_PLACE_PHOTOS[pinId];
  if (!photos || photos.length === 0) return null;

  const tiles = photos.map((p) => ({
    key: p.url,
    src: p.thumbnailUrl ?? p.url,
    largeSrc: p.url,
    srcSet: photoSrcSet(p.url),
  }));

  return (
    <div className="mt-6 flex flex-col gap-3">
      <h3 className="font-display italic text-[14px] text-ink-soft">
        From the world
      </h3>
      {variant === "strip" ? (
        <PhotoGallery
          variant="strip"
          tile={{ width: 200, height: 140 }}
          photos={tiles}
          onOpen={(i) => onOpenPhotos(photos, i)}
        />
      ) : (
        <PhotoGallery
          variant="grid"
          photos={tiles}
          onOpen={(i) => onOpenPhotos(photos, i)}
        />
      )}
      <p className="text-[11px] text-ink-soft">
        Photos via Wikimedia Commons. Credits in the viewer.
      </p>
    </div>
  );
}
