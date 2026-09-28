"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LocateFixed, Map as MapIcon, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Field, FormSection } from "@/components/common/field";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { LocationPicker, type PickedLocation } from "@/components/map/location-picker";
import {
  CONDITIONS_OPTIONS,
  CURRENT_OPTIONS,
  DIVE_TYPE_OPTIONS,
  ENTRY_TYPE_OPTIONS,
  WEATHER_OPTIONS,
} from "@/lib/dive-options";
import { diveInputSchema } from "@/lib/validation/dive";
import { fieldErrorsOf, type FieldErrors } from "@/lib/validation/common";
import { NUMBER_FIELDS, type DiveFormValues, type TextKey } from "@/lib/dive-form-values";

/** Formularwerte (Strings) → API-Payload (Zahlen/null). */
function toPayload(v: DiveFormValues) {
  const payload: Record<string, unknown> = { ...v };
  for (const key of NUMBER_FIELDS) {
    const raw = v[key].trim().replace(",", ".");
    payload[key] = raw === "" ? null : Number(raw);
  }
  payload.startTime = v.startTime || null;
  return payload;
}

interface DiveFormProps {
  mode: "create" | "edit";
  diveId?: string;
  initial: DiveFormValues;
  suggestions: { countries: string[]; locations: string[]; diveTypes: string[] };
}

export function DiveForm({ mode, diveId, initial, suggestions }: DiveFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [locating, setLocating] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const currentPoint = (() => {
    const lat = Number(values.latitude.replace(",", "."));
    const lng = Number(values.longitude.replace(",", "."));
    return values.latitude.trim() && values.longitude.trim() && Number.isFinite(lat) && Number.isFinite(lng)
      ? { latitude: lat, longitude: lng }
      : null;
  })();

  function applyPicked(loc: PickedLocation) {
    setValues((prev) => ({
      ...prev,
      latitude: loc.latitude.toFixed(5),
      longitude: loc.longitude.toFixed(5),
      country: prev.country.trim() ? prev.country : (loc.country ?? ""),
    }));
  }

  async function fillCountry(latitude: number, longitude: number) {
    try {
      const res = await api.get<{ country: string | null }>(`/api/geo/country?lat=${latitude}&lng=${longitude}`);
      if (res.country) setValues((prev) => (prev.country.trim() ? prev : { ...prev, country: res.country! }));
    } catch {
      /* Land bleibt leer */
    }
  }

  const set = (key: TextKey) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((prev) => ({ ...prev, [key]: e.target.value }));

  const err = (key: string) => errors[key];
  const inputProps = (key: TextKey) => ({
    id: key,
    name: key,
    value: values[key],
    onChange: set(key),
    "aria-invalid": err(key) ? true : undefined,
    "aria-describedby": err(key) ? `${key}-error` : undefined,
  });
  const decimal = { type: "text", inputMode: "decimal" as const, autoComplete: "off" };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = diveInputSchema.safeParse(toPayload(values));
    if (!parsed.success) {
      setErrors(fieldErrorsOf(parsed.error));
      setFormError("Please check the highlighted fields.");
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const res =
        mode === "create"
          ? await api.post<{ id: string }>("/api/dives", parsed.data)
          : await api.put<{ id: string }>(`/api/dives/${diveId}`, parsed.data);
      router.replace(`/dives/${res.id}`);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) setErrors(error.fieldErrors);
      setFormError(errorMessage(error));
      setSaving(false);
    }
  }

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setFormError("Location is not available on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValues((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(5),
          longitude: pos.coords.longitude.toFixed(5),
        }));
        setLocating(false);
        void fillCountry(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setFormError("Could not get your location. Check the location permission.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormSection title="Basic">
        <Field id="date" label="Date" error={err("date")}>
          <Input type="date" required {...inputProps("date")} />
        </Field>
        <Field id="startTime" label="Time" error={err("startTime")}>
          <Input type="time" {...inputProps("startTime")} />
        </Field>
        <Field id="diveNumber" label="Dive number" error={err("diveNumber")}>
          <Input type="text" inputMode="numeric" placeholder="e.g. 128" {...inputProps("diveNumber")} />
        </Field>
      </FormSection>

      <FormSection title="Location">
        <Field id="siteName" label="Dive site" error={err("siteName")} className="sm:col-span-2">
          <Input placeholder="e.g. Protea Banks" autoCapitalize="words" required {...inputProps("siteName")} />
        </Field>
        <Field id="location" label="Location" error={err("location")}>
          <Input list="location-options" placeholder="e.g. Shelly Beach" autoCapitalize="words" {...inputProps("location")} />
          <datalist id="location-options">
            {suggestions.locations.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </Field>
        <Field id="country" label="Country" error={err("country")}>
          <Input list="country-options" placeholder="e.g. South Africa" autoCapitalize="words" {...inputProps("country")} />
          <datalist id="country-options">
            {suggestions.countries.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field id="latitude" label="Latitude" error={err("latitude")}>
          <Input {...decimal} placeholder="-30.8350" {...inputProps("latitude")} />
        </Field>
        <Field id="longitude" label="Longitude" error={err("longitude")}>
          <Input {...decimal} placeholder="30.5180" {...inputProps("longitude")} />
        </Field>
        <div id="location" className="flex scroll-mt-24 flex-wrap gap-2 sm:col-span-2">
          <Button variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
            <MapIcon />
            {currentPoint ? "Adjust on map" : "Pick on map"}
          </Button>
          <Button variant="secondary" size="sm" onClick={useCurrentLocation} disabled={locating}>
            {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />}
            Use current location
          </Button>
        </div>
        <LocationPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          title={values.siteName.trim() || "Dive site location"}
          initial={currentPoint}
          onSave={applyPicked}
        />
      </FormSection>

      <FormSection title="Dive">
        <Field id="maxDepth" label="Max depth (m)" error={err("maxDepth")}>
          <Input {...decimal} placeholder="24.7" {...inputProps("maxDepth")} />
        </Field>
        <Field id="avgDepth" label="Average depth (m)" error={err("avgDepth")}>
          <Input {...decimal} placeholder="16.2" {...inputProps("avgDepth")} />
        </Field>
        <Field id="duration" label="Duration (min)" error={err("duration")}>
          <Input type="text" inputMode="numeric" placeholder="48" {...inputProps("duration")} />
        </Field>
        <Field id="waterTemperature" label="Water temperature (°C)" error={err("waterTemperature")}>
          <Input {...decimal} placeholder="23" {...inputProps("waterTemperature")} />
        </Field>
        <Field id="visibility" label="Visibility (m)" error={err("visibility")}>
          <Input {...decimal} placeholder="15" {...inputProps("visibility")} />
        </Field>
        <Field id="conditions" label="Water conditions" error={err("conditions")}>
          <Input list="conditions-options" placeholder="e.g. Calm" {...inputProps("conditions")} />
          <datalist id="conditions-options">
            {CONDITIONS_OPTIONS.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </Field>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-sm font-medium text-foreground/90">Current</span>
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-secondary p-1" role="radiogroup" aria-label="Current">
            {CURRENT_OPTIONS.map((option) => {
              const active = values.current === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setValues((prev) => ({ ...prev, current: active ? "" : option }))}
                  className={cn(
                    "h-10 rounded-lg text-sm font-medium transition-all",
                    active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        <Field id="weather" label="Weather" error={err("weather")}>
          <Input list="weather-options" placeholder="e.g. Sunny" {...inputProps("weather")} />
          <datalist id="weather-options">
            {WEATHER_OPTIONS.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </Field>
        <Field id="entryType" label="Entry type" error={err("entryType")}>
          <Input list="entry-options" placeholder="e.g. Boat – backroll" {...inputProps("entryType")} />
          <datalist id="entry-options">
            {ENTRY_TYPE_OPTIONS.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </Field>
        <Field id="diveType" label="Dive type" error={err("diveType")}>
          <Input list="divetype-options" placeholder="e.g. Reef" {...inputProps("diveType")} />
          <datalist id="divetype-options">
            {[...new Set([...DIVE_TYPE_OPTIONS, ...suggestions.diveTypes])].map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </Field>
      </FormSection>

      <FormSection title="People">
        <Field id="buddy" label="Buddy" error={err("buddy")}>
          <Input autoCapitalize="words" {...inputProps("buddy")} />
        </Field>
        <Field id="diveCenter" label="Dive center" error={err("diveCenter")}>
          <Input autoCapitalize="words" {...inputProps("diveCenter")} />
        </Field>
      </FormSection>

      <FormSection title="Other">
        <Field id="notes" label="Notes" error={err("notes")} className="sm:col-span-2">
          <Textarea rows={5} placeholder="What made this dive special?" {...inputProps("notes")} />
        </Field>
        <label
          htmlFor="favorite"
          className="flex items-center justify-between gap-3 rounded-xl bg-secondary px-4 py-3 sm:col-span-2"
        >
          <span className="flex items-center gap-2 text-[15px] font-medium">
            <Star className={cn("size-5", values.favorite ? "fill-star text-star" : "text-muted-foreground")} />
            Favorite dive
          </span>
          <Switch
            id="favorite"
            checked={values.favorite}
            onCheckedChange={(favorite) => setValues((prev) => ({ ...prev, favorite }))}
          />
        </label>
      </FormSection>

      {formError && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {formError}
        </p>
      )}

      <div className="sticky bottom-[calc(58px+env(safe-area-inset-bottom)+8px)] z-10 -mx-1 flex gap-2 rounded-2xl border border-border/60 bg-background/90 p-2 backdrop-blur-xl lg:bottom-4">
        {mode === "edit" && (
          <Button variant="destructive-ghost" size="icon" onClick={() => setConfirmDelete(true)} aria-label="Delete dive">
            <Trash2 />
          </Button>
        )}
        <Button variant="secondary" className="flex-1" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving && <Loader2 className="animate-spin" />}
          {mode === "create" ? "Save dive" : "Save"}
        </Button>
      </div>

      {mode === "edit" && diveId && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete this dive?"
          description="The dive and all of its marine life sightings and photos will be permanently deleted. Species stay in your database."
          confirmLabel="Delete dive"
          onConfirm={async () => {
            await api.delete(`/api/dives/${diveId}`);
            router.replace("/dives");
            router.refresh();
          }}
        />
      )}
    </form>
  );
}
