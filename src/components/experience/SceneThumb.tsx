"use client";

import { useEffect, useRef } from "react";
import { PixelBuffer } from "./pixel/buffer";
import { FincaScene } from "./scenes/finca";

/** Miniatura de una escena para la biblioteca: un cuadro quieto del momento 1. */
export default function SceneThumb({ label }: { label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const scene = new FincaScene();
    const buf = new PixelBuffer(scene.width, scene.height);
    scene.update(0.5);
    scene.render(buf);
    ref
      .current!.getContext("2d")!
      .putImageData(new ImageData(new Uint8ClampedArray(buf.data.buffer as ArrayBuffer), scene.width, scene.height), 0, 0);
  }, []);

  return (
    <canvas
      ref={ref}
      width={400}
      height={250}
      role="img"
      aria-label={label}
      style={{ display: "block", width: "100%", height: "auto", aspectRatio: "400 / 250", background: "#86cdef" }}
    />
  );
}
