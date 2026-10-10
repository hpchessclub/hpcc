"use client";
import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";

type Area = { x: number; y: number; width: number; height: number };

async function getCroppedImage(imageSrc: string, crop: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9));
}

export default function ImageCropUpload({ bucket, value, onChange, label = "Image" }: { bucket: string; value?: string; onChange: (url: string) => void; label?: string }) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(16/9);
  const [error, setError] = useState("");
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [loading, setLoading] = useState(false);
  const onCropComplete = useCallback((_area: Area, pixels: Area) => setCroppedAreaPixels(pixels), []);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setZoom(1); setCrop({ x: 0, y: 0 }); setCroppedAreaPixels(null);
    if (!file.type.startsWith("image/")) { setError("Choose an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Choose an image smaller than 10 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setImageSrc(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function upload() {
    if (!imageSrc || !croppedAreaPixels) return;
    setLoading(true);
    setError("");
    try {
    const blob = await getCroppedImage(imageSrc, croppedAreaPixels);
    const form = new FormData();
    form.append("bucket", bucket);
    form.append("image", blob, `upload-${Date.now()}.jpg`);
    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) throw new Error(json.error || "Upload failed");
    onChange(json.url);
    setImageSrc(null);
    } catch (error) { setError(error instanceof Error ? error.message : "Upload failed. Please try again."); } finally { setLoading(false); }
  }

  return <div className="space-y-3">
    <label className="admin-label">{label}</label>
    {value && <img src={value} alt="Preview" className="h-32 max-w-full rounded-lg object-contain" />}
    <input type="file" accept="image/*" onChange={onFile} className="admin-input" />
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {imageSrc && <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="relative h-72 w-full overflow-hidden rounded-lg bg-slate-900">
        <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={aspect} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3"><label className="text-sm">Crop shape<select aria-label="Crop shape" disabled={loading} value={aspect} onChange={e=>setAspect(Number(e.target.value))} className="ml-2 rounded border p-2"><option value={16/9}>Wide</option><option value={4/3}>Photo</option><option value={1}>Square / logo</option></select></label>
        <input aria-label="Image zoom" type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e)=>setZoom(Number(e.target.value))} />
        <button type="button" onClick={upload} disabled={loading || !croppedAreaPixels} className="btn-primary py-2">{loading ? "Uploading..." : "Crop & Upload"}</button>
        <button type="button" disabled={loading} onClick={()=>setImageSrc(null)} className="btn-secondary py-2">Cancel</button>
      </div>
    </div>}
  </div>
}
