"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const VIEW = 280;
const OUTPUT = 256;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

type Props = {
  chatbotId: string;
  initialUrl: string;
};

type CropState = {
  src: string;
  zoom: number;
  posX: number;
  posY: number;
  naturalWidth: number;
  naturalHeight: number;
};

function minScale(nw: number, nh: number) {
  return Math.max(VIEW / nw, VIEW / nh);
}

function clampPos(posX: number, posY: number, scale: number, nw: number, nh: number) {
  const w = nw * scale;
  const h = nh * scale;
  return {
    x: Math.min(0, Math.max(VIEW - w, posX)),
    y: Math.min(0, Math.max(VIEW - h, posY)),
  };
}

function centeredPos(scale: number, nw: number, nh: number) {
  return clampPos((VIEW - nw * scale) / 2, (VIEW - nh * scale) / 2, scale, nw, nh);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image"));
    img.src = src;
  });
}

function exportJpeg(img: HTMLImageElement, crop: CropState) {
  const scale = minScale(crop.naturalWidth, crop.naturalHeight) * crop.zoom;
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT;
  canvas.height = OUTPUT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not crop photo");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, OUTPUT, OUTPUT);
  const k = OUTPUT / VIEW;
  ctx.drawImage(
    img,
    crop.posX * k,
    crop.posY * k,
    crop.naturalWidth * scale * k,
    crop.naturalHeight * scale * k,
  );
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not crop photo"))),
      "image/jpeg",
      0.9,
    );
  });
}

function AvatarPreview(props: { src: string; size: number }) {
  return (
    <div
      className="shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100"
      style={{ width: props.size, height: props.size }}
    >
      {props.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={props.src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-medium text-slate-400">
          Photo
        </div>
      )}
    </div>
  );
}

export function AvatarCropField({ chatbotId, initialUrl }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [crop, setCrop] = useState<CropState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const drag = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const closeCrop = useCallback(() => {
    setCrop((current) => {
      if (current?.src.startsWith("blob:")) URL.revokeObjectURL(current.src);
      return null;
    });
    drag.current = null;
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  async function onPick(file: File | undefined) {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a JPG or PNG photo.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Photo must be under 10 MB.");
      return;
    }
    const src = URL.createObjectURL(file);
    try {
      const img = await loadImage(src);
      const scale = minScale(img.naturalWidth, img.naturalHeight);
      const pos = centeredPos(scale, img.naturalWidth, img.naturalHeight);
      setCrop({
        src,
        zoom: 1,
        posX: pos.x,
        posY: pos.y,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      });
    } catch {
      URL.revokeObjectURL(src);
      setError("Could not read that image. Try a JPG or PNG.");
    }
  }

  function updateZoom(nextZoom: number) {
    setCrop((current) => {
      if (!current) return current;
      const prevScale = minScale(current.naturalWidth, current.naturalHeight) * current.zoom;
      const scale = minScale(current.naturalWidth, current.naturalHeight) * nextZoom;
      const cx = VIEW / 2;
      const cy = VIEW / 2;
      const imgX = (cx - current.posX) / prevScale;
      const imgY = (cy - current.posY) / prevScale;
      const pos = clampPos(cx - imgX * scale, cy - imgY * scale, scale, current.naturalWidth, current.naturalHeight);
      return { ...current, zoom: nextZoom, posX: pos.x, posY: pos.y };
    });
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!crop) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, posX: crop.posX, posY: crop.posY };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current || !crop) return;
    const scale = minScale(crop.naturalWidth, crop.naturalHeight) * crop.zoom;
    const pos = clampPos(
      drag.current.posX + (event.clientX - drag.current.x),
      drag.current.posY + (event.clientY - drag.current.y),
      scale,
      crop.naturalWidth,
      crop.naturalHeight,
    );
    setCrop({ ...crop, posX: pos.x, posY: pos.y });
  }

  function onWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!crop) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.08 : 0.08;
    updateZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, crop.zoom + delta)));
  }

  async function applyCrop() {
    if (!crop) return;
    setBusy(true);
    setError("");
    try {
      const img = await loadImage(crop.src);
      const blob = await exportJpeg(img, crop);
      const body = new FormData();
      body.set("chatbotId", chatbotId);
      body.set("file", blob, "avatar.jpg");
      const res = await fetch("/api/uploads", { method: "POST", body });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
      setUrl(data.url);
      closeCrop();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save photo");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!crop) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) closeCrop();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [crop, busy, closeCrop]);

  const scale = crop ? minScale(crop.naturalWidth, crop.naturalHeight) * crop.zoom : 1;

  const modal =
    mounted && crop
      ? createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="presentation">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="avatar-crop-title"
              className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            >
              <h3 id="avatar-crop-title" className="text-lg font-semibold">
                Crop avatar
              </h3>
              <p className="mt-1 text-sm text-slate-600">Drag to reposition. Use the slider to zoom.</p>
              <div
                className="relative mx-auto mt-4 cursor-grab overflow-hidden rounded-2xl bg-slate-900 active:cursor-grabbing"
                style={{ width: VIEW, height: VIEW, touchAction: "none" }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={() => {
                  drag.current = null;
                }}
                onPointerCancel={() => {
                  drag.current = null;
                }}
                onWheel={onWheel}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={crop.src}
                  alt=""
                  draggable={false}
                  className="absolute max-w-none select-none"
                  style={{
                    width: crop.naturalWidth * scale,
                    height: crop.naturalHeight * scale,
                    left: crop.posX,
                    top: crop.posY,
                  }}
                />
                <div
                  className="pointer-events-none absolute inset-0 rounded-full border-2 border-white"
                  style={{ boxShadow: "0 0 0 999px rgb(15 23 42 / 0.45)" }}
                />
              </div>
              <label className="mt-4 block text-xs font-semibold text-slate-500">
                Zoom
                <input
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={crop.zoom}
                  onChange={(e) => updateZoom(Number(e.target.value))}
                  className="mt-1"
                />
              </label>
              {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" className="btn secondary" onClick={closeCrop} disabled={busy}>
                  Cancel
                </button>
                <button type="button" className="btn" onClick={applyCrop} disabled={busy}>
                  {busy ? "Saving…" : "Use photo"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div>
      <label>Avatar photo</label>
      <input type="hidden" name="avatarImageUrl" value={url} />
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      <div className="flex items-center gap-3 rounded-2xl bg-[#f4f4f0] px-3 py-2.5">
        <AvatarPreview src={url} size={52} />
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              {url ? "Change photo" : "Upload photo"}
            </button>
            {url ? (
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setUrl("");
                  setError("");
                }}
              >
                Remove
              </button>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-slate-500">JPG or PNG. You’ll crop it to a circle.</p>
        </div>
      </div>
      {error && !crop ? <p className="mt-1 text-sm text-red-700">{error}</p> : null}
      {modal}
    </div>
  );
}
