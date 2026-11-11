import { PageLoading } from "@/shared/ui/PageLoading";

// Shown immediately when navigating into any route below the root layout,
// instead of leaving the previous page frozen until the server responds.
export default function Loading() {
  return <PageLoading />;
}
