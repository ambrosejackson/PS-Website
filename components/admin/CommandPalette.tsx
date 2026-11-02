"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Admin ⌘K / Ctrl+K palette (D-142). Static entries for every admin page plus
 * a debounced live search (≥ 2 chars) through POST /api/admin/search. Built on
 * the existing Dialog with a plain list and arrow-key navigation — no cmdk.
 * The sidebar's Search box opens it via `openCommandPalette()`.
 */

interface Item {
  label: string;
  hint?: string;
  href: string;
}

interface Group {
  key: string;
  label: string;
  items: Item[];
}

const PAGES: Item[] = [
  { label: "Home", href: "/admin" },
  { label: "Analytics", href: "/admin/analytics" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Customers", href: "/admin/customers" },
  { label: "Discounts", href: "/admin/discounts" },
  { label: "New discount codes", href: "/admin/discounts/new" },
  { label: "Products", href: "/admin/products" },
  { label: "New product", href: "/admin/products/new" },
  { label: "Apparel", href: "/admin/apparel" },
  { label: "New apparel", href: "/admin/apparel/new" },
  { label: "Apparel collections", href: "/admin/apparel/collections" },
  { label: "Apparel home", href: "/admin/apparel/home" },
  { label: "Heroes", href: "/admin/heroes" },
  { label: "Banners", href: "/admin/banners" },
  { label: "Blog", href: "/admin/blog" },
  { label: "New blog post", href: "/admin/blog/new" },
  { label: "Social Media", href: "/admin/social-media" },
  { label: "Subscribers", href: "/admin/subscribers" },
  { label: "Messages", href: "/admin/messages" },
  { label: "Events", href: "/admin/events" },
  { label: "Check-in Staff", href: "/admin/staff" },
];

const OPEN_EVENT = "admin:open-palette";
const DEBOUNCE_MS = 200;
const MIN_CHARS = 2;

/** Open the palette from anywhere in the admin (the sidebar Search box uses this). */
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState<{ q: string; groups: Group[] }>({ q: "", groups: [] });
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  const setOpenAndReset = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery("");
      setActive(0);
    }
  }, []);

  // Global shortcut + the sidebar's custom event.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  // Debounced live search; stale responses are dropped by sequence number.
  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < MIN_CHARS) return;
    const id = ++seq.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q }),
        });
        const body = (await res.json().catch(() => ({}))) as { groups?: Group[] };
        if (id === seq.current) setRemote({ q, groups: res.ok ? (body.groups ?? []) : [] });
      } catch {
        if (id === seq.current) setRemote({ q, groups: [] });
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [open, query]);

  const q = query.trim().toLowerCase();
  const pages = q ? PAGES.filter((p) => p.label.toLowerCase().includes(q)) : PAGES;
  const remoteGroups = q.length >= MIN_CHARS && remote.q.toLowerCase() === q ? remote.groups : [];
  const groups: Group[] = [...(pages.length > 0 ? [{ key: "pages", label: "Pages", items: pages }] : []), ...remoteGroups];
  const flat: Item[] = groups.flatMap((g) => g.items);
  const activeIndex = Math.min(active, Math.max(0, flat.length - 1));
  const searching = q.length >= MIN_CHARS && (loading || remote.q.toLowerCase() !== q);

  function go(item: Item) {
    setOpenAndReset(false);
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (flat.length === 0 ? 0 : (Math.min(i, flat.length - 1) + 1) % flat.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (flat.length === 0 ? 0 : (Math.min(i, flat.length - 1) - 1 + flat.length) % flat.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[activeIndex];
      if (item) go(item);
    }
  }

  // Keep the active row in view while arrowing.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  let runningIndex = -1;

  return (
    <Dialog open={open} onOpenChange={setOpenAndReset}>
      <DialogContent
        showCloseButton={false}
        className="top-[12%] gap-0 overflow-hidden p-0 sm:max-w-lg"
        initialFocus={inputRef}
      >
        <DialogTitle className="sr-only">Search the admin</DialogTitle>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 shrink-0 text-neutral-400" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search pages, orders, customers, products, codes…"
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
            role="combobox"
            aria-expanded
            aria-controls="admin-palette-list"
            aria-activedescendant={flat.length > 0 ? `admin-palette-item-${activeIndex}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
          />
          {searching && <span className="text-xs text-neutral-400">…</span>}
        </div>
        <div ref={listRef} id="admin-palette-list" role="listbox" className="max-h-[60vh] overflow-y-auto py-1">
          {flat.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-neutral-400">
              {q.length < MIN_CHARS ? "Type at least two characters to search records." : searching ? "Searching…" : "No matches."}
            </p>
          )}
          {groups.map((g) => (
            <div key={g.key}>
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{g.label}</p>
              {g.items.map((item) => {
                runningIndex += 1;
                const idx = runningIndex;
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={`${g.key}:${item.href}`}
                    type="button"
                    id={`admin-palette-item-${idx}`}
                    data-index={idx}
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => go(item)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm",
                      isActive ? "bg-neutral-100" : "hover:bg-neutral-50",
                    )}
                  >
                    <span className="truncate">{item.label}</span>
                    {item.hint && <span className="shrink-0 text-xs text-neutral-500">{item.hint}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t px-3 py-1.5 text-[11px] text-neutral-400">
          <span>↑↓ to move · Enter to open · Esc to close</span>
          <kbd className="rounded border px-1 font-mono">⌘K</kbd>
        </div>
      </DialogContent>
    </Dialog>
  );
}
