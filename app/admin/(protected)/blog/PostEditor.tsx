"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import { BLOG_EXTENSIONS, parseBody, slugifyTitle } from "@/lib/blog";
import { AdminUploader } from "@/lib/admin/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkPostSlugAvailable, deletePost, savePost, setPostPublished, type PostRow } from "./actions";

/**
 * Blog editor: title, auto-slug (editable until first publish), excerpt, hero
 * image (blog bucket), TipTap rich text (H2/H3, bold/italic, lists, links,
 * blockquote, inline images via blog bucket), SEO title/description,
 * publish/unpublish. Body saved as TipTap JSON in blog_posts.body_md.
 */
export function PostEditor({ post }: { post: PostRow | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!post);
  const [slugState, setSlugState] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [heroImage, setHeroImage] = useState(post?.hero_image ?? "");
  const seo = (post?.seo ?? {}) as { title?: string | null; description?: string | null };
  const [seoTitle, setSeoTitle] = useState(seo.title ?? "");
  const [seoDescription, setSeoDescription] = useState(seo.description ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const slugLocked = !!post?.published_at;

  const initial = parseBody(post?.body_md);
  const editor = useEditor({
    extensions: [...BLOG_EXTENSIONS, Placeholder.configure({ placeholder: "Write the post…" })],
    content:
      initial.kind === "doc"
        ? initial.doc
        : initial.kind === "text"
          ? { type: "doc", content: initial.text.split(/\n{2,}/).map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] })) }
          : undefined,
    immediatelyRender: false,
    editorProps: { attributes: { class: "prose-ps min-h-[320px] rounded-b border border-t-0 bg-white px-4 py-3 text-sm outline-none" } },
  });

  const slugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleSlugCheck(s: string) {
    if (slugLocked || !s) return;
    if (s === post?.slug) {
      setSlugState("ok");
      return;
    }
    setSlugState("checking");
    if (slugTimer.current) clearTimeout(slugTimer.current);
    slugTimer.current = setTimeout(async () => {
      setSlugState((await checkPostSlugAvailable(s, post?.id)) ? "ok" : "taken");
    }, 400);
  }
  function onTitleChange(v: string) {
    setTitle(v);
    if (!slugTouched && !slugLocked) {
      const s = slugifyTitle(v);
      setSlug(s);
      scheduleSlugCheck(s);
    }
  }

  function save(): Promise<{ ok: boolean; id?: string }> {
    return new Promise((resolve) => {
      start(async () => {
        const res = await savePost({
          id: post?.id,
          title,
          slug,
          excerpt: excerpt || null,
          heroImage: heroImage || null,
          bodyJson: editor ? JSON.stringify(editor.getJSON()) : (post?.body_md ?? null),
          seoTitle: seoTitle || null,
          seoDescription: seoDescription || null,
        });
        if (!res.ok) {
          setMsg({ ok: false, text: res.error });
          resolve({ ok: false });
          return;
        }
        setMsg({ ok: true, text: "Saved." });
        if (!post) router.push(`/admin/blog/${res.data.id}`);
        router.refresh();
        resolve({ ok: true, id: res.data.id });
      });
    });
  }

  async function publish(next: boolean) {
    const saved = await save();
    if (!saved.ok || !saved.id) return;
    start(async () => {
      const r = await setPostPublished(saved.id!, next);
      setMsg(r.ok ? { ok: true, text: next ? "Published — /news and the post page revalidated." : "Unpublished." } : { ok: false, text: r.error });
      router.refresh();
    });
  }

  const tb = (label: string, active: boolean, onClick: () => void, title?: string) => (
    <button
      type="button"
      title={title ?? label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs font-semibold ${active ? "bg-neutral-900 text-white" : "hover:bg-neutral-200"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <div className="space-y-4 rounded border bg-white p-5">
          <div className="space-y-1.5">
            <Label htmlFor="p-title">Title</Label>
            <Input id="p-title" value={title} onChange={(e) => onTitleChange(e.target.value)} className="text-lg font-semibold" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-slug">
              Slug {slugLocked ? <span className="text-xs text-neutral-500">— locked after first publish</span> : null}{" "}
              {!slugLocked && slugState === "checking" && <span className="text-xs text-neutral-500">checking…</span>}
              {!slugLocked && slugState === "ok" && slug && <span className="text-xs text-green-700">available</span>}
              {!slugLocked && slugState === "taken" && <span className="text-xs text-red-600">already in use</span>}
            </Label>
            <Input
              id="p-slug"
              value={slug}
              disabled={slugLocked}
              onChange={(e) => {
                setSlugTouched(true);
                const s = slugifyTitle(e.target.value);
                setSlug(s);
                scheduleSlugCheck(s);
              }}
              className={`font-mono ${slugLocked ? "bg-neutral-100 text-neutral-500" : ""}`}
            />
            <p className="text-xs text-neutral-500">/news/{slug || "…"}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-excerpt">Excerpt</Label>
            <textarea id="p-excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3} className="w-full rounded-md border px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <Label>Body</Label>
          <div className="mt-1.5 flex flex-wrap items-center gap-1 rounded-t border bg-neutral-50 px-2 py-1.5">
            {editor && (
              <>
                {tb("H2", editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
                {tb("H3", editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
                {tb("B", editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "Bold")}
                {tb("I", editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "Italic")}
                {tb("• List", editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run())}
                {tb("1. List", editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run())}
                {tb("❝ Quote", editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run())}
                {tb("Link", editor.isActive("link"), () => {
                  if (editor.isActive("link")) {
                    editor.chain().focus().unsetLink().run();
                    return;
                  }
                  setLinkUrl(editor.getAttributes("link").href ?? "");
                  setShowLink((v) => !v);
                })}
                {tb("Image", false, () => setShowImage((v) => !v))}
                {tb("¶", editor.isActive("paragraph"), () => editor.chain().focus().setParagraph().run(), "Paragraph")}
              </>
            )}
          </div>
          {showLink && editor && (
            <div className="flex items-center gap-2 border border-t-0 bg-neutral-50 px-2 py-2">
              <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" className="h-8 text-xs" />
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const href = linkUrl.trim();
                  if (href) editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
                  setShowLink(false);
                }}
              >
                Apply
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowLink(false)}>
                Cancel
              </Button>
            </div>
          )}
          {showImage && editor && (
            <div className="border border-t-0 bg-neutral-50 px-2 py-2">
              <AdminUploader
                bucket="blog"
                folder={slug || "drafts"}
                label="Drop an inline image (inserted at the cursor)"
                onUploaded={(m) => {
                  editor.chain().focus().setImage({ src: m.url, alt: "" }).run();
                  setShowImage(false);
                }}
              />
            </div>
          )}
          <EditorContent editor={editor} />
        </div>

        <div className="space-y-4 rounded border bg-white p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">SEO</h2>
          <div className="space-y-1.5">
            <Label htmlFor="p-seo-title">SEO title (defaults to the title)</Label>
            <Input id="p-seo-title" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} maxLength={70} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-seo-desc">SEO description (defaults to the excerpt)</Label>
            <textarea id="p-seo-desc" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={2} maxLength={160} className="w-full rounded-md border px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      <aside className="space-y-5">
        <div className="space-y-3 rounded border bg-white p-4">
          <Label>Status</Label>
          <p className="text-sm">
            {post?.is_published ? (
              <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Published</span>
            ) : (
              <span className="rounded bg-neutral-200 px-2 py-0.5 text-xs font-semibold text-neutral-700">Draft</span>
            )}
            {post?.published_at && <span className="ml-2 text-xs text-neutral-500">first published {new Date(post.published_at).toLocaleDateString()}</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={pending || slugState === "taken"} onClick={() => void save()}>
              {pending ? "Saving…" : "Save draft"}
            </Button>
            {post?.is_published ? (
              <Button type="button" variant="outline" disabled={pending} onClick={() => void publish(false)}>
                Unpublish
              </Button>
            ) : (
              <Button type="button" variant="outline" disabled={pending || slugState === "taken"} onClick={() => void publish(true)}>
                Save &amp; publish
              </Button>
            )}
          </div>
          {msg && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
          {post && (
            <Button
              type="button"
              variant="ghost"
              className="text-red-600"
              disabled={pending}
              onClick={() => {
                if (!confirm("Delete this post permanently?")) return;
                start(async () => {
                  const r = await deletePost(post.id);
                  if (r.ok) router.push("/admin/blog");
                  else setMsg({ ok: false, text: r.error });
                });
              }}
            >
              Delete post
            </Button>
          )}
        </div>

        <div className="space-y-3 rounded border bg-white p-4">
          <Label>Hero image</Label>
          {heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImage} alt="" className="aspect-[8/5] w-full rounded object-cover" />
          ) : (
            <div className="flex aspect-[8/5] items-center justify-center rounded bg-neutral-100 text-xs text-neutral-400">no hero image</div>
          )}
          <AdminUploader bucket="blog" folder={slug || "drafts"} label="Drop hero image" onUploaded={(m) => setHeroImage(m.url)} />
          {heroImage && (
            <button type="button" onClick={() => setHeroImage("")} className="text-xs text-neutral-500 underline">
              Remove
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
