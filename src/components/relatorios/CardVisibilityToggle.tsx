import { Eye, EyeOff, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useReportLayout, CardDefinition } from "@/hooks/useReportLayout";
import { Badge } from "@/components/ui/badge";

interface CardVisibilityToggleProps {
  tabName: string;
  cards: CardDefinition[];
}

export function CardVisibilityToggle({ tabName, cards }: CardVisibilityToggleProps) {
  const { getCardVisibility, toggleCardVisibility, getVisibleCardsCount } = useReportLayout();
  
  const visibleCount = getVisibleCardsCount(tabName, cards.length);
  const hiddenCount = cards.length - visibleCount;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 hover-scale">
          <Settings2 className="h-4 w-4" />
          Personalizar Cards
          {hiddenCount > 0 && (
            <Badge variant="secondary" className="ml-1 animate-scale-in">
              {hiddenCount} oculto{hiddenCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px] animate-scale-in">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Exibir Cards</span>
          <Badge variant="outline" className="ml-2">
            {visibleCount}/{cards.length}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {cards.map((card) => {
          const isVisible = getCardVisibility(tabName, card.id);
          return (
            <DropdownMenuCheckboxItem
              key={card.id}
              checked={isVisible}
              onCheckedChange={() => toggleCardVisibility(tabName, card.id)}
              className="flex items-start gap-2 py-3 transition-colors duration-150"
            >
              <div className="flex items-center gap-2 flex-1">
                {isVisible ? (
                  <Eye className="h-4 w-4 text-primary transition-all duration-200 animate-scale-in" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground transition-all duration-200" />
                )}
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-sm">{card.label}</span>
                  {card.description && (
                    <span className="text-xs text-muted-foreground">
                      {card.description}
                    </span>
                  )}
                </div>
              </div>
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
