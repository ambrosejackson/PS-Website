import { SyncButton } from "./SyncButton";

export default function AdminProductsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-condensed text-2xl font-bold uppercase tracking-tight">Products</h1>
        <p className="mt-2 max-w-prose text-sm text-neutral-600">
          Cannabis products — hybrid: synced from the iHeartJane sheet plus manual entries.
          Review, hide/show, edit admin-owned fields (D-038).
        </p>
      </div>
      <SyncButton />
      <p className="rounded border border-dashed p-6 text-sm text-neutral-400">
        Product list, editor and reorder arrive in the next commit.
      </p>
    </div>
  );
}
