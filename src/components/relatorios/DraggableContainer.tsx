import { ReactNode, useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useReportLayout, CardLayout, CardDefinition } from '@/hooks/useReportLayout';
import { Button } from '@/components/ui/button';
import { CardVisibilityToggle } from './CardVisibilityToggle';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableContainerProps {
  tabName: string;
  children: ReactNode[];
  cardIds: string[];
  cardDefinitions: CardDefinition[];
}

export function DraggableContainer({ tabName, children, cardIds, cardDefinitions }: DraggableContainerProps) {
  const { getCardOrder, saveLayout, resetLayout, hasCustomLayout, getCardVisibility } = useReportLayout();
  const [items, setItems] = useState<string[]>(cardIds);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Memoizar cardIds como string para evitar mudanças de referência
  const cardIdsKey = useMemo(() => cardIds.join(','), [cardIds]);

  // Carregar ordem personalizada ao montar
  useEffect(() => {
    const customOrder = getCardOrder(tabName);
    if (customOrder.length > 0) {
      // Validar que todos os IDs existem
      const validOrder = customOrder.filter(id => cardIds.includes(id));
      // Adicionar novos IDs que não estão na ordem salva e que estão visíveis
      const missingIds = cardIds.filter(id => !validOrder.includes(id) && getCardVisibility(tabName, id));
      setItems([...validOrder, ...missingIds]);
    } else {
      // Filtrar apenas cards visíveis
      const visibleCards = cardIds.filter(id => getCardVisibility(tabName, id));
      setItems(visibleCards);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabName, cardIdsKey]); // Usar cardIdsKey ao invés de funções

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Salvar nova ordem
        const cardsLayout: CardLayout[] = newOrder.map((id, index) => ({
          id,
          order: index,
        }));
        saveLayout(tabName, cardsLayout);

        return newOrder;
      });
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleReset = () => {
    resetLayout(tabName);
    setItems(cardIds);
  };

  // Ordenar children de acordo com items
  const orderedChildren = items
    .map(id => {
      const index = cardIds.indexOf(id);
      return index >= 0 ? children[index] : null;
    })
    .filter(Boolean);

  // Encontrar o índice do card ativo para o overlay
  const activeIndex = activeId ? cardIds.indexOf(activeId) : -1;

  return (
    <div className="space-y-6">
      {(hasCustomLayout(tabName) || cardDefinitions.length > 0) && (
        <div className="flex justify-end gap-2 animate-fade-in">
          <CardVisibilityToggle tabName={tabName} cards={cardDefinitions} />
          {hasCustomLayout(tabName) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-2 hover-scale"
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar Layout Padrão
            </Button>
          )}
        </div>
      )}
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="space-y-6 md:pl-8">
            {orderedChildren}
          </div>
        </SortableContext>
        
        <DragOverlay
          dropAnimation={{
            duration: 300,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}
        >
          {activeId && activeIndex >= 0 ? (
            <div className={cn(
              "animate-scale-in",
              "shadow-2xl ring-2 ring-primary/30 rounded-lg",
              "bg-card/95 backdrop-blur-sm"
            )}>
              {children[activeIndex]}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
