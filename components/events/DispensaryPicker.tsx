"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DispensaryOption } from "@/lib/events/types";

/**
 * Dispensary autocomplete (D-002): options are PSM retail accounts mirrored into
 * `dispensaries`. Picking one sends its PSM account id (exact CRM link) and
 * fills Town/City; "Not listed" switches to free text. Field names match
 * lib/events/actions.rsvpAction.
 */
export function DispensaryPicker({
  options,
  errors,
  defaults,
}: {
  options: DispensaryOption[];
  errors?: Record<string, string>;
  defaults?: { name?: string; city?: string };
}) {
  const listId = useId();
  const [query, setQuery] = useState(defaults?.name ?? "");
  const [picked, setPicked] = useState<DispensaryOption | null>(null);
  const [manual, setManual] = useState(options.length === 0);
  const [city, setCity] = useState(defaults?.city ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const words = q.split(/\s+/);
    return options
      .filter((o) => {
        const hay = `${o.name} ${o.city}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      })
      .slice(0, 8);
  }, [query, options]);

  function choose(o: DispensaryOption) {
    setPicked(o);
    setQuery(o.name);
    setCity(o.city);
    setOpen(false);
  }

  if (manual) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="dispensaryName">Dispensary name</Label>
          <Input id="dispensaryName" name="dispensaryName" required maxLength={120} defaultValue={defaults?.name} className="h-11" aria-invalid={Boolean(errors?.dispensaryName)} />
          {errors?.dispensaryName && <p className="text-xs text-red-600">{errors.dispensaryName}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dispensaryCity">Town / city</Label>
          <Input id="dispensaryCity" name="dispensaryCity" required maxLength={80} defaultValue={defaults?.city} className="h-11" aria-invalid={Boolean(errors?.dispensaryCity)} />
          {errors?.dispensaryCity && <p className="text-xs text-red-600">{errors.dispensaryCity}</p>}
        </div>
        {options.length > 0 && (
          <button type="button" onClick={() => setManual(false)} className="justify-self-start text-sm text-neutral-600 underline underline-offset-4 md:col-span-2">
            Search the list instead
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="relative space-y-1.5">
        <Label htmlFor="dispensarySearch">Dispensary name</Label>
        <Input
          ref={inputRef}
          id="dispensarySearch"
          name="dispensaryName"
          required
          autoComplete="off"
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={Boolean(errors?.dispensaryName)}
          placeholder="Start typing, e.g. Sunnyside Wrigleyville"
          value={query}
          className="h-11"
          onChange={(e) => {
            setQuery(e.target.value);
            setPicked(null);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (!open || matches.length === 0) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            if (e.key === "Enter") { e.preventDefault(); choose(matches[active]); }
            if (e.key === "Escape") setOpen(false);
          }}
        />
        <input type="hidden" name="dispensaryId" value={picked?.id ?? ""} />
        {open && matches.length > 0 && (
          <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-lg border border-hairline bg-white py-1 shadow-lg">
            {matches.map((o, i) => (
              <li
                key={o.id}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => { e.preventDefault(); choose(o); }}
                onMouseEnter={() => setActive(i)}
                className={`cursor-pointer px-3 py-2 text-sm ${i === active ? "bg-neutral-100" : ""}`}
              >
                <span className="font-medium text-ink">{o.name}</span>
                {o.city && <span className="text-neutral-500"> · {o.city}</span>}
              </li>
            ))}
          </ul>
        )}
        {errors?.dispensaryName && <p className="text-xs text-red-600">{errors.dispensaryName}</p>}
        {query.trim().length >= 2 && !picked && matches.length === 0 && (
          <p className="text-xs text-neutral-500">No match in our list. That&apos;s fine, just keep typing the full name.</p>
        )}
        <button type="button" onClick={() => setManual(true)} className="text-xs text-neutral-600 underline underline-offset-4">
          My dispensary isn&apos;t listed
        </button>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dispensaryCity">Town / city</Label>
        <Input
          id="dispensaryCity"
          name="dispensaryCity"
          required
          maxLength={80}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="h-11"
          aria-invalid={Boolean(errors?.dispensaryCity)}
        />
        {errors?.dispensaryCity && <p className="text-xs text-red-600">{errors.dispensaryCity}</p>}
      </div>
    </div>
  );
}
