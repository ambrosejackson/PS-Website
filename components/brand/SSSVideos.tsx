"use client";

import { useConsent } from "@/components/site/ConsentProvider";

/**
 * LONG LIVE FREDO video wall — youtube-nocookie embeds, consent-gated
 * (guardrail #6: no third-party scripts/frames before cookie consent).
 */
const VIDEOS = [
  { id: "5T5F8DPsejs", title: 'Fredo Santana ft. Chief Keef & Lil Reese — "My Lil Niggas"' },
  { id: "VnTKrEMDyU0", title: 'Fredo Santana — "Trapper Of The Year"' },
  { id: "lmKW3yLbOUw", title: 'Fredo Santana — "Been Savage"' },
  { id: "qlNorL7bweQ", title: 'Fredo Santana — "Better Play It Smart"' },
];

export function SSSVideos() {
  const consent = useConsent();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {VIDEOS.map((v) => (
        <div
          key={v.id}
          className="overflow-hidden rounded-lg border border-white/10 bg-[#17130f]"
        >
          {consent === "accepted" ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${v.id}`}
              title={v.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              className="aspect-video w-full"
            />
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="font-mono text-xs uppercase tracking-wider text-white/70">
                {v.title}
              </p>
              <p className="font-mono text-[11px] leading-relaxed text-white/40">
                Accept cookies to load YouTube videos — nothing third-party
                loads before you say so.
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
