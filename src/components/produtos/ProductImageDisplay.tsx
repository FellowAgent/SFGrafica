/**
 * Componente para exibir imagens de produtos
 * Suporta múltiplas imagens e mostra indicador de quantidade
 * Com preview interativo e navegação por teclado
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Images, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';

interface ProductImageDisplayProps {
  produto: {
    id: string;
    nome: string;
    imagem_url?: string;
    imagens?: string[];
  };
  size?: 'sm' | 'md' | 'lg' | 'full';
  showImageCount?: boolean;
  className?: string;
}

export function ProductImageDisplay({
  produto,
  size = 'md',
  showImageCount = true,
  className,
}: ProductImageDisplayProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHoverCardOpen, setIsHoverCardOpen] = useState(false);

  // Determinar array de imagens (memoizado para performance)
  const images = useMemo(() => {
    if (produto.imagens && produto.imagens.length > 0) {
      return produto.imagens;
    }
    if (produto.imagem_url) {
      return [produto.imagem_url];
    }
    return [];
  }, [produto.imagens, produto.imagem_url]);

  const hasMultipleImages = images.length > 1;
  const hasImages = images.length > 0;
  const currentImage = images[currentImageIndex] || produto.imagem_url;

  // Navegação entre imagens
  const handleNextImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const handlePrevImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const handleSelectImage = useCallback((index: number) => {
    setCurrentImageIndex(index);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isHoverCardOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextImage();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHoverCardOpen, handleNextImage, handlePrevImage]);

  // Tamanhos
  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-12 w-12',
    lg: 'h-24 w-24',
    full: 'w-full h-full',
  };

  const fallbackClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-2xl',
    full: 'text-4xl',
  };

  // Se não tem nenhuma imagem, renderizar apenas fallback
  if (!hasImages) {
    return (
      <Avatar className={cn(sizeClasses[size], size === 'full' ? 'rounded-none' : 'rounded-md', className)}>
        <AvatarFallback className={cn(size === 'full' ? 'rounded-none' : 'rounded-md', 'bg-accent', fallbackClasses[size])}>
          {produto.nome.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    );
  }

  // Com imagens, renderizar com hover card para preview
  // LISTA: Hover na imagem abre preview
  // GRID: Hover no badge (se múltiplas) ou imagem (se única) abre preview
  return (
    <HoverCard openDelay={300} onOpenChange={setIsHoverCardOpen}>
      <div className={cn('relative', className)}>
        {size !== 'full' ? (
          // Modo LISTA: Container com imagem + badge como trigger
          <HoverCardTrigger asChild>
            <div className="relative cursor-pointer group">
              <Avatar className={cn(sizeClasses[size], 'rounded-md')}>
                <AvatarImage 
                  src={currentImage} 
                  loading="lazy" 
                  alt={produto.nome}
                />
                <AvatarFallback className={cn('rounded-md bg-accent', fallbackClasses[size])}>
                  {produto.nome.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Badge com pointer-events-none no modo lista - só mostrar se múltiplas imagens */}
              {showImageCount && hasMultipleImages && (
                <Badge
                  variant="secondary"
                  className="absolute -bottom-1 -right-3 h-4 min-w-4 px-1 text-[10px] font-medium bg-muted text-muted-foreground shadow-sm pointer-events-none backdrop-blur-sm flex items-center justify-center"
                >
                  {images.length}
                </Badge>
              )}
            </div>
          </HoverCardTrigger>
        ) : (
          // Modo GRID: Avatar isolado + Badge como trigger
          <>
            <Avatar className={cn(sizeClasses[size], 'rounded-none')}>
              <AvatarImage 
                src={currentImage} 
                loading="lazy" 
                alt={produto.nome}
                className="object-cover"
              />
              <AvatarFallback className={cn('rounded-none bg-accent', fallbackClasses[size])}>
                {produto.nome.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Badge como trigger no modo grid - só mostrar se múltiplas imagens */}
            {showImageCount && hasMultipleImages && (
              <HoverCardTrigger asChild>
                <Badge
                  variant="secondary"
                  className="absolute bottom-2 right-2 h-5 min-w-5 px-1.5 text-[11px] font-medium bg-muted/90 text-muted-foreground shadow-md cursor-pointer backdrop-blur-sm hover:bg-muted hover:scale-105 transition-all flex items-center justify-center"
                  aria-label={`Ver ${images.length} imagens`}
                >
                  {images.length}
                </Badge>
              </HoverCardTrigger>
            )}
          </>
        )}
      </div>

      <HoverCardContent 
        side={size === 'full' ? 'left' : 'right'} 
        align="start" 
        className="w-80 p-4 z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-right-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
      >
        <div className="space-y-3">
          {/* Título */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Images className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">
                {hasMultipleImages ? `${images.length} Imagens` : 'Imagem do Produto'}
              </h4>
            </div>
            {hasMultipleImages && (
              <p className="text-xs text-muted-foreground font-medium">
                {currentImageIndex + 1}/{images.length}
              </p>
            )}
          </div>

          {/* Preview da imagem atual com navegação */}
          <div className="relative aspect-square rounded-lg overflow-hidden bg-muted group/preview">
            <img
              src={currentImage}
              alt={`${produto.nome} - Imagem ${hasMultipleImages ? currentImageIndex + 1 : ''}`}
              className="w-full h-full object-cover transition-opacity duration-300"
              loading="lazy"
            />
            
            {/* Setas de navegação - só para múltiplas imagens */}
            {hasMultipleImages && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevImage();
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover/preview:opacity-100 transition-opacity hover:bg-background"
                  aria-label="Imagem anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextImage();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover/preview:opacity-100 transition-opacity hover:bg-background"
                  aria-label="Próxima imagem"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Miniaturas e dica de navegação - só para múltiplas imagens */}
          {hasMultipleImages && (
            <>
              <div className="grid grid-cols-5 gap-2">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectImage(index);
                    }}
                    className={cn(
                      'relative aspect-square rounded-md overflow-hidden border-2 transition-all duration-200',
                      currentImageIndex === index
                        ? 'border-primary ring-2 ring-primary/20 scale-105'
                        : 'border-border hover:border-primary/50 hover:scale-105'
                    )}
                    aria-label={`Ver imagem ${index + 1}`}
                  >
                    <img
                      src={img}
                      alt={`${produto.nome} - Miniatura ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {currentImageIndex === index && (
                      <div className="absolute inset-0 bg-primary/10" />
                    )}
                  </button>
                ))}
              </div>

              {/* Dica de navegação */}
              <div className="flex items-center justify-center gap-2 pt-1">
                <p className="text-xs text-muted-foreground text-center">
                  Use <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded border">←</kbd> <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded border">→</kbd> para navegar
                </p>
              </div>
            </>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

