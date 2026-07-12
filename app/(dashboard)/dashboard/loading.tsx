import { Skeleton } from "@/components/ui/States";

export default function DashboardLoading() {
  return (
    <div>
      <div className="border-b border-line px-4 py-5 dark:border-line-dark sm:px-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
