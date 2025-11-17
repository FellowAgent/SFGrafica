import { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableCardProps {
  id: string;
  children: ReactNode;
  isDragging?: boolean;
}

export function DraggableCard({ id, children, isDragging }: DraggableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isBeingDragged = isDragging || isSortableDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group transition-all duration-300 ease-out',
        isBeingDragged && 'opacity-50 scale-[0.98] cursor-grabbing z-50',
        !isBeingDragged && 'animate-fade-in'
      )}
    >
      <div
        className={cn(
          'absolute -left-8 top-1/2 -translate-y-1/2',
          'opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out',
          'cursor-grab active:cursor-grabbing z-10',
          'hidden md:flex items-center justify-center w-6 h-6 rounded',
          'bg-muted hover:bg-primary/10 hover:scale-110',
          'border border-transparent hover:border-primary/20',
          'shadow-sm hover:shadow-md'
        )}
        {...attributes}
        {...listeners}
      >
        <GripVertical className={cn(
          "h-4 w-4 text-muted-foreground transition-colors duration-200",
          "group-hover:text-primary"
        )} />
      </div>
      <div className={cn(
        'transition-all duration-200 ease-out',
        isBeingDragged && 'shadow-2xl ring-2 ring-primary/20 rounded-lg',
        !isBeingDragged && 'hover:shadow-sm'
      )}>
        {children}
      </div>
    </div>
  );
}
