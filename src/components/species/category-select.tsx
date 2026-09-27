import { NativeSelect } from "@/components/ui/native-select";
import { SPECIES_CATEGORIES } from "@/lib/categories";

export function CategorySelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const known = SPECIES_CATEGORIES.some((c) => c.value === props.value);
  return (
    <NativeSelect {...props}>
      {!known && props.value ? <option value={String(props.value)}>{String(props.value)}</option> : null}
      {SPECIES_CATEGORIES.map((c) => (
        <option key={c.value} value={c.value}>
          {c.emoji} {c.value}
        </option>
      ))}
    </NativeSelect>
  );
}
