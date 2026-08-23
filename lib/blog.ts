import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import type { JSONContent } from "@tiptap/core";

/**
 * Blog body format (D-044: rich text editor). `blog_posts.body_md` holds the
 * TipTap document as JSON text (column name kept — renaming would touch the
 * seed + every reader for no functional gain; documented here and in
 * DECISIONS). Legacy plain-text bodies (the seeded placeholders) still render
 * as paragraphs.
 */

/** Extensions shared by the admin editor and the server-side HTML renderer. */
export const BLOG_EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    link: false,
  }),
  Link.configure({
    openOnClick: false,
    autolink: true,
    protocols: ["http", "https", "mailto"],
    HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
  }),
  Image.configure({ inline: false, allowBase64: false }),
];

export type BlogBody = { kind: "doc"; doc: JSONContent } | { kind: "text"; text: string } | { kind: "empty" };

export function parseBody(raw: string | null | undefined): BlogBody {
  const s = (raw ?? "").trim();
  if (!s) return { kind: "empty" };
  if (s.startsWith("{")) {
    try {
      const doc = JSON.parse(s) as JSONContent;
      if (doc && doc.type === "doc") return { kind: "doc", doc };
    } catch {
      /* fall through */
    }
  }
  return { kind: "text", text: s };
}

/** Plain-text excerpt from a body (used for SEO description fallback). */
export function bodyToText(body: BlogBody, max = 300): string {
  if (body.kind === "empty") return "";
  if (body.kind === "text") return body.text.slice(0, max);
  const out: string[] = [];
  const walk = (n: JSONContent) => {
    if (n.text) out.push(n.text);
    n.content?.forEach(walk);
    if (n.type === "paragraph" || n.type === "heading") out.push(" ");
  };
  walk(body.doc);
  return out.join("").replace(/\s+/g, " ").trim().slice(0, max);
}

export function slugifyTitle(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}
