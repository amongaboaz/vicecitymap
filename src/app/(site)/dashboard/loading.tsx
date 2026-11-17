import { Skeleton } from "@/components/ui/primitives";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6" role="status" aria-label="Loading dashboard">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-9 w-64" />
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-44" />
        <Skeleton className="h-44 lg:col-span-2" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
