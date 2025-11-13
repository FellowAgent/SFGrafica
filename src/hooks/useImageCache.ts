import { useEffect, useRef } from 'react';

// Cache global de imagens usando Map para melhor performance
const imageCache = new Map<string, HTMLImageElement>();
const loadingImages = new Set<string>();

export const useImageCache = () => {
  const preloadImage = (url: string): Promise<void> => {
    // Se já está em cache ou carregando, não fazer nada
    if (imageCache.has(url) || loadingImages.has(url)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      loadingImages.add(url);
      
      const img = new Image();
      
      img.onload = () => {
        imageCache.set(url, img);
        loadingImages.delete(url);
        resolve();
      };
      
      img.onerror = () => {
        loadingImages.delete(url);
        reject(new Error(`Failed to load image: ${url}`));
      };
      
      img.src = url;
    });
  };

  const preloadImages = async (urls: string[]) => {
    const validUrls = urls.filter(url => url && url.trim() !== '');
    await Promise.allSettled(validUrls.map(url => preloadImage(url)));
  };

  const isImageCached = (url: string): boolean => {
    return imageCache.has(url);
  };

  const clearCache = () => {
    imageCache.clear();
    loadingImages.clear();
  };

  return {
    preloadImage,
    preloadImages,
    isImageCached,
    clearCache,
  };
};

// Hook para pré-carregar imagens de avatares e produtos adjacentes
export const useAdjacentCardsPreload = (
  items: any[],
  currentIndex: number,
  range: number = 3
) => {
  const { preloadImages } = useImageCache();
  const lastPreloadedRef = useRef<string[]>([]);

  useEffect(() => {
    const imagesToPreload: string[] = [];
    
    // Calcular range de índices para pré-carregar
    const startIndex = Math.max(0, currentIndex - range);
    const endIndex = Math.min(items.length - 1, currentIndex + range);
    
    // Coletar URLs de imagens dos cards adjacentes
    for (let i = startIndex; i <= endIndex; i++) {
      const item = items[i];
      
      // Avatar do vendedor
      if (item?.avatarUrl) {
        imagesToPreload.push(item.avatarUrl);
      }
      
      // Imagens de produtos
      if (item?.produtos && Array.isArray(item.produtos)) {
        item.produtos.forEach((produto: any) => {
          if (produto?.produtos?.imagem_url) {
            imagesToPreload.push(produto.produtos.imagem_url);
          }
        });
      }
    }
    
    // Filtrar apenas URLs que ainda não foram pré-carregadas
    const newUrls = imagesToPreload.filter(
      url => !lastPreloadedRef.current.includes(url)
    );
    
    if (newUrls.length > 0) {
      preloadImages(newUrls).catch(err => {
        console.warn('Erro ao pré-carregar imagens:', err);
      });
      
      lastPreloadedRef.current = imagesToPreload;
    }
  }, [items, currentIndex, range, preloadImages]);
};
