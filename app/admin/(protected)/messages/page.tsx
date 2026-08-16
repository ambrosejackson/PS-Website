import { createAdminClient } from "@/lib/supabase/admin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  let messages: {
    id: string;
    name: string;
    email: string;
    subject: string | null;
    message: string;
    brand_context: string | null;
    created_at: string;
  }[] = [];
  let unavailable = false;
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("contact_messages")
      .select("id, name, email, subject, message, brand_context, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    messages = data ?? [];
  } catch {
    unavailable = true;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Messages</h1>
      <p className="mt-2 max-w-prose text-sm text-neutral-600">
        Contact form submissions (brand pages and sitewide).
      </p>
      {unavailable ? (
        <p className="mt-6 rounded border border-dashed p-6 text-sm text-neutral-400">
          Service role key not configured — messages can&apos;t be read here yet.
        </p>
      ) : messages.length === 0 ? (
        <p className="mt-6 rounded border border-dashed p-6 text-sm text-neutral-400">
          No messages yet.
        </p>
      ) : (
        <div className="mt-6 rounded border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Received</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap text-xs text-neutral-500">
                    {new Date(m.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{m.name}</div>
                    <div className="text-xs text-neutral-500">{m.email}</div>
                  </TableCell>
                  <TableCell className="text-xs">{m.brand_context}</TableCell>
                  <TableCell className="text-xs">{m.subject}</TableCell>
                  <TableCell className="max-w-md whitespace-pre-wrap text-xs text-neutral-600">
                    {m.message}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
