"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { api } from "@/lib/api-client";
import { pluralize } from "@/lib/format";

export function DemoDataPanel({ demoDives }: { demoDives: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (demoDives === 0) {
    return <p className="text-[14px] text-muted-foreground">No demo data present.</p>;
  }
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[14px] text-muted-foreground">{pluralize(demoDives, "demo dive")} with sightings.</p>
        <Button variant="destructive-ghost" size="sm" onClick={() => setOpen(true)}>
          <Trash2 /> Remove
        </Button>
      </div>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Remove demo data?"
        description="All demo dives and their sightings are deleted. Your own dives and the species catalog stay untouched."
        confirmLabel="Remove demo data"
        onConfirm={async () => {
          await api.delete("/api/demo-data");
          router.refresh();
        }}
      />
    </>
  );
}
