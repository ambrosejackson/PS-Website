/**
 * Small shared pieces for the TerpKings page. No hooks, no server-only imports —
 * safe to use from both RSC sections and the client consoles.
 */

/** Eyebrow + headline, centered (FILE 01/03/04) or left-aligned (FILE 05). */
export function TKSectionHead({
  eyebrow,
  title,
  align = "center",
  titleSize = "clamp(30px, 4.5vw, 54px)",
  className = "",
}: {
  eyebrow: string;
  title: React.ReactNode;
  align?: "center" | "left";
  titleSize?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-2 ${
        align === "center" ? "items-center text-center" : "items-start text-left"
      } ${className}`}
    >
      <div className="tk-mono text-[20px] tracking-[.24em] text-[#FFB000]">{eyebrow}</div>
      <h2
        className="m-0 font-extrabold uppercase text-[#E8F0C8]"
        style={{ fontSize: titleSize, letterSpacing: "-.01em" }}
      >
        {title}
      </h2>
    </div>
  );
}

/**
 * Stand-in for the export's `<image-slot>` — a brand-palette box with the
 * slot's placeholder label, until real art is supplied. Fills its parent.
 */
export function TKPlaceholder({
  label,
  file,
  className = "",
}: {
  label: string;
  /** Optional expected filename, shown in small type so the asset can be dropped in. */
  file?: string;
  className?: string;
}) {
  return (
    <div
      className={`tk-mono relative flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden px-4 text-center ${className}`}
      style={{
        background:
          "repeating-linear-gradient(0deg, rgba(0,0,0,.25) 0px, rgba(0,0,0,.25) 2px, transparent 2px, transparent 5px), radial-gradient(ellipse 80% 70% at 50% 45%, #2A331A 0%, #151A0D 60%, #0B0F07 100%)",
        border: "1px dashed rgba(168,198,78,.35)",
      }}
      aria-label={label}
      role="img"
    >
      <span className="text-[18px] tracking-[.14em] text-[#5B6E35]">[ {label.toUpperCase()} ]</span>
      {file && (
        <span className="text-[13px] tracking-[.1em] text-[rgba(168,198,78,.35)]">
          AWAITING {file}
        </span>
      )}
    </div>
  );
}

/** The little screw-head dots on consoles and cards. */
export function TKScrews({
  size = 8,
  inset = { x: 10, y: 8 },
  gradient = "radial-gradient(circle at 35% 35%, #777, #222)",
  corners = "top",
}: {
  size?: number;
  inset?: { x: number; y: number };
  gradient?: string;
  corners?: "top" | "all";
}) {
  const base = {
    position: "absolute" as const,
    width: size,
    height: size,
    borderRadius: "50%",
    background: gradient,
    zIndex: 3,
  };
  return (
    <>
      <div style={{ ...base, top: inset.y, left: inset.x }} />
      <div style={{ ...base, top: inset.y, right: inset.x }} />
      {corners === "all" && (
        <>
          <div style={{ ...base, bottom: inset.y, left: inset.x }} />
          <div style={{ ...base, bottom: inset.y, right: inset.x }} />
        </>
      )}
    </>
  );
}

/** Product render or, when the file isn't there yet, a palette placeholder. */
export function TKProductImage({
  src,
  alt,
  available,
  className = "",
  style,
  placeholderLabel,
}: {
  src: string;
  alt: string;
  available: boolean;
  className?: string;
  style?: React.CSSProperties;
  placeholderLabel?: string;
}) {
  if (!available) {
    return (
      <div className="relative z-[1] h-[210px] w-[85%] max-w-[260px] rounded-[6px]">
        <TKPlaceholder
          label={placeholderLabel ?? alt}
          file={src.split("/").pop()}
        />
      </div>
    );
  }
  // Brand renders are static files with known brand sizing — plain img.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} style={style} loading="lazy" />;
}
