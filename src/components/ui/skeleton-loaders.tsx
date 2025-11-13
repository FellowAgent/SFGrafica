import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * Skeleton para tabela de clientes/produtos
 */
export function TableSkeleton({ rows = 10, columns = 7 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-lg border bg-card shadow-fellow-md">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-4 w-24" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex} className={rowIndex % 2 === 0 ? "bg-muted/20" : ""}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  {colIndex === 0 ? (
                    <Skeleton className="h-4 w-4 rounded-full" />
                  ) : colIndex === 1 ? (
                    <Skeleton className="h-10 w-10 rounded-md" />
                  ) : (
                    <Skeleton className="h-4 w-full" />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Skeleton para grid de cards (clientes/produtos)
 */
export function CardGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="bg-card rounded-2xl border border-border shadow-fellow-md p-6">
          <CardContent className="p-0">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Skeleton para cards de relatórios/métricas
 */
export function MetricCardSkeleton() {
  return (
    <Card className="bg-card rounded-2xl border border-border shadow-fellow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton para gráficos de relatórios
 */
export function ChartSkeleton() {
  return (
    <Card className="bg-card rounded-2xl border border-border shadow-fellow-md">
      <CardContent className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="flex items-end justify-between h-64 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton 
                key={i} 
                className="flex-1 rounded-t-lg" 
                style={{ height: `${Math.random() * 60 + 40}%` }}
              />
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 pt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton para lista de relatórios com múltiplos cards
 */
export function ReportPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      <ChartSkeleton />
    </div>
  );
}

/**
 * Skeleton para card de produto individual (para grid view)
 */
export function ProductCardSkeleton() {
  return (
    <Card className="bg-card rounded-2xl border border-border shadow-fellow-md overflow-hidden">
      <div className="relative">
        <Skeleton className="h-48 w-full rounded-t-2xl" />
        <div className="absolute top-2 right-2">
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
      </div>
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-6 w-full" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}
