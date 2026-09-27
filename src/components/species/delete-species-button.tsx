"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { api } from "@/lib/api-client";
import { pluralize } from "@/lib/format";

export function DeleteSpeciesButton({ speciesId, name, sightingCount }: { speciesId: string; name: string; sightingCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="destructive-ghost" onClick={() => setOpen(true)}>
        <Trash2 /> Delete species
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete ${name}?`}
        description={
          sightingCount > 0 ? (
            <div className="space-y-2">
              <p className="font-medium text-destructive">
                Warning: this species has {pluralize(sightingCount, "sighting")}.
              </p>
              <p>Deleting it also removes it from every dive it was logged on and from your life list.</p>
            </div>
          ) : (
            "This species has no sightings and will be removed from your database."
          )
        }
        confirmLabel={sightingCount > 0 ? "Delete anyway" : "Delete"}
        onConfirm={async () => {
          await api.delete(`/api/species/${speciesId}`);
          router.replace("/marine-life");
          router.refresh();
        }}
      />
    </>
  );
}
