/**
 * Componente Simplificado de Upload de Imagens
 * 
 * Interface moderna e intuitiva para upload de imagens de produtos.
 * Layout: Imagem principal à esquerda + Grid 2x2 das outras imagens à direita.
 * Usa o sistema de upload garantido com Service Role Key.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDropzone } from 'react-dropzone';
import { toast } from '@/utils/toastHelper';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  useSimpleImageUpload, 
  generateImageId, 
  isValidImageFile,
  SimpleImageData 
} from '@/hooks/useSimpleImageUpload';
import { isUploadAvailable } from '@/utils/guaranteedUpload';
import { 
  Upload, 
  Image as ImageIcon, 
  Star, 
  Trash2, 
  GripVertical, 
  Check, 
  AlertCircle,
  Loader2,
  CloudUpload,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw
} from 'lucide-react';

/**
 * Props do componente
 */
interface SimpleImageUploaderProps {
  images: SimpleImageData[];
  onChange: (images: SimpleImageData[]) => void;
  produtoId?: string;
  maxImages?: number;
  autoUpload?: boolean;
}

/**
 * Card de imagem principal (grande, à esquerda)
 */
function MainImageCard({ 
  image, 
  onRemove,
  attributes,
  listeners,
  setNodeRef,
  style,
  isDragging
}: { 
  image: SimpleImageData; 
  onRemove: () => void;
  attributes: any;
  listeners: any;
  setNodeRef: any;
  style: any;
  isDragging: boolean;
}) {
  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "relative group rounded-2xl overflow-hidden border-3 transition-all duration-200 bg-card w-full h-full",
        "border-amber-400 shadow-xl shadow-amber-500/20",
        isDragging && "scale-[1.02] shadow-2xl z-50 ring-4 ring-amber-400/50",
        image.isUploading && "opacity-70"
      )}
    >
      {/* Imagem Principal - preenche o quadrado mantendo proporção */}
      <div className="absolute inset-0 bg-muted">
        <img
          src={image.preview || image.url}
          alt="Imagem principal do produto"
          className="w-full h-full object-cover"
        />
        
        {/* Overlay de hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200" />
        
        {/* Badge Principal */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <Badge className="bg-amber-500 text-white border-0 flex items-center gap-1.5 shadow-lg text-sm px-3 py-1">
              <Star className="h-4 w-4 fill-current" />
              Imagem Principal
            </Badge>
            
            {/* Badge de Status */}
            {image.isUploading && (
              <Badge className="bg-blue-500 text-white border-0 animate-pulse">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Enviando...
              </Badge>
            )}
            
            {image.uploadError && (
              <Badge className="bg-red-500 text-white border-0">
                <XCircle className="h-3 w-3 mr-1" />
                Erro
              </Badge>
            )}
            
            {!image.isUploading && !image.uploadError && image.url && (
              <Badge className="bg-emerald-500 text-white border-0">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Salva
              </Badge>
            )}
          </div>

          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing bg-background/90 backdrop-blur-sm rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        {/* Botão Remover */}
        <Button
          variant="destructive"
          size="icon"
          className="absolute bottom-3 right-3 h-10 w-10 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          disabled={image.isUploading}
        >
          <Trash2 className="h-5 w-5" />
        </Button>

        {/* Mensagem de erro */}
        {image.uploadError && (
          <div className="absolute bottom-0 left-0 right-0 bg-red-500/95 text-white text-sm p-3 backdrop-blur-sm">
            <p className="truncate">{image.uploadError}</p>
          </div>
        )}

        {/* Indicador de upload em progresso */}
        {image.isUploading && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <span className="text-lg font-medium">Enviando...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Card de imagem secundária (pequena, no grid 2x2)
 */
function SecondaryImageCard({ 
  image, 
  onRemove, 
  onSetPrincipal,
  attributes,
  listeners,
  setNodeRef,
  style,
  isDragging
}: { 
  image: SimpleImageData; 
  onRemove: () => void;
  onSetPrincipal: () => void;
  attributes: any;
  listeners: any;
  setNodeRef: any;
  style: any;
  isDragging: boolean;
}) {
  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "relative group rounded-xl overflow-hidden border-2 transition-all duration-200 bg-card w-full h-full",
        "border-border hover:border-primary/50",
        isDragging && "scale-105 shadow-2xl z-50 ring-2 ring-primary/50",
        image.isUploading && "opacity-70"
      )}
    >
      {/* Imagem - preenche o quadrado mantendo proporção */}
      <div className="absolute inset-0 bg-muted">
        <img
          src={image.preview || image.url}
          alt={`Imagem ${image.order} do produto`}
          className="w-full h-full object-cover"
        />
        
        {/* Overlay de hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200" />
        
        {/* Badges e Controles */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
          <div className="flex flex-col gap-1">
            {/* Badge de ordem - clicável para definir como principal */}
            <Badge 
              variant="secondary" 
              className="bg-background/90 backdrop-blur-sm shadow-md cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onSetPrincipal();
              }}
              title="Clique para definir como principal"
            >
              <Star className="h-3 w-3 mr-1 opacity-50" />
              {image.order}º
            </Badge>
            
            {/* Badge de Upload */}
            {image.isUploading && (
              <Badge className="bg-blue-500 text-white border-0 animate-pulse text-xs">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Enviando
              </Badge>
            )}
            
            {image.uploadError && (
              <Badge className="bg-red-500 text-white border-0 text-xs">
                <XCircle className="h-3 w-3 mr-1" />
                Erro
              </Badge>
            )}
            
            {!image.isUploading && !image.uploadError && image.url && (
              <Badge className="bg-emerald-500 text-white border-0 text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Salva
              </Badge>
            )}
          </div>

          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing bg-background/90 backdrop-blur-sm rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Botão Remover */}
        <Button
          variant="destructive"
          size="icon"
          className="absolute bottom-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          disabled={image.isUploading}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>

        {/* Indicador de upload em progresso */}
        {image.isUploading && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Wrapper sortable para imagens
 */
function SortableImage({ 
  image, 
  isMain, 
  onRemove, 
  onSetPrincipal 
}: { 
  image: SimpleImageData; 
  isMain: boolean;
  onRemove: () => void;
  onSetPrincipal: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: image.id 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isMain) {
    return (
      <MainImageCard
        image={image}
        onRemove={onRemove}
        attributes={attributes}
        listeners={listeners}
        setNodeRef={setNodeRef}
        style={style}
        isDragging={isDragging}
      />
    );
  }

  return (
    <SecondaryImageCard
      image={image}
      onRemove={onRemove}
      onSetPrincipal={onSetPrincipal}
      attributes={attributes}
      listeners={listeners}
      setNodeRef={setNodeRef}
      style={style}
      isDragging={isDragging}
    />
  );
}

/**
 * Slot vazio para adicionar imagem
 */
function EmptySlot({ onClick, slotNumber }: { onClick: () => void; slotNumber: number }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer w-full h-full",
        "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/10",
        "flex items-center justify-center bg-muted/20"
      )}
    >
      <div className="flex flex-col items-center gap-1 text-muted-foreground">
        <Plus className="h-6 w-6" />
        <span className="text-xs">{slotNumber}ª imagem</span>
      </div>
    </div>
  );
}

/**
 * Componente Principal
 */
export function SimpleImageUploader({ 
  images, 
  onChange, 
  produtoId,
  maxImages = 5,
  autoUpload = true
}: SimpleImageUploaderProps) {
  const { 
    isUploading, 
    progress, 
    isAvailable,
    processAndUpload,
    deleteImage,
    checkBucket
  } = useSimpleImageUpload();

  // Estado do bucket
  const [bucketStatus, setBucketStatus] = useState<{ checked: boolean; ok: boolean; error?: string }>({
    checked: false,
    ok: false
  });

  // Ref para rastrear o estado atual das imagens durante uploads paralelos
  const imagesRef = useRef<SimpleImageData[]>(images);
  
  // Manter ref atualizada
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const remainingSlots = maxImages - images.length;

  // Verificar disponibilidade do upload e bucket
  useEffect(() => {
    const checkUploadAvailability = async () => {
      if (!isUploadAvailable()) {
        console.warn('⚠️ Upload não disponível - Service Role Key não configurada');
        setBucketStatus({ checked: true, ok: false, error: 'Service Role Key não configurada' });
        return;
      }

      // Verificar bucket
      console.log('🔍 Verificando bucket...');
      const result = await checkBucket();
      
      if (result.exists && result.isPublic) {
        console.log('✅ Bucket verificado e pronto para uso');
        setBucketStatus({ checked: true, ok: true });
      } else {
        console.error('❌ Problema com bucket:', result.error);
        setBucketStatus({ checked: true, ok: false, error: result.error });
      }
    };

    checkUploadAvailability();
  }, [checkBucket]);

  // Handle seleção de arquivos - upload em paralelo
  const handleFilesSelected = useCallback(async (files: File[]) => {
    const validFiles = files.filter(file => {
      if (!isValidImageFile(file)) {
        toast.error(`${file.name}: Formato não suportado. Use JPG, PNG, WEBP ou GIF.`);
        return false;
      }
      return true;
    });

    const currentRemaining = maxImages - imagesRef.current.length;
    
    if (validFiles.length > currentRemaining) {
      toast.error(`Você pode adicionar no máximo ${currentRemaining} ${currentRemaining === 1 ? 'imagem' : 'imagens'}`);
      validFiles.splice(currentRemaining);
    }

    if (validFiles.length === 0) return;

    // Criar todas as imagens temporárias de uma vez
    const startOrder = imagesRef.current.length + 1;
    const tempImages: SimpleImageData[] = validFiles.map((file, index) => {
      const currentCount = imagesRef.current.length + index;
      return {
        id: generateImageId(),
        url: '',
        preview: URL.createObjectURL(file),
        isPrincipal: currentCount === 0,
        order: currentCount + 1,
        isUploading: true,
      };
    });

    // Adicionar todas as imagens temporárias ao estado
    const newImages = [...imagesRef.current, ...tempImages];
    onChange(newImages);
    imagesRef.current = newImages;

    if (autoUpload) {
      // Fazer upload de todas as imagens em paralelo
      // Usa produtoId se existir, senão usa undefined para pasta temporária
      const uploadPromises = validFiles.map(async (file, index) => {
        const tempImage = tempImages[index];
        const ordem = startOrder + index;
        
        try {
          // Passar produtoId (ou undefined) e ordem para o upload
          const result = await processAndUpload(file, produtoId, ordem);
          
          return {
            tempId: tempImage.id,
            success: result.success,
            url: result.url,
            path: result.path,
            error: result.error,
          };
        } catch (error: any) {
          console.error(`❌ Erro no upload da imagem ${ordem}:`, error);
          return {
            tempId: tempImage.id,
            success: false,
            url: undefined,
            error: error.message,
          };
        }
      });

      // Aguardar todos os uploads
      const results = await Promise.all(uploadPromises);

      // Atualizar todas as imagens com os resultados
      const finalImages = imagesRef.current.map(img => {
        const result = results.find(r => r.tempId === img.id);
        if (result) {
          if (result.success && result.url) {
            return { 
              ...img, 
              url: result.url, 
              preview: result.url, 
              path: result.path,
              isUploading: false,
              uploadError: undefined 
            };
          } else {
            return { ...img, isUploading: false, uploadError: result.error || 'Erro desconhecido' };
          }
        }
        return img;
      });

      onChange(finalImages);
      imagesRef.current = finalImages;

      // Mostrar resumo
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      if (successCount > 0 && errorCount === 0) {
        toast.success(`${successCount} ${successCount === 1 ? 'imagem enviada' : 'imagens enviadas'} com sucesso!`);
      } else if (successCount > 0 && errorCount > 0) {
        toast.warning(`${successCount} enviadas, ${errorCount} falharam`);
      } else if (errorCount > 0) {
        toast.error(`Falha ao enviar ${errorCount} ${errorCount === 1 ? 'imagem' : 'imagens'}. Verifique o console para detalhes.`);
      }
    }
  }, [maxImages, autoUpload, produtoId, processAndUpload, onChange]);

  // Drag and Drop reordenação
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
      
      if (oldIndex !== 0 && newIndex === 0) {
        toast.success('Nova imagem principal definida!');
      } else if (oldIndex === 0 && newIndex !== 0) {
        toast.success('Imagem principal alterada!');
      }
    }
  }, [images, onChange]);

  // Definir imagem como principal
  const handleSetPrincipal = useCallback((id: string) => {
    const index = images.findIndex(img => img.id === id);
    if (index === -1 || index === 0) return;

    const reordered = arrayMove(images, index, 0);
    const updated = reordered.map((img, i) => ({
      ...img,
      isPrincipal: i === 0,
      order: i + 1,
    }));

    onChange(updated);
    toast.success('Nova imagem principal definida!');
  }, [images, onChange]);

  // Remover imagem
  const handleRemove = useCallback(async (id: string) => {
    const image = images.find(img => img.id === id);
    
    if (!image) {
      console.warn('⚠️ Imagem não encontrada para remover:', id);
      return;
    }

    console.log('🗑️ Removendo imagem:', { id, url: image.url?.substring(0, 50) });

    // Remover imediatamente do estado para feedback visual
    const filtered = images.filter(img => img.id !== id);
    const updated = filtered.map((img, index) => ({
      ...img,
      isPrincipal: index === 0,
      order: index + 1,
    }));

    onChange(updated);
    imagesRef.current = updated;
    
    // Tentar deletar do storage em background (não bloquear UI)
    if (image.url && image.url.includes('produtos-imagens') && !image.url.startsWith('blob:')) {
      deleteImage(image.url).then(deleted => {
        if (deleted) {
          console.log('✅ Imagem deletada do storage');
        } else {
          console.warn('⚠️ Não foi possível deletar do storage (será limpo depois)');
        }
      });
    }

    // Limpar preview blob se existir
    if (image.preview && image.preview.startsWith('blob:')) {
      URL.revokeObjectURL(image.preview);
    }

    toast.success('Imagem removida');
  }, [images, onChange, deleteImage]);

  // Dropzone config
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: handleFilesSelected,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif']
    },
    maxFiles: remainingSlots,
    disabled: isUploading || remainingSlots === 0,
    multiple: true,
    noClick: images.length > 0, // Desabilitar clique se já houver imagens
  });

  // Separar imagem principal das secundárias
  const mainImage = images[0];
  const secondaryImages = images.slice(1);

  // Alerta se Service Role Key não está configurada
  if (!isAvailable) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Upload Indisponível</AlertTitle>
        <AlertDescription>
          <p className="mb-2">
            A chave de serviço (Service Role Key) do Supabase não está configurada.
          </p>
          <p className="text-sm opacity-80">
            Adicione <code className="bg-red-950 px-1 rounded">VITE_SUPABASE_SERVICE_ROLE_KEY</code> ao seu arquivo <code className="bg-red-950 px-1 rounded">.env</code>
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Imagens do Produto
          </h3>
          <p className="text-sm text-muted-foreground">
            {images.length === 0 
              ? 'Adicione até 5 imagens do produto'
              : `${images.length} de ${maxImages} ${images.length === 1 ? 'imagem' : 'imagens'}`}
          </p>
        </div>
        
        {images.length > 0 && (
          <Badge variant="outline" className="text-xs gap-1">
            <GripVertical className="h-3 w-3" />
            Arraste para reordenar
          </Badge>
        )}
      </div>

      {/* Barra de progresso durante upload */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando imagens...
            </span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Layout Principal: Imagem grande + Grid 2x2 */}
      {images.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={images.map(img => img.id)}>
            {/* Layout flex: imagem principal + grid 2x2 */}
            <div className="flex gap-3">
              {/* Imagem Principal (quadrado grande) */}
              <div className="flex-shrink-0" style={{ width: 'calc(50% - 6px)' }}>
                <div className="aspect-square w-full">
                  <SortableImage
                    image={mainImage}
                    isMain={true}
                    onRemove={() => handleRemove(mainImage.id)}
                    onSetPrincipal={() => {}}
                  />
                </div>
              </div>

              {/* Grid 2x2 para slots secundários */}
              <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3">
                {[0, 1, 2, 3].map((slotIndex) => {
                  const image = secondaryImages[slotIndex];
                  const slotNumber = slotIndex + 2;
                  
                  if (image) {
                    return (
                      <div key={image.id} className="aspect-square w-full">
                        <SortableImage
                          image={image}
                          isMain={false}
                          onRemove={() => handleRemove(image.id)}
                          onSetPrincipal={() => handleSetPrincipal(image.id)}
                        />
                      </div>
                    );
                  }
                  
                  // Slot vazio (se ainda pode adicionar)
                  if (images.length < maxImages) {
                    return (
                      <div key={`empty-${slotIndex}`} className="aspect-square w-full">
                        <EmptySlot 
                          onClick={open}
                          slotNumber={slotNumber}
                        />
                      </div>
                    );
                  }
                  
                  return null;
                })}
              </div>
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        /* Área de Upload quando não há imagens */
        <div
          {...getRootProps()}
          className={cn(
            "relative border-2 border-dashed rounded-2xl p-8 md:p-12 text-center cursor-pointer transition-all duration-300",
            "bg-gradient-to-br from-background to-muted/30",
            isDragActive 
              ? "border-primary bg-primary/5 scale-[1.01] shadow-xl shadow-primary/10" 
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/5",
            isUploading && "opacity-50 cursor-not-allowed pointer-events-none"
          )}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center gap-5">
            {/* Ícone animado */}
            <div className={cn(
              "relative transition-all duration-300",
              isDragActive && "scale-110 -translate-y-1"
            )}>
              {/* Glow effect */}
              <div className={cn(
                "absolute inset-0 rounded-full blur-2xl transition-opacity duration-300",
                isDragActive ? "bg-primary/30 opacity-100" : "bg-primary/10 opacity-0"
              )} />
              
              {/* Icon container */}
              <div className={cn(
                "relative p-5 rounded-2xl transition-all duration-300",
                isDragActive 
                  ? "bg-primary text-primary-foreground shadow-lg" 
                  : "bg-primary/10 text-primary"
              )}>
                {isDragActive ? (
                  <CloudUpload className="h-12 w-12 animate-bounce" />
                ) : (
                  <Upload className="h-12 w-12" />
                )}
              </div>
            </div>

            {/* Texto */}
            <div className="space-y-2 max-w-md">
              {isDragActive ? (
                <>
                  <p className="text-xl font-semibold text-primary">
                    Solte as imagens aqui
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Upload automático ao soltar
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xl font-semibold text-foreground">
                    Arraste imagens ou clique para selecionar
                  </p>
                  <p className="text-sm text-muted-foreground">
                    JPG, PNG, WEBP ou GIF • Redimensionamento automático
                  </p>
                </>
              )}
            </div>

            {/* Info badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
              <Badge variant="secondary" className="gap-1.5 py-1">
                <Check className="h-3 w-3" />
                Até 5 imagens
              </Badge>
              <Badge variant="secondary" className="gap-1.5 py-1">
                <Star className="h-3 w-3" />
                Primeira = Principal
              </Badge>
              <Badge variant="secondary" className="gap-1.5 py-1">
                <CloudUpload className="h-3 w-3" />
                Upload direto
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Dropzone invisível quando há imagens (para arrastar sobre a área) */}
      {images.length > 0 && remainingSlots > 0 && (
        <div {...getRootProps()} className="hidden">
          <input {...getInputProps()} />
        </div>
      )}

      {/* Dica */}
      {images.length === 0 && (
        <div className="text-center p-4 bg-muted/30 rounded-xl border border-dashed">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Dica:</strong> A primeira imagem será exibida como destaque nas listagens
          </p>
        </div>
      )}

      {images.length > 0 && images.length < maxImages && (
        <div className="text-center p-3 bg-muted/20 rounded-lg">
          <p className="text-sm text-muted-foreground">
            💡 Clique nos slots vazios ou arraste mais imagens para adicionar (máximo {maxImages})
          </p>
        </div>
      )}

      {/* Status de imagens */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          {images.some(img => img.isUploading) && (
            <Badge variant="outline" className="gap-1 text-blue-600 border-blue-300">
              <Loader2 className="h-3 w-3 animate-spin" />
              {images.filter(img => img.isUploading).length} enviando
            </Badge>
          )}
          {images.some(img => img.uploadError) && (
            <Badge variant="outline" className="gap-1 text-red-600 border-red-300">
              <XCircle className="h-3 w-3" />
              {images.filter(img => img.uploadError).length} com erro
            </Badge>
          )}
          {images.some(img => img.url && !img.isUploading && !img.uploadError) && (
            <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-300">
              <CheckCircle2 className="h-3 w-3" />
              {images.filter(img => img.url && !img.isUploading && !img.uploadError).length} salvas
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
