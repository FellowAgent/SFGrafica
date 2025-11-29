import { useState, useCallback } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from '@/utils/toastHelper';
import { ImagePreviewCard } from './ImagePreviewCard';
import { UploadDropzone } from './UploadDropzone';
import { resizeImage, isValidImageType } from '@/utils/imageProcessing';

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
}

interface ModernImageUploadProps {
  images: ImageData[];
  onChange: (images: ImageData[]) => void;
  maxImages?: number;
}

function SortableImageCard({ image, onRemove }: { image: ImageData; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: image.id 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ImagePreviewCard
        id={image.id}
        preview={image.preview}
        isPrincipal={image.isPrincipal}
        order={image.order}
        size={image.size}
        dimensions={image.dimensions}
        isProcessing={image.isProcessing}
        onRemove={onRemove}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export function ModernImageUpload({ images, onChange, maxImages = 5 }: ModernImageUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const processImage = async (file: File): Promise<ImageData | null> => {
    try {
      // Validar tipo
      if (!isValidImageType(file)) {
        toast.error(`${file.name}: Formato não suportado. Use JPG, PNG ou WEBP.`);
        return null;
      }

      // Processar imagem
      const processed = await resizeImage(file, 1500, 1500, 0.9);

      // Criar URL temporário para preview (já redimensionada)
      const previewUrl = URL.createObjectURL(processed.blob);

      return {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file, // mantemos o arquivo original apenas para metadados (nome, type)
        blob: processed.blob, // usamos o blob redimensionado para upload
        url: previewUrl, // URL apenas para preview/local
        preview: previewUrl, // URL para exibição imediata
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
  };

  const handleFilesSelected = useCallback(async (files: File[]) => {
    setIsProcessing(true);

    const newImages: ImageData[] = [];
    
    for (const file of files) {
      const processedImage = await processImage(file);
      if (processedImage) {
        newImages.push(processedImage);
      }
    }

    if (newImages.length > 0) {
      const updatedImages = [...images, ...newImages].slice(0, maxImages);
      
      // Reorganizar ordens
      const reorderedImages = updatedImages.map((img, index) => ({
        ...img,
        isPrincipal: index === 0,
        order: index + 1,
      }));

      onChange(reorderedImages);
      toast.success(`${newImages.length} ${newImages.length === 1 ? 'imagem adicionada' : 'imagens adicionadas'}`);
    }

    setIsProcessing(false);
  }, [images, onChange, maxImages]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((img) => img.id === active.id);
      const newIndex = images.findIndex((img) => img.id === over.id);
      
      const reordered = arrayMove(images, oldIndex, newIndex);
      
      // Atualizar isPrincipal e order
      const updated = reordered.map((img, index) => ({
        ...img,
        isPrincipal: index === 0,
        order: index + 1,
      }));

      onChange(updated);
      toast.success('Ordem das imagens atualizada');
    }
  };

  const handleRemove = (id: string) => {
    const filtered = images.filter(img => img.id !== id);
    
    // Reorganizar
    const updated = filtered.map((img, index) => ({
      ...img,
      isPrincipal: index === 0,
      order: index + 1,
    }));

    onChange(updated);
    toast.success('Imagem removida');
  };

  const principalImage = images.find(img => img.isPrincipal);
  const additionalImages = images.filter(img => !img.isPrincipal);

  return (
    <div className="space-y-6">
      {images.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={images.map(img => img.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {images.map((image) => (
                <SortableImageCard
                  key={image.id}
                  image={image}
                  onRemove={() => handleRemove(image.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Zona de Upload */}
      <UploadDropzone
        onFilesSelected={handleFilesSelected}
        maxFiles={maxImages}
        currentCount={images.length}
        disabled={isProcessing}
      />

      {/* Ajuda */}
      {images.length === 0 && (
        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>💡 A primeira imagem será a imagem principal do produto</p>
          <p>Arraste as imagens para reordenar • Clique no X para remover</p>
        </div>
      )}
    </div>
  );
}
