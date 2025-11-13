import { Card, CardContent } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus, LucideIcon } from "lucide-react";
import { formatCurrency, formatNumber, formatPercent } from "@/utils/chartHelpers";
import { cn } from "@/lib/utils";

export type MetricType = 'currency' | 'number' | 'percent';

interface MetricCardProps {
  title: string;
  value: number;
  icon?: LucideIcon;
  type?: MetricType;
  comparison?: {
    value: number;
    percentage: number;
  };
  loading?: boolean;
  className?: string;
  delay?: number;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  type = 'number',
  comparison,
  loading = false,
  className,
  delay = 0,
}: MetricCardProps) {
  const formatValue = (val: number) => {
    switch (type) {
      case 'currency':
        return formatCurrency(val);
      case 'percent':
        return formatPercent(val);
      default:
        return formatNumber(val);
    }
  };

  const getTrend = () => {
    if (!comparison || comparison.percentage === 0) {
      return { icon: Minus, color: 'text-muted-foreground', text: 'Sem alteração' };
    }
    if (comparison.percentage > 0) {
      return { icon: ArrowUp, color: 'text-success', text: `+${formatPercent(comparison.percentage)}` };
    }
    return { icon: ArrowDown, color: 'text-danger', text: formatPercent(comparison.percentage) };
  };

  const trend = getTrend();
  const TrendIcon = trend.icon;

  if (loading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        "overflow-hidden hover:shadow-fellow-md transition-all duration-300 animate-fade-in", 
        className
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
            <h3 className="text-3xl font-bold text-foreground mb-1">
              {formatValue(value)}
            </h3>
            {comparison && (
              <div className={cn("flex items-center gap-1 text-sm font-medium", trend.color)}>
                <TrendIcon className="h-4 w-4" />
                <span>{trend.text}</span>
                <span className="text-muted-foreground ml-1">vs período anterior</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className="p-3 bg-primary/10 rounded-lg transition-transform hover:scale-110">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
