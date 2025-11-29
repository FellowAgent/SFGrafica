import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateRangePickerProps {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
  className?: string;
}

export function DateRangePicker({ date, onDateChange, className }: DateRangePickerProps) {
  const [preset, setPreset] = useState<string>("custom");

  const handlePresetChange = (value: string) => {
    setPreset(value);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    switch (value) {
      case "all": {
        // Define uma data bem antiga para pegar todos os registros
        const allTimeStart = new Date(2020, 0, 1);
        allTimeStart.setHours(0, 0, 0, 0);
        onDateChange({ from: allTimeStart, to: today });
        break;
      }
      case "today": {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        onDateChange({ from: todayStart, to: today });
        break;
      }
      case "yesterday": {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);
        onDateChange({ from: yesterday, to: yesterdayEnd });
        break;
      }
      case "last7days": {
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 7);
        last7.setHours(0, 0, 0, 0);
        onDateChange({ from: last7, to: today });
        break;
      }
      case "last30days": {
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 30);
        last30.setHours(0, 0, 0, 0);
        onDateChange({ from: last30, to: today });
        break;
      }
      case "thisMonth": {
        const firstDayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        onDateChange({ from: firstDayMonth, to: today });
        break;
      }
      case "lastMonth": {
        const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        lastDayLastMonth.setHours(23, 59, 59, 999);
        onDateChange({ from: firstDayLastMonth, to: lastDayLastMonth });
        break;
      }
      case "custom":
        break;
    }
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[180px] transition-all duration-200 hover:border-primary/50">
          <SelectValue placeholder="Selecione período" />
        </SelectTrigger>
        <SelectContent className="z-50">
          <SelectItem value="all" className="font-medium">Desde o início</SelectItem>
          <SelectItem value="today">Hoje</SelectItem>
          <SelectItem value="yesterday">Ontem</SelectItem>
          <SelectItem value="last7days">Últimos 7 dias</SelectItem>
          <SelectItem value="last30days">Últimos 30 dias</SelectItem>
          <SelectItem value="thisMonth">Este mês</SelectItem>
          <SelectItem value="lastMonth">Mês passado</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[280px] justify-start text-left font-normal transition-all duration-200 hover:border-primary/50",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                  {format(date.to, "dd/MM/yyyy", { locale: ptBR })}
                </>
              ) : (
                format(date.from, "dd/MM/yyyy", { locale: ptBR })
              )
            ) : (
              <span>Selecione o período</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-50" align="start" sideOffset={8}>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={(newDate) => {
              onDateChange(newDate);
              setPreset("custom");
            }}
            numberOfMonths={2}
            locale={ptBR}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
