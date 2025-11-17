import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ChartContainerProps {
  title: string;
  description?: string;
  children: ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  className?: string;
  actions?: ReactNode;
  delay?: number;
}

export function ChartContainer({
  title,
  description,
  children,
  loading = false,
  empty = false,
  emptyMessage = "Nenhum dado disponível para exibição",
  className,
  actions,
  delay = 0,
}: ChartContainerProps) {
  return (
    <Card 
      className={cn("overflow-hidden animate-fade-in", className)}
      style={{ animationDelay: `${delay}s` }}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {description && (
            <CardDescription className="text-sm">{description}</CardDescription>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-[300px] w-full" />
          </div>
        ) : empty ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground animate-fade-in">
            <p>{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
