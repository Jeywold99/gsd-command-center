"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload, Trash2 } from "lucide-react";
import Avatar from "../../_components/avatar";
import { uploadAvatar, removeAvatar } from "../actions";

const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const OUT = 512;

// Center-crop to a square and scale to 512px in the browser, so uploads are
// small (~50–150 KB) whatever the phone camera produced. Whatever the browser
// can decode works — iPhones hand over HEIC photos as JPEG to file inputs.
async function toSquare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = OUT;
  canvas.height = OUT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, OUT, OUT);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.88),
  );
}

export default function AvatarUploader({
  name,
  role,
  src,
}: {
  name: string;
  role: string;
  src: string | null;
}) {
  const router = useRouter();
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (file.size > MAX_INPUT_BYTES) {
      setError("That photo is over 15 MB — pick a smaller one.");
      return;
    }
    let blob: Blob;
    try {
      blob = await toSquare(file);
    } catch {
      setError("Couldn't read that image. Try a JPG or PNG.");
      return;
    }
    const url = URL.createObjectURL(blob);
    setPreview(url);
    start(async () => {
      const fd = new FormData();
      fd.append("photo", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      const res = await uploadAvatar(fd);
      if (res.error) {
        setError(res.error);
        setPreview(null);
      } else {
        router.refresh();
      }
    });
  };

  const shown = preview ?? src;

  return (
    <section
      aria-labelledby="photo-h"
      className="flex flex-col items-center gap-3.5 rounded-3xl border border-black/[0.07] bg-white px-4.5 py-6"
    >
      <h2 id="photo-h" className="sr-only">
        Profile photo
      </h2>
      <div className="relative">
        <Avatar
          name={name}
          src={shown}
          className="h-[116px] w-[116px] text-5xl ring-4 ring-white outline-2 outline-offset-4 outline-brand-pale"
        />
        <button
          type="button"
          onClick={() => libraryRef.current?.click()}
          aria-label="Change profile photo"
          className="absolute -right-0.5 -bottom-0.5 flex h-[42px] w-[42px] items-center justify-center rounded-full border-[3px] border-white bg-brand text-ink"
        >
          <Camera className="w-[18px] h-[18px]" />
        </button>
        {pending && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-xs font-semibold text-white">
            Saving…
          </span>
        )}
      </div>
      <div className="text-center">
        <p className="text-xl font-bold">{name}</p>
        <p className="text-sm capitalize text-[#6B645D]">{role.toLowerCase()} · GSD HQ</p>
      </div>

      <input ref={libraryRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      <input ref={cameraRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onPick} />

      <div className="grid w-full max-w-sm grid-cols-2 gap-2.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => libraryRef.current?.click()}
          className="flex h-[46px] items-center justify-center gap-2 rounded-[14px] bg-brand text-[15px] font-bold text-ink disabled:opacity-60"
        >
          <Upload className="w-4 h-4" />
          Upload photo
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => cameraRef.current?.click()}
          className="flex h-[46px] items-center justify-center gap-2 rounded-[14px] border border-black/[0.12] bg-white text-[15px] font-semibold disabled:opacity-60"
        >
          <Camera className="w-4 h-4" />
          Take photo
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-[#B42318]">
          {error}
        </p>
      )}
      <p className="text-center text-xs text-[#6B645D]">
        Any photo works — it&apos;s centered and cropped to a circle automatically.
        {src && !pending && (
          <>
            {" "}
            <button
              type="button"
              onClick={() =>
                start(async () => {
                  await removeAvatar();
                  setPreview(null);
                  router.refresh();
                })
              }
              className="inline-flex items-center gap-1 font-semibold text-[#B42318] hover:underline"
            >
              <Trash2 className="w-3 h-3" />
              Remove photo
            </button>
          </>
        )}
      </p>
    </section>
  );
}
