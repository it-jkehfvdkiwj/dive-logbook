"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormSection } from "@/components/common/field";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import { speciesInputSchema } from "@/lib/validation/species";
import { fieldErrorsOf, type FieldErrors } from "@/lib/validation/common";
import type { SpeciesSummary } from "@/types";
import { CategorySelect } from "./category-select";
import { SpeciesAvatar } from "./species-avatar";

export interface SpeciesFormValues {
  commonName: string;
  scientificName: string;
  category: string;
  description: string;
  imageUrl: string;
}

interface SpeciesFormProps {
  mode: "create" | "edit";
  speciesId?: string;
  initial: SpeciesFormValues;
  cancelHref: string;
}

export function SpeciesForm({ mode, speciesId, initial, cancelHref }: SpeciesFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const bind = (key: keyof SpeciesFormValues) => ({
    id: key,
    name: key,
    value: values[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value })),
    "aria-invalid": errors[key] ? true : undefined,
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setExistingId(null);
    const parsed = speciesInputSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrorsOf(parsed.error));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const res =
        mode === "create"
          ? await api.post<SpeciesSummary>("/api/species", parsed.data)
          : await api.put<SpeciesSummary>(`/api/species/${speciesId}`, parsed.data);
      router.replace(`/marine-life/${res.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrors(err.fieldErrors);
        const details = err.details as { field?: string; existingId?: string } | undefined;
        if (err.code === "conflict" && details?.field) {
          setErrors({ [details.field]: [err.message] });
          setExistingId(details.existingId ?? null);
        }
      }
      setFormError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex items-center gap-4 px-1">
        <SpeciesAvatar category={values.category} imageUrl={/^https?:\/\//.test(values.imageUrl) ? values.imageUrl : null} size="lg" />
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold">{values.commonName || "New species"}</div>
          <div className="truncate text-sm italic text-muted-foreground">{values.scientificName || "Scientific name"}</div>
        </div>
      </div>

      <FormSection title="Species">
        <Field id="commonName" label="Common name" error={errors.commonName} className="sm:col-span-2">
          <Input autoCapitalize="words" placeholder="e.g. Scalloped Hammerhead" {...bind("commonName")} />
        </Field>
        <Field id="scientificName" label="Scientific name" error={errors.scientificName} hint="Must be unique.">
          <Input autoCapitalize="off" autoCorrect="off" className="italic" placeholder="e.g. Sphyrna lewini" {...bind("scientificName")} />
        </Field>
        <Field id="category" label="Category" error={errors.category}>
          <CategorySelect {...bind("category")} />
        </Field>
        <Field id="imageUrl" label="Image URL" error={errors.imageUrl} className="sm:col-span-2">
          <Input type="url" inputMode="url" autoCapitalize="off" placeholder="https://…" {...bind("imageUrl")} />
        </Field>
        <Field id="description" label="Description" error={errors.description} className="sm:col-span-2">
          <Textarea rows={4} {...bind("description")} />
        </Field>
      </FormSection>

      {formError && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {formError}{" "}
          {existingId && (
            <Link href={`/marine-life/${existingId}`} className="underline">
              Open existing species
            </Link>
          )}
        </p>
      )}

      <div className="sticky bottom-[calc(58px+env(safe-area-inset-bottom)+8px)] z-10 -mx-1 flex gap-2 rounded-2xl border border-border/60 bg-background/90 p-2 backdrop-blur-xl lg:bottom-4">
        <Button variant="secondary" className="flex-1" onClick={() => router.push(cancelHref)} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving && <Loader2 className="animate-spin" />}
          {mode === "create" ? "Add species" : "Save"}
        </Button>
      </div>
    </form>
  );
}
