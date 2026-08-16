-- Contact form submissions (Outfitters GET IN TOUCH; reusable sitewide).
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  brand_context text,
  source_path text,
  created_at timestamptz not null default now()
);

-- Service-role only: RLS on, no policies. Writes via /api/contact, reads via /admin.
alter table public.contact_messages enable row level security;
