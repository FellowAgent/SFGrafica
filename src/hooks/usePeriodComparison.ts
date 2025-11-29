import { useMemo } from "react";
import { DateRange } from "react-day-picker";
import { calcularPeriodoAnterior, calcularVariacaoPercentual } from "@/utils/metricsCalculations";

interface MetricComparison {
  current: number;
  previous: number;
  percentage: number;
}

export function usePeriodComparison(
  dateRange: DateRange | undefined,
  enabled: boolean = false
) {
  const previousPeriod = useMemo(() => {
    if (!enabled || !dateRange?.from || !dateRange?.to) {
      return undefined;
    }
    return calcularPeriodoAnterior(dateRange.from, dateRange.to);
  }, [dateRange, enabled]);

  const compareMetrics = (currentValue: number, previousValue: number): MetricComparison => {
    return {
      current: currentValue,
      previous: previousValue,
      percentage: calcularVariacaoPercentual(currentValue, previousValue),
    };
  };

  return {
    previousPeriod,
    compareMetrics,
    isComparing: enabled && !!previousPeriod,
  };
}
