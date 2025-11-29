import { useState, useCallback, useMemo } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { toast } from '@/utils/toastHelper';
import { Upload, Image as ImageIcon, Star, Trash2, GripVertical, Check } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { resizeImage, isValidImageType } from '@/utils/imageProcessing';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface ImageData {
  id: string;
  file?: File;
  blob?: Blob;
  url?: string;
  preview: string;
  isPrincipal: boolean;
  order: number;
  dimensions?: { width: number; height: number };
  size?: number;
  isProcessing?: boolean;
  uploadStatus?: 'pending' | 'uploading' | 'success' | 'error';
  uploadError?: string;
}

interface ProductImageGalleryProps {
  images: ImageData[];
  onChange: (images: ImageData[]) => void;
  maxImages?: number;
}

// Componente de Card de Imagem Sortable
function SortableImageCard({ 
  image, 
  onRemove, 
  isMainImage 
}: { 
  image: ImageData; 
  onRemove: () => void;
  isMainImage: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: image.id 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Determinar status da imagem
  const getImageStatus = () => {
    if (image.uploadStatus) {
      return image.uploadStatus;
    }
    // Se tem URL do storage, está salva
    if (image.url && image.url.includes('produtos-imagens')) {
      return 'success';
    }
    // Se tem blob ou file mas não tem URL do storage, está pendente
    if (image.blob || image.file) {
      return 'pending';
    }
    return 'pending';
  };

  const status = getImageStatus();

  const getStatusBadge = () => {
    switch (status) {
      case 'success':
        return (
          <Badge className="bg-green-100/90 text-green-700 border-green-300 backdrop-blur-sm shadow-md text-[10px] dark:bg-green-950/90 dark:text-green-300 dark:border-green-700">
            ✓ Salva no Supabase
          </Badge>
        );
      case 'uploading':
        return (
          <Badge className="bg-blue-100/90 text-blue-700 border-blue-300 backdrop-blur-sm shadow-md text-[10px] dark:bg-blue-950/90 dark:text-blue-300 dark:border-blue-700 animate-pulse">
            ⏳ Enviando...
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-100/90 text-red-700 border-red-300 backdrop-blur-sm shadow-md text-[10px] dark:bg-red-950/90 dark:text-red-300 dark:border-red-700">
            ✗ Erro no upload
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge className="bg-orange-100/90 text-orange-700 border-orange-300 backdrop-blur-sm shadow-md text-[10px] dark:bg-orange-950/90 dark:text-orange-300 dark:border-orange-700">
            ⚠ Aguardando envio
          </Badge>
        );
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "relative group rounded-xl overflow-hidden border-2 transition-all duration-200",
        isMainImage 
          ? "border-primary shadow-lg col-span-2 row-span-2" 
          : "border-dashed border-muted-foreground/30 hover:border-primary/50",
        isDragging && "scale-105 shadow-2xl z-50",
        status === 'success' && "border-green-500/50",
        status === 'error' && "border-red-500/50"
      )}
    >
      {/* Imagem */}
      <div className={cn(
        "relative w-full bg-muted",
        isMainImage ? "aspect-square" : "aspect-square"
      )}>
        <img
          src={image.preview}
          alt={`Produto ${image.order}`}
          className="w-full h-full object-cover"
        />
        
        {/* Overlay de hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200" />
        
        {/* Badges e Controles */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
          <div className="flex flex-col gap-1">
            {/* Badge Principal */}
            {isMainImage && (
              <Badge className="bg-primary text-primary-foreground flex items-center gap-1 shadow-lg">
                <Star className="h-3 w-3 fill-current" />
                Principal
              </Badge>
            )}
            {!isMainImage && (
              <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm shadow-md">
                {image.order}
              </Badge>
            )}
            {/* Badge de Status */}
            {getStatusBadge()}
          </div>

          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing bg-background/90 backdrop-blur-sm rounded-md p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Botão Remover */}
        <Button
          variant="destructive"
          size="icon"
          className="absolute bottom-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        {/* Info da Imagem */}
        {image.dimensions && (
          <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm text-xs shadow-md">
              {image.dimensions.width}×{image.dimensions.height}
              {image.size && ` • ${formatSize(image.size)}`}
            </Badge>
          </div>
        )}
      </div>

      {/* Mensagem de erro */}
      {image.uploadError && (
        <div className="absolute bottom-0 left-0 right-0 bg-red-500/90 text-white text-xs p-2 backdrop-blur-sm">
          <p className="font-semibold">Erro:</p>
          <p className="truncate">{image.uploadError}</p>
        </div>
      )}

      {/* Processando */}
      {image.isProcessing && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <span className="text-sm font-medium">Processando...</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente Principal
export function ProductImageGallery({ images, onChange, maxImages = 5 }: ProductImageGalleryProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingCount, setProcessingCount] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const remainingSlots = maxImages - images.length;

  // Processar imagem
  const processImage = useCallback(async (file: File): Promise<ImageData | null> => {
    try {
      if (!isValidImageType(file)) {
        toast.error(`${file.name}: Formato não suportado. Use JPG, PNG ou WEBP.`);
        return null;
      }

      const processed = await resizeImage(file, 1500, 1500, 0.9);
      const previewUrl = URL.createObjectURL(processed.blob);

      return {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        blob: processed.blob,
        url: previewUrl,
        preview: previewUrl,
        isPrincipal: false,
        order: 0,
        dimensions: processed.dimensions,
        size: processed.processedSize,
        isProcessing: false,
      };
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
      toast.error(`Erro ao processar ${file.name}`);
      return null;
    }
  }, []);

  // Handle upload de arquivos
  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (files.length > remainingSlots) {
      toast.error(`Você pode adicionar no máximo ${remainingSlots} ${remainingSlots === 1 ? 'imagem' : 'imagens'}`);
      return;
    }

    setIsProcessing(true);
    setProcessingCount(files.length);

    const newImages: ImageData[] = [];
    let processed = 0;

    for (const file of files) {
      const processedImage = await processImage(file);
      if (processedImage) {
        newImages.push(processedImage);
      }
      processed++;
      setProcessingCount(files.length - processed);
    }

    if (newImages.length > 0) {
      const updatedImages = [...images, ...newImages].slice(0, maxImages);
      
      const reorderedImages = updatedImages.map((img, index) => ({
        ...img,
        isPrincipal: index === 0,
        order: index + 1,
      }));

      onChange(reorderedImages);
      
      const successMessage = newImages.length === 1 
        ? '1 imagem adicionada com sucesso' 
        : `${newImages.length} imagens adicionadas com sucesso`;
      toast.success(successMessage);
    }

    setIsProcessing(false);
    setProcessingCount(0);
  }, [images, onChange, maxImages, remainingSlots, processImage]);

  // Drag and Drop
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((img) => img.id === active.id);
      const newIndex = images.findIndex((img) => img.id === over.id);
      
      const reordered = arrayMove(images, oldIndex, newIndex);
      
      const updated = reordered.map((img, index) => ({
        ...img,
        isPrincipal: index === 0,
        order: index + 1,
      }));

      onChange(updated);
      toast.success('Ordem atualizada', {
        description: updated[0].isPrincipal ? 'Nova imagem principal definida' : undefined
      });
    }
  }, [images, onChange]);

  // Remover imagem
  const handleRemove = useCallback((id: string) => {
    const filtered = images.filter(img => img.id !== id);
    
    const updated = filtered.map((img, index) => ({
      ...img,
      isPrincipal: index === 0,
      order: index + 1,
    }));

    onChange(updated);
    toast.success('Imagem removida');
  }, [images, onChange]);

  // Dropzone config
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFilesSelected,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxFiles: remainingSlots,
    disabled: isProcessing || remainingSlots === 0,
    multiple: true,
    noClick: false,
  });

  return (
    <div className="space-y-6">
      {/* Header com informações */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Galeria de Imagens</h3>
          <p className="text-sm text-muted-foreground">
            {images.length === 0 
              ? 'Adicione até 5 imagens do produto'
              : `${images.length} de ${maxImages} ${images.length === 1 ? 'imagem' : 'imagens'}`}
          </p>
          {images.length > 0 && images.some(img => {
            const hasStorageUrl = img.url && img.url.includes('produtos-imagens');
            return !hasStorageUrl;
          }) && (
            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
              ⚠️ {images.filter(img => !(img.url && img.url.includes('produtos-imagens'))).length} {images.filter(img => !(img.url && img.url.includes('produtos-imagens'))).length === 1 ? 'imagem aguardando' : 'imagens aguardando'} envio ao Supabase
            </Badge>
          )}
        </div>
        
        {images.length > 0 && (
          <Badge variant="outline" className="text-xs">
            <Star className="h-3 w-3 mr-1" />
            Arraste para reordenar
          </Badge>
        )}
      </div>

      {/* Grid de Imagens */}
      {images.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={images.map(img => img.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-4 gap-4">
              {images.map((image, index) => (
                <SortableImageCard
                  key={image.id}
                  image={image}
                  onRemove={() => handleRemove(image.id)}
                  isMainImage={index === 0}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Área de Upload */}
      {remainingSlots > 0 && (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 md:p-12 text-center cursor-pointer transition-all duration-300",
            isDragActive 
              ? "border-primary bg-primary/5 scale-[1.01] shadow-lg" 
              : "border-border hover:border-primary/50 hover:bg-accent/5",
            isProcessing && "opacity-50 cursor-not-allowed pointer-events-none"
          )}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center gap-4">
            {/* Ícone */}
            <div className={cn(
              "relative transition-all duration-300",
              isDragActive && "scale-110"
            )}>
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
              <div className="relative bg-primary/10 p-4 rounded-full">
                {isDragActive ? (
                  <Upload className="h-10 w-10 text-primary animate-bounce" />
                ) : (
                  <ImageIcon className="h-10 w-10 text-primary" />
                )}
              </div>
            </div>

            {/* Texto */}
            <div className="space-y-2">
              {isProcessing ? (
                <>
                  <p className="text-base font-semibold text-foreground">
                    Processando imagens...
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {processingCount} {processingCount === 1 ? 'restante' : 'restantes'}
                  </p>
                </>
              ) : isDragActive ? (
                <>
                  <p className="text-base font-semibold text-primary">
                    Solte as imagens aqui
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Upload automático ao soltar
                  </p>
                </>
              ) : (
                <>
                  <p className="text-base font-semibold text-foreground">
                    Arraste imagens ou clique para selecionar
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Upload individual ou múltiplo • JPG, PNG ou WEBP
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Redimensionamento automático para max 1500×1500px
                  </p>
                </>
              )}
            </div>

            {/* Estatísticas */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Check className="h-3 w-3" />
                Até {remainingSlots} {remainingSlots === 1 ? 'imagem' : 'imagens'}
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                Primeira = Principal
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dica inicial */}
      {images.length === 0 && (
        <div className="text-center p-6 bg-muted/30 rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Dica:</strong> A primeira imagem será exibida como destaque nas listagens de produtos
          </p>
        </div>
      )}
    </div>
  );
}

