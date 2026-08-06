"use client";

import { Modal } from "@/components/modal";
import {
  importRecipeFromPdfAction,
  importRecipeFromTextAction,
  importRecipeFromUrlAction,
} from "@/lib/actions/import-recipe";
import { saveRecipeDraft } from "@/lib/recipes/draft-storage";
import {
  FileImage,
  FileText,
  Link2,
  PencilLine,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

const TABS = ["URL", "Text", "PDF / image", "Manual"] as const;
type Tab = (typeof TABS)[number];

export function ImportRecipeModal({
  open,
  onClose,
  newRecipeHref,
}: {
  open: boolean;
  onClose: () => void;
  newRecipeHref: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("Text");
  const [pasteText, setPasteText] = useState("");
  const [url, setUrl] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function resetAndClose() {
    setExtractError(null);
    onClose();
  }

  function handleExtract() {
    setExtractError(null);

    if (tab === "Manual") {
      router.push(newRecipeHref);
      return;
    }

    if (tab === "PDF / image") {
      if (!pdfFile) {
        setExtractError("Choose a PDF first. Photo/screenshot import is not in v1.");
        return;
      }
      if (!pdfFile.name.toLowerCase().endsWith(".pdf") && pdfFile.type !== "application/pdf") {
        setExtractError("Photo/screenshot import is not in v1 — upload a text PDF or use Text paste.");
        return;
      }

      startTransition(async () => {
        const formData = new FormData();
        formData.set("file", pdfFile);
        const result = await importRecipeFromPdfAction(formData);
        if (!result.ok) {
          setExtractError(result.error);
          return;
        }
        saveRecipeDraft(result.draft);
        resetAndClose();
        router.push(newRecipeHref);
      });
      return;
    }

    if (tab === "URL") {
      if (!url.trim()) {
        setExtractError("Paste a recipe URL first.");
        return;
      }
      startTransition(async () => {
        const result = await importRecipeFromUrlAction(url.trim());
        if (!result.ok) {
          setExtractError(result.error);
          return;
        }
        saveRecipeDraft(result.draft);
        resetAndClose();
        router.push(newRecipeHref);
      });
      return;
    }

    if (tab === "Text") {
      if (!pasteText.trim()) {
        setExtractError("Paste recipe text first.");
        return;
      }
      startTransition(async () => {
        const result = await importRecipeFromTextAction(pasteText);
        if (!result.ok) {
          setExtractError(result.error);
          return;
        }
        saveRecipeDraft(result.draft);
        resetAndClose();
        router.push(newRecipeHref);
      });
    }
  }

  return (
    <Modal open={open} onClose={resetAndClose} title="Import a recipe">
      <div className="flex overflow-x-auto rounded-full border border-ink/15 bg-white/40 p-1">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => {
              setTab(name);
              setExtractError(null);
            }}
            className={`min-w-max flex-1 rounded-full px-4 py-2 text-xs font-bold ${tab === name ? "bg-ink text-paper" : "text-ink/50"}`}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "URL" ? (
          <div>
            <div className="rounded-2xl bg-orange/8 p-4 text-sm text-ink/60">
              <Link2 size={18} className="mb-3 text-orange" />
              Paste a public recipe URL. plated. pulls the page text and uses AI to structure ingredients, steps, and
              details.
            </div>
            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-semibold">Recipe URL</span>
              <input
                className="field"
                placeholder="https://example.com/recipe"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
              />
            </label>
          </div>
        ) : null}
        {tab === "Text" ? (
          <label className="block">
            <span className="mb-2 block text-xs font-semibold">Recipe text</span>
            <textarea
              className="field min-h-52"
              placeholder="Paste the full recipe — AI will structure ingredients, steps, and details..."
              value={pasteText}
              onChange={(event) => setPasteText(event.target.value)}
            />
          </label>
        ) : null}
        {tab === "PDF / image" ? (
          <div>
            <button
              type="button"
              className="flex min-h-64 w-full flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-ink/20 bg-white/30 p-6 text-center"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={26} />
              <p className="mt-4 font-editorial text-2xl font-semibold">
                {pdfFile ? pdfFile.name : "Drop a PDF here"}
              </p>
              <p className="mt-2 max-w-sm text-xs leading-relaxed text-ink/45">
                Text PDFs are extracted on the server and not retained. Photo/screenshot import is out of v1.
              </p>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setPdfFile(file);
                setExtractError(null);
              }}
            />
          </div>
        ) : null}
        {tab === "Manual" ? (
          <div>
            <p className="text-sm text-ink/55">Enter the full recipe in the editor after creating a blank draft.</p>
            <Link
              href={newRecipeHref}
              className="btn-primary mt-5 inline-flex w-full justify-center"
              onClick={resetAndClose}
            >
              <PencilLine size={16} /> Continue to manual entry
            </Link>
          </div>
        ) : null}
      </div>
      {extractError ? (
        <p className="mt-4 rounded-2xl border border-tomato/20 bg-tomato/5 px-4 py-3 text-sm font-semibold text-tomato">
          {extractError}
        </p>
      ) : null}
      {tab !== "Manual" ? (
        <button className="btn-primary mt-6 w-full" disabled={pending} onClick={handleExtract}>
          {tab === "URL" ? (
            <Link2 size={16} />
          ) : tab === "Text" ? (
            <FileText size={16} />
          ) : tab === "PDF / image" ? (
            <FileImage size={16} />
          ) : (
            <PencilLine size={16} />
          )}{" "}
          {pending ? "Importing…" : "Extract recipe"}
        </button>
      ) : null}
    </Modal>
  );
}
