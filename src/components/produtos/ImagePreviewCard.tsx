import { X, GripVertical, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { formatFileSize } from '@/utils/imageProcessing';

interface ImagePreviewCardProps {
  id: string;
  preview: string;
  isPrincipal: boolean;
  order: number;
  size?: number;
  dimensions?: { width: number; height: number };
  isProcessing?: boolean;
  onRemove: () => void;
  isDragging?: boolean;
  dragHandleProps?: any;
}

export function ImagePreviewCard({
  preview,
  isPrincipal,
  order,
  size,
  dimensions,
  isProcessing,
  onRemove,
  isDragging,
  dragHandleProps,
}: ImagePreviewCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-lg overflow-hidden border-2 transition-all duration-200 group",
        isPrincipal 
          ? "border-primary shadow-lg shadow-primary/20" 
          : "border-border hover:border-primary/50",
        isDragging && "opacity-50 scale-95 rotate-2",
        isProcessing && "opacity-70"
      )}
    >
      {/* Imagem */}
      <div className={cn(
        "relative bg-muted",
        isPrincipal ? "aspect-square w-full" : "aspect-square"
      )}>
        <img 
          src={preview} 
          alt={isPrincipal ? "Imagem principal" : `Imagem ${order}`}
          className="w-full h-full object-cover"
        />
        
        {/* Overlay com controles */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            type="button"
            {...dragHandleProps}
            className="p-2 bg-background/90 rounded-md hover:bg-background cursor-grab active:cursor-grabbing transition-colors"
            title="Arrastar para reordenar"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onRemove}
            title="Remover imagem"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Loading overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        )}
      </div>

      {/* Badge de identificação */}
      <div className="absolute top-2 left-2">
        {isPrincipal ? (
          <Badge className="bg-primary text-primary-foreground shadow-lg">
            Principal
          </Badge>
        ) : (
          <Badge variant="secondary" className="shadow-md">
            #{order}
          </Badge>
        )}
      </div>

      {/* Informações */}
      <div className="absolute bottom-2 right-2 flex flex-col gap-1 items-end">
        {dimensions && dimensions.width > 0 && dimensions.height > 0 && (
          <Badge variant="outline" className="text-xs bg-background/90 backdrop-blur-sm">
            {dimensions.width}x{dimensions.height}px
          </Badge>
        )}
        {size && size > 0 && (
          <Badge variant="outline" className="text-xs bg-background/90 backdrop-blur-sm">
            {formatFileSize(size)}
          </Badge>
        )}
      </div>
    </div>
  );
}
