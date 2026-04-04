import React, { useState, useCallback } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

interface ImageLightboxProps {
  src: string;
  alt: string;
}

export default function ImageLightbox({ src, alt }: ImageLightboxProps) {
  const [open, setOpen] = useState(false);

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <>
      <img
        src={src}
        alt={alt}
        onClick={handleOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleOpen();
        }}
        style={{ cursor: "zoom-in", maxWidth: "100%" }}
      />
      <Lightbox
        open={open}
        close={handleClose}
        slides={[{ src, alt }]}
        carousel={{ finite: true }}
        render={{
          buttonPrev: () => null,
          buttonNext: () => null,
        }}
      />
    </>
  );
}
