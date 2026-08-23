import { generateHTML } from "@tiptap/html";
import { BLOG_EXTENSIONS, parseBody } from "@/lib/blog";

/**
 * Renders a blog body: TipTap JSON → HTML on the server (same extensions as
 * the editor), legacy plain text → paragraphs. Styled by `.prose-ps` in
 * globals.css (site type: condensed uppercase headings, relaxed body).
 */
export function PostBody({ body }: { body: string | null | undefined }) {
  const parsed = parseBody(body);
  if (parsed.kind === "empty") return null;
  if (parsed.kind === "text") {
    const paragraphs = parsed.text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
    return (
      <div className="prose-ps">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    );
  }
  let html = "";
  try {
    html = generateHTML(parsed.doc, BLOG_EXTENSIONS);
  } catch {
    html = "";
  }
  // Content is authored by allowlisted staff in /admin (TipTap schema, no raw HTML input).
  return <div className="prose-ps" dangerouslySetInnerHTML={{ __html: html }} />;
}
