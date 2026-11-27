"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { CircleCheck, Eye, FileText, FileUp, ImageIcon, LoaderCircle, RotateCcw, Shapes, Trash2, TriangleAlert } from "lucide-react";
import { allowedExtensions, extensionOf, formatBytes, kindForExtension, type FileKind } from "@/lib/files";
import type { MeshAnalysis } from "@/lib/pricing/mesh";
import { track } from "@/lib/analytics";

const ModelViewer = dynamic(() => import("@/components/three/ModelViewer"), {
  ssr: false,
  loading: () => <ViewerMessage icon={<LoaderCircle className="h-6 w-6 animate-spin text-accent" />} text="Loading 3D viewer…" />,
});

export type ModelState =
  | { state: "loading" }
  | { state: "ready"; positions: Float32Array; analysis: MeshAnalysis }
  | { state: "error"; error: string }
  | { state: "none" };

export type UploadItem = {
  id: string;
  file: File;
  name: string;
  size: number;
  ext: string;
  kind: FileKind;
  /** "local" = preview only (uploads not configured on this deployment) */
  status: "queued" | "uploading" | "done" | "error" | "local";
  progress: number;
  error?: string;
  path?: string;
  model: ModelState;
  previewUrl?: string;
};

export type UploadLimits = { maxFileBytes: number; maxFileMb: number; maxFiles: number };

const PREVIEWABLE = ["stl", "obj", "3mf"];
/** Above this, skip in-browser 3D preview/measurement so phones and laptops stay responsive. */
const PREVIEW_MAX_BYTES = 250 * 1024 * 1024;
const canPreview = (ext: string, size: number) => PREVIEWABLE.includes(ext) && size <= PREVIEW_MAX_BYTES;
const sizeLabel = (mb: number) => (mb >= 1024 ? `${+(mb / 1024).toFixed(1)} GB` : `${mb} MB`);

/**
 * Files are previewed and measured locally in the browser, and uploaded
 * straight to private storage through short-lived signed URLs. The server
 * re-checks every file's real type before attaching it to an enquiry.
 */
export function FileUploader({
  uploadSession,
  items,
  setItems,
  limits,
  allowReferences,
  uploadEnabled,
  afterPreview,
  selectedId,
  onSelect,
}: {
  uploadSession: string;
  items: UploadItem[];
  setItems: (fn: (prev: UploadItem[]) => UploadItem[]) => void;
  limits: UploadLimits;
  allowReferences: boolean;
  uploadEnabled: boolean;
  /** Rendered directly under the 3D preview (used for the price on mobile). */
  afterPreview?: React.ReactNode;
  /** Currently previewed file (controlled by the form so the price follows it). */
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const exts = allowedExtensions(allowReferences);
  const selected = items.find((i) => i.id === selectedId) ?? items[0];

  const update = (id: string, patch: Partial<UploadItem>) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  async function analyse(item: UploadItem) {
    if (!canPreview(item.ext, item.size)) return;
    try {
      const { loadModel } = await import("@/lib/three/load-model");
      const { positions, analysis } = await loadModel(item.file, item.ext);
      update(item.id, { model: { state: "ready", positions, analysis } });
    } catch {
      update(item.id, { model: { state: "error", error: "We couldn't read this model in the browser — we'll review it manually." } });
    }
  }

  async function upload(item: UploadItem, existingCount: number) {
    if (!uploadEnabled) return;
    update(item.id, { status: "uploading", progress: 0, error: undefined });
    try {
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadSession, name: item.name, size: item.size, allowReferences, existingCount }),
      });
      const data = (await res.json().catch(() => ({}))) as { signedUrl?: string; path?: string; error?: string };
      if (!res.ok || !data.signedUrl || !data.path) throw new Error(data.error ?? "Could not start the upload. Please try again.");

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", data.signedUrl!);
        xhr.setRequestHeader("x-upsert", "false");
        xhr.upload.onprogress = (e) => e.lengthComputable && update(item.id, { progress: Math.round((e.loaded / e.total) * 100) });
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(
                new Error(
                  xhr.status === 413
                    ? "This file is larger than our storage accepts right now. Remove it and paste a Google Drive / WeTransfer link in the project notes, or send it on WhatsApp."
                    : `Upload failed (${xhr.status}). Please retry.`,
                ),
              );
        xhr.onerror = () => reject(new Error("Network error during upload. Check your connection and retry."));
        const body = new FormData();
        body.append("cacheControl", "3600");
        body.append("", item.file);
        xhr.send(body);
      });

      update(item.id, { status: "done", progress: 100, path: data.path });
      track("file_upload_complete", { file_count: 1 });
    } catch (err) {
      update(item.id, { status: "error", error: err instanceof Error ? err.message : "Upload failed" });
    }
  }

  function addFiles(list: FileList | File[]) {
    setNotice(null);
    const incoming = Array.from(list);
    const room = limits.maxFiles - items.length;
    if (room <= 0) {
      setNotice(`You can attach up to ${limits.maxFiles} files. Remove one to add another.`);
      return;
    }
    const accepted: UploadItem[] = [];
    const rejected: string[] = [];
    for (const file of incoming.slice(0, room)) {
      const ext = extensionOf(file.name);
      const kind = kindForExtension(ext);
      if (!kind || !exts.includes(ext)) rejected.push(`${file.name}: .${ext || "?"} files aren't accepted${kind === "reference" ? " (tick “I need help creating the design” to add images or PDFs)" : ""}`);
      else if (file.size === 0) rejected.push(`${file.name}: file is empty`);
      else if (file.size > limits.maxFileBytes) rejected.push(`${file.name}: larger than ${sizeLabel(limits.maxFileMb)} — please share a Google Drive / WeTransfer link in the notes`);
      else
        accepted.push({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          size: file.size,
          ext,
          kind,
          status: uploadEnabled ? "queued" : "local",
          progress: 0,
          model: canPreview(ext, file.size) ? { state: "loading" } : { state: "none" },
          previewUrl: ["jpg", "jpeg", "png", "webp"].includes(ext) ? URL.createObjectURL(file) : undefined,
        });
    }
    if (incoming.length > room) rejected.push(`Only ${room} more file${room === 1 ? "" : "s"} can be added`);
    if (rejected.length) setNotice(rejected.join(" · "));
    if (!accepted.length) return;
    setItems((prev) => [...prev, ...accepted]);
    // Jump the preview (and price) to the newly uploaded file.
    onSelect(accepted[accepted.length - 1].id);
    accepted.forEach((item, i) => {
      analyse(item);
      upload(item, items.length + i);
    });
  }

  function remove(item: UploadItem) {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    if (selected?.id === item.id) onSelect(items.find((i) => i.id !== item.id)?.id ?? null);
  }

  return (
    <div>
      {/* Preview stage */}
      {selected && (
        <div className="mb-4 overflow-hidden rounded-2xl border border-ink-700 bg-ink-900">
          <div className="tech-grid relative aspect-[4/3] sm:aspect-[16/10]">
            <Preview item={selected} />
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-ink-700 px-4 py-3 text-sm text-ink-200">
            <span className="min-w-0 max-w-full truncate font-semibold text-white">{selected.name}</span>
            {selected.model.state === "ready" && (
              <span className="font-mono text-xs text-ink-300">
                {selected.model.analysis.size.map((s) => s.toFixed(1)).join(" × ")} mm · {(selected.model.analysis.volumeMm3 / 1000).toFixed(1)} cm³
              </span>
            )}
          </div>
        </div>
      )}

      {selected && afterPreview}

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={items.length ? "Add more files: click or drop files here" : "Upload 3D files: click or drop files here"}
        className={`group relative flex cursor-pointer flex-col items-center overflow-hidden rounded-2xl border-2 border-dashed px-5 text-center transition focus-visible:border-accent ${items.length ? "py-6" : "py-12"} ${dragging ? "border-accent bg-accent/10" : "border-line bg-white hover:border-accent/60 hover:bg-accent/[0.03]"}`}
      >
        <div className="tech-grid-light pointer-events-none absolute inset-0" aria-hidden="true" />
        <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-xl bg-ink-900 text-accent shadow-lg shadow-accent/20 transition group-hover:-translate-y-0.5">
          <FileUp className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="relative mt-3 font-semibold">{items.length ? "Add more files" : "Drop your 3D files here — see them in 3D instantly"}</p>
        <p className="relative mt-1 text-sm text-muted">Click anywhere in this box or drag files in</p>
        <span aria-hidden="true" className="relative mt-3 inline-flex h-11 items-center rounded-full bg-ink-900 px-5 text-sm font-semibold text-white transition group-hover:bg-ink-700">
          Choose files
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={exts.map((e) => `.${e}`).join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose files to upload"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <p className="relative mt-3 text-xs text-muted">
          {exts.map((e) => e.toUpperCase()).join(", ")} · large files welcome (up to {sizeLabel(limits.maxFileMb)} each) · up to {limits.maxFiles} files
        </p>
      </div>

      {notice && (
        <p role="alert" className="mt-3 flex gap-2 break-words rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {notice}
        </p>
      )}

      {items.length > 0 && (
        <ul className="mt-4 min-w-0 space-y-2" aria-label="Attached files">
          {items.map((item) => (
            <li
              key={item.id}
              onClick={() => onSelect(item.id)}
              aria-current={selected?.id === item.id ? "true" : undefined}
              className={`cursor-pointer rounded-xl border bg-white px-3 py-2.5 transition hover:border-accent/60 ${selected?.id === item.id ? "border-accent ring-2 ring-accent/20" : "border-line"}`}
            >
              <div className="flex items-center gap-3">
                <FileBadge item={item} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-muted">
                    {formatBytes(item.size)}
                    {item.status === "uploading" && ` · uploading ${item.progress}%`}
                    {item.status === "done" && " · uploaded securely"}
                    {item.status === "local" && " · preview only"}
                    {item.model.state === "ready" && ` · ${item.model.analysis.size.map((s) => Math.round(s)).join("×")} mm`}
                  </p>
                </div>
                <StatusIcon item={item} />
                <button type="button" onClick={(e) => { e.stopPropagation(); onSelect(item.id); }} aria-pressed={selected?.id === item.id} className={`inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-paper hover:text-accent-ink ${selected?.id === item.id ? "text-accent-ink" : "text-muted"}`} aria-label={`Preview and price ${item.name}`}>
                  <Eye className="h-4 w-4" />
                </button>
                {item.status === "error" && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); upload(item, items.indexOf(item)); }} className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-paper" aria-label={`Retry ${item.name}`}>
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(item);
                  }}
                  disabled={item.status === "uploading"}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-paper hover:text-danger disabled:opacity-40"
                  aria-label={`Remove ${item.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {item.status === "uploading" && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-2" role="progressbar" aria-valuenow={item.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Uploading ${item.name}`}>
                  <div className="h-full rounded-full bg-gradient-to-r from-accent-soft to-accent transition-[width]" style={{ width: `${item.progress}%` }} />
                </div>
              )}
              {item.error && <p className="mt-2 text-sm text-danger">{item.error}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Preview({ item }: { item: UploadItem }) {
  if (item.model.state === "ready") return <ModelViewer key={item.id} positions={item.model.positions} />;
  if (item.model.state === "loading") return <ViewerMessage icon={<LoaderCircle className="h-6 w-6 animate-spin text-accent" />} text="Reading your model…" />;
  if (item.model.state === "error") return <ViewerMessage icon={<TriangleAlert className="h-6 w-6 text-accent" />} text={item.model.error} />;
  if (item.previewUrl)
    // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
    return <img src={item.previewUrl} alt={`Preview of ${item.name}`} className="h-full w-full object-contain p-4" />;
  if (item.kind === "model" && item.size > PREVIEW_MAX_BYTES && PREVIEWABLE.includes(item.ext))
    return <ViewerMessage icon={<Shapes className="h-7 w-7 text-accent" />} text="Big file! It's uploading in full — we skip the in-browser 3D preview for very large models to keep your device fast. Our team will review and quote it." />;
  if (item.ext === "step" || item.ext === "stp")
    return <ViewerMessage icon={<Shapes className="h-7 w-7 text-accent" />} text="STEP files can't be previewed in the browser — our engineers will open it in CAD and quote it manually." />;
  return <ViewerMessage icon={<FileText className="h-7 w-7 text-accent" />} text="Document attached — we'll review it with your brief." />;
}

function ViewerMessage({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-ink-200">
      {icon}
      <p className="max-w-sm">{text}</p>
    </div>
  );
}

function FileBadge({ item }: { item: UploadItem }) {
  const Icon = item.kind === "model" ? Shapes : item.ext === "pdf" ? FileText : ImageIcon;
  return (
    <span className="inline-flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-ink-900 text-accent">
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="mt-0.5 font-mono text-[0.55rem] uppercase leading-none text-ink-200">{item.ext}</span>
    </span>
  );
}

function StatusIcon({ item }: { item: UploadItem }) {
  if (item.status === "done") return <CircleCheck className="h-5 w-5 shrink-0 text-success" aria-label="Uploaded" />;
  if (item.status === "error") return <TriangleAlert className="h-5 w-5 shrink-0 text-danger" aria-label="Failed" />;
  if (item.status === "uploading" || item.status === "queued") return <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-accent-ink" aria-label="Uploading" />;
  return null;
}
