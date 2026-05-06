import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const RecipeSkeleton = () => {
  return (
    <Card className="shadow-2xl backdrop-blur-sm bg-card/95 border-2 border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardContent className="p-6 md:p-8 space-y-6">
        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Skeleton className="h-9 md:h-10 w-2/3" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>

        {/* Image placeholder */}
        <Skeleton className="w-full max-w-lg mx-auto h-56 md:h-64 rounded-xl" />

        {/* Servings bar */}
        <Skeleton className="h-16 rounded-xl" />

        {/* Health rating */}
        <Skeleton className="h-20 rounded-xl" />

        {/* Nutrition grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>

        {/* Cost breakdown */}
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded" />
          ))}
        </div>

        {/* Tabs */}
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecipeSkeleton;
