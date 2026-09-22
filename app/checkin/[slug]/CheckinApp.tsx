"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import jsQR from "jsqr";
import { checkinLookup, checkinStats, checkinStep, type CheckinRecord } from "@/lib/events/admin-actions";

type Stats = { rsvps: number; checkedIn: number; plates: number; redeemed: number } | null;

/** Camera QR scanner (jsQR on a canvas, works on iPhone Safari and Android Chrome). */
function Scanner({ onCode, onClose }: { onCode: (text: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        const tick = () => {
          if (stopped) return;
          const canvas = canvasRef.current!;
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
            if (code?.data) {
              stopped = true;
              onCode(code.data);
              return;
            }
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setError("Camera unavailable. Allow camera access in your browser, or search by name.");
      }
    })();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onCode]);

  return (
    <div className="mt-4">
      {error ? (
        <p className="rounded bg-red-950 p-3 text-sm text-red-200">{error}</p>
      ) : (
        <div className="relative overflow-hidden rounded-lg border border-white/20">
          <video ref={videoRef} playsInline muted className="w-full" />
          <div className="pointer-events-none absolute inset-[15%] rounded-lg border-4 border-kb-yellow/80" />
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
      <button type="button" onClick={onClose} className="mt-3 w-full rounded border border-white/30 py-3 text-sm uppercase tracking-wide">
        Stop scanning
      </button>
    </div>
  );
}

function Step({ done, label, doneLabel, disabled, onClick }: { done: boolean; label: string; doneLabel: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={done || disabled}
      onClick={onClick}
      className={`w-full rounded-lg py-4 font-condensed text-xl font-bold uppercase tracking-wide transition ${
        done ? "bg-green-700 text-white" : disabled ? "bg-neutral-800 text-neutral-500" : "bg-kb-yellow text-black active:scale-[0.99]"
      }`}
    >
      {done ? `✓ ${doneLabel}` : label}
    </button>
  );
}

function Card({ r, onStep, pending }: { r: CheckinRecord; onStep: (step: "check_in" | "verify_badge" | "redeem_plate") => void; pending: boolean }) {
  const cancelled = r.status !== "confirmed";
  return (
    <div className={`mt-4 rounded-xl border-2 p-5 ${cancelled ? "border-red-500" : r.isBudtender ? "border-kb-yellow" : "border-white/30"}`}>
      <p className="font-condensed text-3xl font-bold uppercase leading-tight">{r.name}</p>
      <p className="text-sm text-neutral-400">{r.email}</p>
      {cancelled && <p className="mt-2 font-bold uppercase text-red-400">RSVP cancelled</p>}
      {r.isBudtender && (
        <div className="mt-3 rounded bg-white/10 p-3">
          <p className="font-condensed text-lg font-bold uppercase text-kb-yellow">Budtender</p>
          <p className="text-sm">{r.dispensary}</p>
          <p className="mt-1 text-sm">
            Plate:{" "}
            {r.plateStatus === "confirmed" ? <strong>RESERVED</strong> : r.plateStatus === "waitlisted" ? `waitlist #${r.waitlistPosition ?? "?"} (no plate)` : "none"}
          </p>
        </div>
      )}
      {!cancelled && (
        <div className="mt-4 space-y-3">
          <Step done={Boolean(r.checkedInAt)} label="Check in" doneLabel="Checked in" disabled={pending} onClick={() => onStep("check_in")} />
          {r.isBudtender && (
            <>
              <p className="text-xs text-neutral-400">Look at their IDFPR dispensary agent badge: valid, not expired, name matches their photo ID.</p>
              <Step done={Boolean(r.badgeVerifiedAt)} label="IDFPR badge verified" doneLabel="Badge verified" disabled={pending} onClick={() => onStep("verify_badge")} />
            </>
          )}
          {r.isBudtender && r.plateStatus === "confirmed" && (
            <Step done={Boolean(r.plateRedeemedAt)} label="Give BBQ plate" doneLabel="Plate given" disabled={pending || !r.badgeVerifiedAt} onClick={() => onStep("redeem_plate")} />
          )}
        </div>
      )}
    </div>
  );
}

export function CheckinApp({ slug }: { slug: string }) {
  const [pending, start] = useTransition();
  const [scanning, setScanning] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CheckinRecord[]>([]);
  const [selected, setSelected] = useState<CheckinRecord | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [stats, setStats] = useState<Stats>(null);

  const loadStats = useCallback(() => {
    checkinStats(slug).then(setStats).catch(() => {});
  }, [slug]);
  useEffect(() => {
    loadStats();
    const t = setInterval(loadStats, 30_000);
    return () => clearInterval(t);
  }, [loadStats]);

  const lookup = useCallback(
    (q: string) => {
      setMsg(null);
      start(async () => {
        const rows = await checkinLookup(slug, q);
        setResults(rows);
        if (rows.length === 1) setSelected(rows[0]);
        else setSelected(null);
        if (rows.length === 0) setMsg({ ok: false, text: q.match(/[0-9a-f]{48}/) ? "Ticket not found for this event." : "No one found." });
      });
    },
    [slug],
  );

  const onCode = useCallback(
    (text: string) => {
      setScanning(false);
      lookup(text);
    },
    [lookup],
  );

  function step(s: "check_in" | "verify_badge" | "redeem_plate") {
    if (!selected) return;
    start(async () => {
      const r = await checkinStep(selected.id, s);
      setMsg({ ok: r.ok, text: r.message });
      if (r.record) setSelected(r.record);
      loadStats();
    });
  }

  return (
    <div>
      {stats && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
          <div className="rounded bg-white/10 p-2"><p className="text-2xl font-bold">{stats.checkedIn}</p><p className="text-xs text-neutral-400">of {stats.rsvps} checked in</p></div>
          <div className="rounded bg-white/10 p-2"><p className="text-2xl font-bold">{stats.redeemed}</p><p className="text-xs text-neutral-400">of {stats.plates} plates given</p></div>
        </div>
      )}

      {scanning ? (
        <Scanner onCode={onCode} onClose={() => setScanning(false)} />
      ) : (
        <button type="button" onClick={() => { setSelected(null); setResults([]); setMsg(null); setScanning(true); }} className="mt-4 w-full rounded-lg bg-white py-4 font-condensed text-xl font-bold uppercase text-black">
          Scan ticket QR
        </button>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          lookup(query);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Or search name / email"
          className="h-12 flex-1 rounded-lg border border-white/20 bg-white/5 px-3 text-base text-white placeholder:text-neutral-500"
          autoCapitalize="words"
          autoCorrect="off"
        />
        <button type="submit" disabled={pending} className="rounded-lg border border-white/30 px-4 text-sm uppercase">Find</button>
      </form>

      {msg && <p className={`mt-3 rounded p-3 text-sm ${msg.ok ? "bg-green-950 text-green-200" : "bg-red-950 text-red-200"}`}>{msg.text}</p>}

      {!selected && results.length > 1 && (
        <ul className="mt-3 divide-y divide-white/10 rounded-lg border border-white/10">
          {results.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => setSelected(r)} className="flex w-full items-center justify-between px-3 py-3 text-left">
                <span>
                  <span className="font-semibold">{r.name}</span>
                  <span className="block text-xs text-neutral-400">{r.email}</span>
                </span>
                <span className="text-xs">
                  {r.status !== "confirmed" ? "cancelled" : r.checkedInAt ? "✓ in" : ""}
                  {r.isBudtender && <span className="ml-2 text-kb-yellow">budtender</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && <Card r={selected} onStep={step} pending={pending} />}
      {selected && (
        <button type="button" onClick={() => { setSelected(null); setResults([]); setQuery(""); setMsg(null); }} className="mt-4 w-full rounded-lg border border-white/30 py-3 text-sm uppercase tracking-wide">
          Next guest
        </button>
      )}

      <p className="mt-10 text-center text-xs text-neutral-500">
        Walk-ups: have them RSVP on their phone at <strong>privatestock.co/events/{slug}</strong>, then scan their ticket.
      </p>
    </div>
  );
}
