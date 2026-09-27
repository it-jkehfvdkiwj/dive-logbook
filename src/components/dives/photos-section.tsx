"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/common/field";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import type { DivePhotoItem } from "@/types";

/**
 * Fotos per URL. Ein echter Upload (S3/R2/iCloud) kann später ergänzt werden,
 * das Datenmodell (DivePhoto) bleibt dabei gleich.
 */
export function PhotosSection({ diveId, photos }: { diveId: string; photos: DivePhotoItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<DivePhotoItem | null>(null);
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function add() {
    setPending(true);
    setError(null);
    try {
      await api.post(`/api/dives/${diveId}/photos`, { url, caption: caption || null });
      setOpen(false);
      setUrl("");
      setCaption("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError && err.fieldErrors.url ? err.fieldErrors.url[0] : errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function remove(photo: DivePhotoItem) {
    setPending(true);
    try {
      await api.delete(`/api/photos/${photo.id}`);
      setViewing(null);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[20px] font-bold tracking-tight">Photos</h2>
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          <ImagePlus /> Add
        </Button>
      </div>

      {photos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-[14px] text-muted-foreground">
          No photos yet. Add a photo link to use it as the cover for this dive.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {photos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setViewing(p)}
              className="relative aspect-square overflow-hidden rounded-xl bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- externe Foto-URLs */}
              <img src={p.url} alt={p.caption ?? ""} className="size-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add photo</DialogTitle>
            <DialogDescription>Paste a link to an image (https://…).</DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <Field id="photo-url" label="Image URL">
              <Input id="photo-url" type="url" inputMode="url" autoCapitalize="off" value={url} onChange={(e) => setUrl(e.target.value)} />
            </Field>
            <Field id="photo-caption" label="Caption (optional)">
              <Input id="photo-caption" value={caption} onChange={(e) => setCaption(e.target.value)} />
            </Field>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </DialogBody>
          <DialogFooter>
            <Button onClick={add} disabled={pending || !url.trim()}>
              {pending && <Loader2 className="animate-spin" />}
              Add photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent>
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>{viewing.caption || "Photo"}</DialogTitle>
              </DialogHeader>
              <DialogBody>
                {/* eslint-disable-next-line @next/next/no-img-element -- externe Foto-URLs */}
                <img src={viewing.url} alt={viewing.caption ?? ""} className="w-full rounded-2xl" />
              </DialogBody>
              <DialogFooter>
                <Button variant="destructive-ghost" onClick={() => remove(viewing)} disabled={pending}>
                  <Trash2 /> Delete photo
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
