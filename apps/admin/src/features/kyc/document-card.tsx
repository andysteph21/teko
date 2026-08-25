"use client";

// Carte d'une pièce du dossier (A-03 / AM-03) : vignette signée, statut,
// actions « Conforme » / « Refuser… » (motif obligatoire, visible chauffeur).

import { useState } from "react";
import {
  DOC_STATUS_PILL,
  DOC_TYPE_LABELS,
  type DocumentRow,
  fileName,
  frenchApiError,
} from "./kyc-labels";
import { useReviewDocument } from "./use-kyc-actions";
import { useKycFileUrl } from "./use-kyc-queries";

function DocThumb({ doc }: { doc: DocumentRow }) {
  const { data: url } = useKycFileUrl(doc.storage_path);
  if (!url) {
    return (
      <div className="flex h-[88px] items-center justify-center border-t border-neutral-100 bg-neutral-100 text-[11px] text-neutral-400">
        Aperçu du document…
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      data-testid="doc-preview"
      title="Ouvrir la pièce en grand"
      className="block border-t border-neutral-100 bg-neutral-100"
    >
      {/* biome-ignore lint/performance/noImgElement: URL signée éphémère (300 s) du bucket privé — l'optimiseur next/image ne peut pas la mettre en cache. */}
      <img src={url} alt={DOC_TYPE_LABELS[doc.type]} className="h-[120px] w-full object-cover" />
    </a>
  );
}

function RejectForm(props: { busy: boolean; onConfirm: (note: string) => void }) {
  const [note, setNote] = useState("");
  return (
    <div className="flex items-center gap-2 border-t border-neutral-100 p-2.5">
      <input
        data-testid="doc-reject-note"
        className="h-9 min-w-0 flex-1 rounded-[10px] bg-neutral-100 px-3 text-xs outline-none placeholder:text-neutral-400"
        placeholder="Motif du refus (obligatoire) — visible par le chauffeur"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <button
        type="button"
        data-testid="doc-reject-confirm"
        disabled={note.trim().length === 0 || props.busy}
        onClick={() => props.onConfirm(note.trim())}
        className="h-9 flex-none rounded-[14px] bg-error-light px-3.5 text-xs font-bold text-error disabled:opacity-50"
      >
        Confirmer le refus
      </button>
    </div>
  );
}

export function DocumentCard({ doc, driverId }: { doc: DocumentRow; driverId: string }) {
  const [rejecting, setRejecting] = useState(false);
  const review = useReviewDocument(driverId);
  const pill = DOC_STATUS_PILL[doc.status];
  return (
    <div className="overflow-hidden rounded-[14px] border border-neutral-200 bg-neutral-0">
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <div className="min-w-0">
          <h4 className="truncate text-[13px] font-bold text-neutral-900">
            {DOC_TYPE_LABELS[doc.type]}
          </h4>
          <p className="truncate text-[11px] text-neutral-500">
            {fileName(doc.storage_path)}
            {doc.status === "rejected" && doc.note ? ` · Motif : ${doc.note}` : ""}
          </p>
        </div>
        <span
          className={`ml-auto flex-none rounded-full px-2.5 py-0.5 text-[9.5px] font-extrabold uppercase ${pill.className}`}
        >
          {pill.label}
        </span>
      </div>
      <DocThumb doc={doc} />
      {review.isError ? (
        <p className="px-3.5 py-1.5 text-[11.5px] font-semibold text-error">
          {frenchApiError(review.error)}
        </p>
      ) : null}
      {doc.status === "pending" ? (
        <div className="flex border-t border-neutral-100">
          <button
            type="button"
            data-testid="doc-approve"
            disabled={review.isPending}
            onClick={() => review.mutate({ documentId: doc.id, status: "validated" })}
            className="flex-1 py-2.5 text-xs font-extrabold text-success-dark hover:bg-success-light disabled:opacity-50"
          >
            ✓ Conforme
          </button>
          <button
            type="button"
            data-testid="doc-reject"
            disabled={review.isPending}
            onClick={() => setRejecting((open) => !open)}
            className="flex-1 border-l border-neutral-100 py-2.5 text-xs font-extrabold text-error hover:bg-error-light disabled:opacity-50"
          >
            ✗ Refuser…
          </button>
        </div>
      ) : null}
      {rejecting && doc.status === "pending" ? (
        <RejectForm
          busy={review.isPending}
          onConfirm={(note) => review.mutate({ documentId: doc.id, status: "rejected", note })}
        />
      ) : null}
    </div>
  );
}
