"use client";

import { Modal } from "@/components/modal";
import { analyzeReceipt, saveReceiptMatches, type ReceiptAnalysis, type ReceiptMatchDraft } from "@/lib/actions/receipts";
import { Camera, Check, FileImage, FileScan, RefreshCw, RotateCcw, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

type AnalysisOk = Extract<ReceiptAnalysis, { ok: true }>;

export function ReceiptScanner({ partyId, compact = false }: { partyId: string; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"choose" | "camera" | "review">("choose");
  const [analysis, setAnalysis] = useState<AnalysisOk | null>(null);
  const [items, setItems] = useState<ReceiptMatchDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const matchedCount = useMemo(() => items.filter((item) => item.groceryItemId && item.purchased).length, [items]);
  const uncertainCount = useMemo(() => items.filter((item) => !item.groceryItemId || item.confidence < 0.62).length, [items]);

  function cleanupCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  useEffect(() => cleanupCamera, []);

  function reset() {
    cleanupCamera();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setAnalysis(null);
    setItems([]);
    setError(null);
    setMode("choose");
  }

  function close() {
    reset();
    setOpen(false);
  }

  async function openCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      setMode("camera");
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      setError("Camera access was blocked or no camera is available. You can still upload a photo.");
    }
  }

  async function analyzeFile(file: File) {
    cleanupCamera();
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    const data = new FormData();
    data.set("receipt", file);
    startTransition(async () => {
      const result = await analyzeReceipt(partyId, data);
      if (!result.ok) {
        setError(result.error);
        setMode("choose");
        return;
      }
      setAnalysis(result);
      setItems(result.items);
      setMode("review");
    });
  }

  async function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const maxWidth = 1800;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return setError("Could not capture the camera image.");
      void analyzeFile(new File([blob], `receipt-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  }

  function updateItem(index: number, patch: Partial<ReceiptMatchDraft>) {
    setItems((current) => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  }

  function save() {
    if (!analysis) return;
    setError(null);
    startTransition(async () => {
      const result = await saveReceiptMatches(partyId, { ...analysis, items });
      if (result.error) return setError(result.error);
      close();
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        className={compact ? "text-sm font-bold text-tomato" : "btn-primary"}
        onClick={() => { reset(); setOpen(true); }}
      >
        <FileScan size={compact ? 14 : 16} /> {compact ? "Add receipt" : "Scan receipt"}
      </button>

      <Modal open={open} onClose={close} title="Scan a grocery receipt">
        <div className="receipt-scanner">
          {error ? <div className="mb-4 border border-tomato/25 bg-tomato/8 px-3 py-2 text-xs font-semibold text-tomato">{error}</div> : null}

          {mode === "choose" ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" className="receipt-source-card" disabled={pending} onClick={() => fileInputRef.current?.click()}>
                  <Upload size={24} />
                  <span className="font-editorial text-2xl font-semibold">Upload photo</span>
                  <span className="text-xs text-ink/45">JPG, PNG, HEIC-compatible browser images</span>
                </button>
                <button type="button" className="receipt-source-card" disabled={pending} onClick={openCamera}>
                  <Camera size={24} />
                  <span className="font-editorial text-2xl font-semibold">Use camera</span>
                  <span className="text-xs text-ink/45">Photograph the full receipt in good light</span>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void analyzeFile(file);
                  event.currentTarget.value = "";
                }}
              />
              {pending ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-ink/55"><RefreshCw className="animate-spin" size={16}/> Reading receipt and matching groceries…</div>
              ) : null}
            </div>
          ) : null}

          {mode === "camera" ? (
            <div className="space-y-4">
              <div className="receipt-camera relative overflow-hidden bg-ink">
                <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
                <div className="pointer-events-none absolute inset-[7%_12%] rounded-[18px] border-2 border-paper shadow-[0_0_0_999px_rgba(0,0,0,.42)]">
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-paper">Fit the entire receipt inside the guide</span>
                  <span className="absolute -left-px -top-px h-8 w-8 border-l-4 border-t-4 border-orange" />
                  <span className="absolute -right-px -top-px h-8 w-8 border-r-4 border-t-4 border-orange" />
                  <span className="absolute -bottom-px -left-px h-8 w-8 border-b-4 border-l-4 border-orange" />
                  <span className="absolute -bottom-px -right-px h-8 w-8 border-b-4 border-r-4 border-orange" />
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" className="btn-secondary" onClick={() => { cleanupCamera(); setMode("choose"); }}><X size={15}/> Cancel</button>
                <button type="button" className="btn-primary px-8" onClick={capture}><Camera size={16}/> Take photo</button>
              </div>
            </div>
          ) : null}

          {mode === "review" && analysis ? (
            <div className="space-y-4">
              <div className="grid gap-4 rounded-[3px] border border-ink/15 bg-paper-2 p-4 sm:grid-cols-[96px_1fr_auto] sm:items-center">
                {previewUrl ? <img src={previewUrl} alt="Receipt preview" className="h-28 w-24 rounded-[2px] object-cover" /> : <div className="grid h-28 w-24 place-items-center bg-ink/5"><FileImage/></div>}
                <div>
                  <p className="eyebrow">Extraction complete</p>
                  <h3 className="mt-1 font-editorial text-3xl font-semibold">{analysis.storeName || "Receipt"}</h3>
                  <p className="mt-1 text-xs text-ink/45">{matchedCount} matched · {uncertainCount} need review{analysis.purchasedAt ? ` · ${analysis.purchasedAt}` : ""}</p>
                </div>
                <p className="font-editorial text-3xl font-semibold">${Number(analysis.total ?? items.reduce((sum, item) => sum + item.lineTotal, 0)).toFixed(2)}</p>
              </div>

              <div className="max-h-[48vh] overflow-auto border border-ink/15">
                <div className="sticky top-0 z-10 hidden grid-cols-[minmax(150px,1.3fr)_90px_minmax(170px,1fr)_70px] gap-2 border-b border-ink/15 bg-paper-2 px-3 py-2 text-[9px] font-bold uppercase tracking-[.1em] text-ink/45 sm:grid">
                  <span>Receipt item</span><span>Price</span><span>Grocery match</span><span>Bought</span>
                </div>
                <div className="divide-y divide-ink/10">
                  {items.map((item, index) => (
                    <div key={`${item.rawName}-${index}`} className={`grid gap-2 p-3 sm:grid-cols-[minmax(150px,1.3fr)_90px_minmax(170px,1fr)_70px] sm:items-center ${!item.groceryItemId || item.confidence < 0.62 ? "bg-gold/8" : ""}`}>
                      <label className="min-w-0"><span className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-ink/35 sm:hidden">Receipt item</span><input className="field !px-2 !py-2 text-xs" value={item.normalizedName} onChange={(e) => updateItem(index, { normalizedName: e.target.value })}/><span className="mt-1 block truncate text-[9px] text-ink/35">{item.rawName}</span></label>
                      <label><span className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-ink/35 sm:hidden">Price</span><input className="field !px-2 !py-2 text-xs" type="number" min="0" step="0.01" value={item.lineTotal} onChange={(e) => updateItem(index, { lineTotal: Math.max(0, Number(e.target.value) || 0) })}/></label>
                      <label className="min-w-0"><span className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-ink/35 sm:hidden">Grocery match</span><select className="field !px-2 !py-2 text-xs" value={item.groceryItemId || ""} onChange={(e) => updateItem(index, { groceryItemId: e.target.value || null, purchased: Boolean(e.target.value), confidence: e.target.value ? Math.max(item.confidence, .75) : 0 })}><option value="">No match</option>{analysis.grocery.map((grocery) => <option key={grocery.id} value={grocery.id}>{grocery.ingredient_name}</option>)}</select>{item.confidence < .62 ? <span className="mt-1 block text-[9px] font-semibold text-gold">Review suggested</span> : null}</label>
                      <label className="flex items-center gap-2 sm:justify-center"><input type="checkbox" checked={item.purchased} disabled={!item.groceryItemId} onChange={(e) => updateItem(index, { purchased: e.target.checked })}/><span className="text-[10px] sm:hidden">Mark bought</span></label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <button type="button" className="btn-secondary" disabled={pending} onClick={() => { setAnalysis(null); setItems([]); setMode("choose"); }}><RotateCcw size={15}/> Scan another</button>
                <button type="button" className="btn-primary" disabled={pending || items.length === 0} onClick={save}>{pending ? <RefreshCw className="animate-spin" size={15}/> : <Check size={15}/>} Apply {matchedCount} matches</button>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
