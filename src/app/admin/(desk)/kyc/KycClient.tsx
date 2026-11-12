'use client';

import {
  Check,
  Eye,
  IdentificationCard,
  MagnifyingGlassPlus,
  ShieldCheck,
  X,
} from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { StatusBadge } from '@/ui/data/StatusBadge';
import { Dialog } from '@/ui/overlays/Dialog';
import { Button } from '@/ui/primitives/Button';
import { TextField } from '@/ui/primitives/TextField';

export interface KycRow {
  id: number;
  user_id: string;
  licence_no_last4: string;
  issuing_region: string | null;
  expires_on: string;
  status: string;
  reject_reason: string | null;
  driver_name: string;
  driver_email: string;
  frontUrl: string;
  backUrl: string | null;
}

export function KycClient({
  licences,
  canReview,
  canReveal,
}: {
  licences: KycRow[];
  canReview: boolean;
  canReveal: boolean;
}) {
  const router = useRouter();
  const [revealed, setRevealed] = useState<Record<number, string>>({});
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('Blurry image or cropped expiry date');
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function postKyc(payload: Record<string, unknown>) {
    setError(null);
    const res = await fetch('/api/admin/kyc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { licenceNumber?: string; error?: string };
    if (!res.ok) {
      setError(data.error ?? 'KYC action failed');
      return null;
    }
    return data;
  }

  async function handleApprove(licenceId: number) {
    setActionLoading(licenceId);
    const res = await postKyc({ action: 'approve', licenceId });
    setActionLoading(null);
    if (res) router.refresh();
  }

  async function handleConfirmReject(licenceId: number) {
    setActionLoading(licenceId);
    const res = await postKyc({
      action: 'reject',
      licenceId,
      reason: rejectReason,
    });
    setActionLoading(null);
    if (res) {
      setRejectId(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-h3 font-bold text-text-1">Driver Licence KYC Desk</h1>
        <p className="text-body-s text-text-3">
          Licence numbers remain masked until explicit review. Revealing a full registration number
          logs an immutable audit event.
        </p>
      </div>

      {error && (
        <div className="rounded-xs border border-danger/30 bg-danger-subtle p-3 text-body-s text-danger">
          {error}
        </div>
      )}

      {/* Licences List */}
      <div className="space-y-4">
        {licences.length === 0 ? (
          <div className="rounded-m border border-border bg-surface p-12 text-center text-text-3">
            <ShieldCheck size={36} className="mx-auto text-text-3 mb-2" />
            <p className="font-semibold text-text-1">Queue is empty</p>
            <p className="text-body-s">All driver verification requests have been processed.</p>
          </div>
        ) : (
          licences.map((l) => (
            <div
              key={l.id}
              className="grid gap-6 rounded-m border border-border bg-surface p-5 md:grid-cols-[1fr_280px] shadow-e0 transition-all hover:border-border-strong"
            >
              {/* Left Column: Driver Details & Verification Actions */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent-subtle flex items-center justify-center text-accent">
                      <IdentificationCard size={22} weight="bold" />
                    </div>
                    <div>
                      <h2 className="text-body font-bold text-text-1">{l.driver_name}</h2>
                      <p className="text-caption text-text-3">{l.driver_email}</p>
                    </div>
                  </div>
                  <StatusBadge status={l.status} />
                </div>

                {/* Licence Meta Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xs border border-border-subtle bg-surface-sunken text-body-s">
                  <div>
                    <span className="text-caption text-text-3 block">Licence Number</span>
                    <span className="tabular-nums font-semibold text-text-1">
                      {revealed[l.id] ? revealed[l.id] : `•••• •••• ${l.licence_no_last4}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-caption text-text-3 block">Issuing RTO</span>
                    <span className="font-semibold text-text-1">{l.issuing_region ?? 'KA'}</span>
                  </div>
                  <div>
                    <span className="text-caption text-text-3 block">Expiry Date</span>
                    <span className="font-semibold text-text-1">{l.expires_on}</span>
                  </div>
                </div>

                {/* Reveal Action */}
                {canReveal && !revealed[l.id] && (
                  <button
                    type="button"
                    onClick={async () => {
                      const data = await postKyc({
                        action: 'reveal',
                        licenceId: l.id,
                        reason: 'Identity verification during KYC queue review',
                      });
                      if (data?.licenceNumber) {
                        setRevealed((prev) => ({ ...prev, [l.id]: data.licenceNumber as string }));
                      }
                    }}
                    className="inline-flex items-center gap-1.5 text-body-s font-medium text-accent hover:underline cursor-pointer transition-colors"
                  >
                    <Eye size={16} weight="bold" />
                    <span>Reveal Full Number (Audited)</span>
                  </button>
                )}

                {l.reject_reason && (
                  <div className="rounded-xs border border-danger/30 bg-danger-subtle p-2.5 text-caption text-danger">
                    <strong>Rejection reason:</strong> {l.reject_reason}
                  </div>
                )}

                {/* Review Actions */}
                {canReview && l.status === 'pending' && (
                  <div className="flex flex-wrap items-center gap-2.5 pt-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleApprove(l.id)}
                      disabled={actionLoading === l.id}
                      className="gap-1.5"
                    >
                      <Check size={16} weight="bold" />
                      <span>{actionLoading === l.id ? 'Approving...' : 'Approve Driver'}</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      onClick={() => setRejectId(rejectId === l.id ? null : l.id)}
                      disabled={actionLoading === l.id}
                      className="gap-1.5"
                    >
                      <X size={16} weight="bold" />
                      <span>Reject Document</span>
                    </Button>
                  </div>
                )}

                {/* Rejection Drawer / Form */}
                {rejectId === l.id && (
                  <div className="flex flex-col sm:flex-row gap-2.5 pt-2 p-3 rounded-xs border border-danger/30 bg-danger-subtle/30">
                    <div className="flex-1">
                      <TextField
                        placeholder="State reason for rejecting licence document..."
                        value={rejectReason}
                        onChange={setRejectReason}
                        aria-label="Rejection reason"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      onClick={() => void handleConfirmReject(l.id)}
                      disabled={actionLoading === l.id}
                    >
                      Confirm Reject
                    </Button>
                  </div>
                )}
              </div>

              {/* Right Column: Document Viewer Thumbnail Cards */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-caption text-text-3">
                  <span>Licence Document Front</span>
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewDoc({
                        url: l.frontUrl,
                        title: `Driving Licence (Front) — ${l.driver_name}`,
                      })
                    }
                    className="inline-flex items-center gap-1 text-accent hover:underline cursor-pointer"
                  >
                    <MagnifyingGlassPlus size={14} weight="bold" />
                    <span>Enlarge</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setPreviewDoc({
                      url: l.frontUrl,
                      title: `Driving Licence (Front) — ${l.driver_name}`,
                    })
                  }
                  className="relative group h-40 w-full overflow-hidden rounded-xs border border-border bg-surface-sunken cursor-pointer text-left"
                >
                  <img
                    src={l.frontUrl}
                    alt={`Driving licence front for ${l.driver_name}`}
                    className="h-full w-full object-cover transition-transform duration-200 "
                  />
                  <div className="absolute inset-0 bg-[rgb(var(--shadow-ink)/0.3)] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="rounded-xs bg-surface/90 px-2 py-1 text-label-s font-semibold text-text-1">
                      Click to inspect
                    </span>
                  </div>
                </button>

                {l.backUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewDoc({
                        url: l.backUrl as string,
                        title: `Driving Licence (Back) — ${l.driver_name}`,
                      })
                    }
                    className="inline-flex items-center gap-1.5 text-label-s text-text-2 hover:text-accent cursor-pointer pt-1"
                  >
                    <MagnifyingGlassPlus size={14} weight="bold" />
                    <span>View Reverse Side Document</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* High-Resolution Document Inspection Modal */}
      <Dialog
        open={previewDoc !== null}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
        title={previewDoc?.title}
        description="Verify document hologram, RTO seal, validity period, and driver photo match."
        className="max-w-3xl"
      >
        {previewDoc && (
          <div className="flex items-center justify-center p-2 bg-surface-sunken rounded-xs overflow-hidden max-h-full">
            <img
              src={previewDoc.url}
              alt={previewDoc.title}
              className="max-h-full w-auto object-contain rounded-xs border border-border"
            />
          </div>
        )}
      </Dialog>
    </div>
  );
}
