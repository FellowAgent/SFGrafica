/**
 * Upload Garantido de Imagens para Supabase Storage
 * 
 * Este módulo usa EXCLUSIVAMENTE o cliente admin (Service Role Key) para fazer uploads,
 * garantindo que não haverá problemas com RLS ou tipo MIME.
 * 
 * Estrutura de pastas:
 * - produtos/{produtoId}/{produtoId}-{ordem}-{timestamp}.{ext} - para produtos existentes
 * - novos/{sessionId}/{ordem}-{timestamp}.{ext} - para produtos novos (temporário)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'produtos-imagens';

// Cache do cliente admin
let adminClient: SupabaseClient | null = null;

// Session ID para uploads de produtos novos
let currentSessionId: string | null = null;

/**
 * Obtém ou cria o cliente admin com Service Role Key
 */
function getAdminClient(): SupabaseClient | null {
  if (adminClient) {
    return adminClient;
  }

  // Obter URL do Supabase
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
  const url = supabaseUrl?.trim() || (projectId ? `https://${projectId}.supabase.co` : null);

  // Obter Service Role Key
  const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined;

  if (!url) {
    console.error('❌ VITE_SUPABASE_URL ou VITE_SUPABASE_PROJECT_ID não configurado');
    return null;
  }

  if (!serviceRoleKey) {
    console.error('❌ VITE_SUPABASE_SERVICE_ROLE_KEY não configurado');
    return null;
  }

  console.log('🔐 Criando cliente admin para uploads...');
  
  adminClient = createClient(url, serviceRoleKey.trim(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  console.log('✅ Cliente admin criado com sucesso');
  return adminClient;
}

/**
 * Resultado do upload garantido
 */
export interface GuaranteedUploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

/**
 * Verifica se o bucket existe e está configurado corretamente
 * Se não existir, tenta criar
 */
export async function ensureBucketExists(): Promise<{ exists: boolean; isPublic: boolean; error?: string }> {
  const client = getAdminClient();
  if (!client) {
    return { exists: false, isPublic: false, error: 'Cliente admin não disponível' };
  }

  try {
    console.log('🔍 Verificando bucket:', BUCKET_NAME);

    // Tentar listar o bucket
    const { data: buckets, error: listError } = await client.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Erro ao listar buckets:', listError);
      return { exists: false, isPublic: false, error: listError.message };
    }

    const bucket = buckets?.find(b => b.name === BUCKET_NAME);
    
    if (bucket) {
      console.log('✅ Bucket encontrado:', bucket.name, '| Público:', bucket.public);
      
      // Se não for público, tentar atualizar
      if (!bucket.public) {
        console.log('⚠️ Bucket não é público, tentando atualizar...');
        const { error: updateError } = await client.storage.updateBucket(BUCKET_NAME, {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
          fileSizeLimit: 10 * 1024 * 1024, // 10MB
        });
        
        if (updateError) {
          console.warn('⚠️ Não foi possível tornar bucket público:', updateError.message);
          return { exists: true, isPublic: false, error: updateError.message };
        }
        
        console.log('✅ Bucket atualizado para público');
        return { exists: true, isPublic: true };
      }
      
      return { exists: true, isPublic: bucket.public };
    }

    // Bucket não existe, tentar criar
    console.log('📦 Bucket não encontrado, criando...');
    const { error: createError } = await client.storage.createBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
    });

    if (createError) {
      console.error('❌ Erro ao criar bucket:', createError);
      return { exists: false, isPublic: false, error: createError.message };
    }

    console.log('✅ Bucket criado com sucesso');
    return { exists: true, isPublic: true };

  } catch (error: any) {
    console.error('❌ Erro ao verificar bucket:', error);
    return { exists: false, isPublic: false, error: error.message };
  }
}

/**
 * Converte File/Blob para ArrayBuffer e cria novo Blob com tipo MIME correto
 */
async function createCorrectBlob(file: File | Blob): Promise<Blob> {
  // Converter para ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  
  // Determinar tipo MIME correto
  let mimeType = 'image/jpeg';
  
  if (file instanceof File) {
    const ext = file.name.toLowerCase().split('.').pop();
    if (ext === 'png') mimeType = 'image/png';
    else if (ext === 'webp') mimeType = 'image/webp';
    else if (ext === 'gif') mimeType = 'image/gif';
  } else if (file.type && file.type.startsWith('image/')) {
    mimeType = file.type;
  }
  
  // Criar novo Blob com tipo MIME explícito
  const correctBlob = new Blob([arrayBuffer], { type: mimeType });
  
  console.log(`📦 Blob criado: tipo=${correctBlob.type}, tamanho=${correctBlob.size} bytes`);
  
  return correctBlob;
}

/**
 * Gera o session ID para uploads de produtos novos
 */
export function getOrCreateSessionId(): string {
  if (!currentSessionId) {
    currentSessionId = `session-${Date.now()}`;
  }
  return currentSessionId;
}

/**
 * Reseta o session ID (chamar após criar o produto)
 */
export function resetSessionId(): void {
  currentSessionId = null;
}

/**
 * Gera o caminho do arquivo no storage
 * 
 * Estrutura:
 * - produtos/{produtoId}/img-{ordem}-{timestamp}-{random}.{ext}
 * - Para produtos novos (sem ID): produtos/temp-{sessionId}/img-{ordem}-{timestamp}-{random}.{ext}
 */
function generateFilePath(
  produtoId: string | undefined,
  ordem: number,
  originalName?: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  
  let extension = 'jpg';
  if (originalName) {
    const ext = originalName.toLowerCase().split('.').pop();
    if (ext && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
      extension = ext === 'jpeg' ? 'jpg' : ext;
    }
  }
  
  // Nome do arquivo: img-{ordem}-{timestamp}-{random}.{ext}
  const fileName = `img-${String(ordem).padStart(2, '0')}-${timestamp}-${random}.${extension}`;
  
  if (produtoId) {
    // Produto existente: produtos/{produtoId}/img-{ordem}-{timestamp}-{random}.{ext}
    return `produtos/${produtoId}/${fileName}`;
  } else {
    // Produto novo: produtos/temp-{sessionId}/img-{ordem}-{timestamp}-{random}.{ext}
    const sessionId = getOrCreateSessionId();
    return `produtos/temp-${sessionId}/${fileName}`;
  }
}

/**
 * Upload garantido de uma imagem para o Supabase Storage
 * 
 * @param file - Arquivo ou Blob para upload
 * @param produtoId - ID do produto (opcional, se não fornecido usa pasta temporária)
 * @param ordem - Ordem da imagem (1, 2, 3...)
 * @param originalName - Nome original do arquivo (para determinar extensão)
 * @returns Resultado com URL pública ou erro
 */
export async function guaranteedUpload(
  file: File | Blob,
  produtoId?: string,
  ordem: number = 1,
  originalName?: string
): Promise<GuaranteedUploadResult> {
  console.log('='.repeat(50));
  console.log('🚀 INICIANDO UPLOAD GARANTIDO');
  console.log(`   Produto ID: ${produtoId || 'NOVO'}`);
  console.log(`   Ordem: ${ordem}`);
  console.log('='.repeat(50));

  try {
    // 1. Obter cliente admin
    const client = getAdminClient();
    if (!client) {
      return {
        success: false,
        error: 'Cliente admin não disponível. Configure VITE_SUPABASE_SERVICE_ROLE_KEY.',
      };
    }

    // 2. Verificar se bucket existe
    const bucketStatus = await ensureBucketExists();
    if (!bucketStatus.exists) {
      return {
        success: false,
        error: `Bucket não disponível: ${bucketStatus.error}`,
      };
    }

    // 3. Criar blob com tipo MIME correto
    console.log('📦 Preparando blob com tipo MIME correto...');
    const correctBlob = await createCorrectBlob(file);

    // 4. Gerar caminho do arquivo
    const name = file instanceof File ? file.name : originalName;
    const filePath = generateFilePath(produtoId, ordem, name);
    console.log(`📁 Caminho do arquivo: ${filePath}`);

    // 5. Fazer upload com retry
    let lastError: any = null;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`📤 Tentativa ${attempt}/${maxRetries}...`);
      
      const { data, error } = await client.storage
        .from(BUCKET_NAME)
        .upload(filePath, correctBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: correctBlob.type,
        });

      if (!error) {
        console.log('✅ Upload concluído:', data);

        // 6. Obter URL pública
        const { data: urlData } = client.storage
          .from(BUCKET_NAME)
          .getPublicUrl(filePath);

        if (!urlData?.publicUrl) {
          return {
            success: false,
            error: 'Não foi possível obter URL pública',
          };
        }

        console.log('🔗 URL pública:', urlData.publicUrl);
        console.log('='.repeat(50));

        return {
          success: true,
          url: urlData.publicUrl,
          path: filePath,
        };
      }

      lastError = error;
      console.warn(`⚠️ Tentativa ${attempt} falhou:`, error.message);
      
      if (attempt < maxRetries) {
        // Aguardar antes de tentar novamente (exponential backoff)
        const delay = Math.pow(2, attempt) * 500;
        console.log(`⏳ Aguardando ${delay}ms antes de tentar novamente...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.error('❌ Todas as tentativas falharam');
    return {
      success: false,
      error: `Erro no upload após ${maxRetries} tentativas: ${lastError?.message}`,
    };

  } catch (error: any) {
    console.error('❌ Erro inesperado:', error);
    return {
      success: false,
      error: `Erro inesperado: ${error.message}`,
    };
  }
}

/**
 * Move imagens da pasta temporária para a pasta do produto
 * 
 * Move de: produtos/temp-{sessionId}/img-{ordem}-{timestamp}.{ext}
 * Para: produtos/{produtoId}/img-{ordem}-{timestamp}.{ext}
 */
export async function moveImagesToProduct(
  tempUrls: string[],
  produtoId: string
): Promise<{ newUrls: string[]; errors: string[] }> {
  const client = getAdminClient();
  if (!client) {
    return { newUrls: [], errors: ['Cliente admin não disponível'] };
  }

  const newUrls: string[] = [];
  const errors: string[] = [];

  console.log(`📦 Movendo ${tempUrls.length} imagens para produto ${produtoId}...`);

  for (let i = 0; i < tempUrls.length; i++) {
    const url = tempUrls[i];
    const ordem = i + 1;

    try {
      // Extrair o path atual da URL
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/produtos-imagens\/(.+)$/);
      
      if (!pathMatch) {
        console.warn(`⚠️ Não foi possível extrair path da URL: ${url}`);
        newUrls.push(url); // Manter URL original
        continue;
      }

      const oldPath = decodeURIComponent(pathMatch[1]);
      
      // Se já está na pasta correta do produto, não precisa mover
      if (oldPath.startsWith(`produtos/${produtoId}/`)) {
        console.log(`✅ Imagem ${ordem} já está na pasta correta`);
        newUrls.push(url);
        continue;
      }

      // Gerar novo path mantendo o nome do arquivo original
      const fileName = oldPath.split('/').pop() || `img-${String(ordem).padStart(2, '0')}-${Date.now()}.jpg`;
      const newPath = `produtos/${produtoId}/${fileName}`;

      console.log(`📁 Movendo: ${oldPath} -> ${newPath}`);

      // Copiar arquivo para novo local
      const { error: copyError } = await client.storage
        .from(BUCKET_NAME)
        .copy(oldPath, newPath);

      if (copyError) {
        console.error(`❌ Erro ao copiar: ${copyError.message}`);
        errors.push(`Erro ao mover imagem ${ordem}: ${copyError.message}`);
        newUrls.push(url); // Manter URL original em caso de erro
        continue;
      }

      // Deletar arquivo antigo
      await client.storage
        .from(BUCKET_NAME)
        .remove([oldPath]);

      // Obter nova URL pública
      const { data: urlData } = client.storage
        .from(BUCKET_NAME)
        .getPublicUrl(newPath);

      if (urlData?.publicUrl) {
        console.log(`✅ Imagem ${ordem} movida com sucesso`);
        newUrls.push(urlData.publicUrl);
      } else {
        newUrls.push(url); // Fallback para URL original
      }

    } catch (error: any) {
      console.error(`❌ Erro ao mover imagem ${ordem}:`, error);
      errors.push(`Erro ao mover imagem ${ordem}: ${error.message}`);
      newUrls.push(url);
    }
  }

  return { newUrls, errors };
}

/**
 * Deleta uma imagem do storage
 */
export async function guaranteedDelete(url: string): Promise<boolean> {
  try {
    // Verificar se a URL é válida
    if (!url || typeof url !== 'string') {
      console.warn('⚠️ URL inválida para deletar:', url);
      return false;
    }

    // Ignorar URLs blob (temporárias)
    if (url.startsWith('blob:')) {
      console.log('ℹ️ Ignorando URL blob (temporária)');
      return true;
    }

    // Verificar se é uma URL do storage
    if (!url.includes('produtos-imagens')) {
      console.warn('⚠️ URL não é do storage de produtos:', url);
      return false;
    }

    const client = getAdminClient();
    if (!client) {
      console.error('❌ Cliente admin não disponível para deletar');
      return false;
    }

    // Extrair path da URL
    let filePath: string | null = null;
    
    try {
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/produtos-imagens\/(.+)$/);
      if (pathMatch) {
        filePath = decodeURIComponent(pathMatch[1]);
      }
    } catch (e) {
      console.warn('⚠️ Erro ao parsear URL:', e);
    }
    
    if (!filePath) {
      console.warn('⚠️ Não foi possível extrair path da URL:', url);
      return false;
    }

    console.log('🗑️ Deletando arquivo:', filePath);

    const { error } = await client.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      if (error.message?.includes('not found') || error.message?.includes('Not Found')) {
        console.log('ℹ️ Arquivo já não existe no storage');
        return true;
      }
      console.error('❌ Erro ao deletar:', error);
      return false;
    }

    console.log('✅ Arquivo deletado com sucesso');
    return true;

  } catch (error) {
    console.error('❌ Erro ao deletar imagem:', error);
    return false;
  }
}

/**
 * Deleta todas as imagens de um produto
 */
export async function deleteProductImages(produtoId: string): Promise<{ deleted: number; errors: string[] }> {
  const client = getAdminClient();
  if (!client) {
    return { deleted: 0, errors: ['Cliente admin não disponível'] };
  }

  const errors: string[] = [];
  let deleted = 0;

  try {
    console.log(`🗑️ Deletando todas as imagens do produto ${produtoId}...`);

    // Listar arquivos na pasta do produto
    const { data: files, error: listError } = await client.storage
      .from(BUCKET_NAME)
      .list(`produtos/${produtoId}`);

    if (listError) {
      console.error('❌ Erro ao listar arquivos:', listError);
      return { deleted: 0, errors: [listError.message] };
    }

    if (!files || files.length === 0) {
      console.log('ℹ️ Nenhuma imagem encontrada para deletar');
      return { deleted: 0, errors: [] };
    }

    // Deletar cada arquivo
    const paths = files.map(f => `produtos/${produtoId}/${f.name}`);
    
    const { error: deleteError } = await client.storage
      .from(BUCKET_NAME)
      .remove(paths);

    if (deleteError) {
      console.error('❌ Erro ao deletar arquivos:', deleteError);
      errors.push(deleteError.message);
    } else {
      deleted = files.length;
      console.log(`✅ ${deleted} imagens deletadas`);
    }

  } catch (error: any) {
    console.error('❌ Erro ao deletar imagens do produto:', error);
    errors.push(error.message);
  }

  return { deleted, errors };
}

/**
 * Limpa imagens órfãs (pastas temporárias antigas dentro de produtos/)
 * 
 * Limpa pastas: produtos/temp-session-{timestamp}/
 */
export async function cleanOrphanImages(maxAgeHours: number = 24): Promise<{ deleted: number; errors: string[] }> {
  const client = getAdminClient();
  if (!client) {
    return { deleted: 0, errors: ['Cliente admin não disponível'] };
  }

  const errors: string[] = [];
  let deleted = 0;

  try {
    console.log(`🧹 Limpando imagens órfãs (mais de ${maxAgeHours}h)...`);

    // Listar pastas em "produtos/"
    const { data: folders, error: listError } = await client.storage
      .from(BUCKET_NAME)
      .list('produtos');

    if (listError) {
      console.error('❌ Erro ao listar pastas:', listError);
      return { deleted: 0, errors: [listError.message] };
    }

    if (!folders || folders.length === 0) {
      console.log('ℹ️ Nenhuma pasta encontrada');
      return { deleted: 0, errors: [] };
    }

    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    const now = Date.now();

    for (const folder of folders) {
      // Verificar se é uma pasta temporária (temp-session-{timestamp})
      const match = folder.name.match(/^temp-session-(\d+)$/);
      if (!match) continue;

      const folderTimestamp = parseInt(match[1], 10);
      const age = now - folderTimestamp;

      if (age > maxAgeMs) {
        console.log(`🗑️ Removendo pasta órfã: ${folder.name} (${Math.round(age / 3600000)}h)`);

        // Listar arquivos na pasta
        const { data: files } = await client.storage
          .from(BUCKET_NAME)
          .list(`produtos/${folder.name}`);

        if (files && files.length > 0) {
          const paths = files.map(f => `produtos/${folder.name}/${f.name}`);
          const { error: deleteError } = await client.storage
            .from(BUCKET_NAME)
            .remove(paths);

          if (deleteError) {
            errors.push(`Erro ao deletar ${folder.name}: ${deleteError.message}`);
          } else {
            deleted += files.length;
          }
        }
      }
    }

    console.log(`✅ Limpeza concluída: ${deleted} arquivos removidos`);

  } catch (error: any) {
    console.error('❌ Erro na limpeza:', error);
    errors.push(error.message);
  }

  return { deleted, errors };
}

/**
 * Verifica se o cliente admin está disponível
 */
export function isUploadAvailable(): boolean {
  return getAdminClient() !== null;
}

/**
 * Redimensiona e compacta uma imagem antes do upload
 * Sempre converte para JPEG com compressão inteligente para reduzir tamanho
 */
export async function resizeImageForUpload(
  file: File,
  maxWidth: number = 1500,
  maxHeight: number = 1500,
  targetMaxSizeMB: number = 2
): Promise<Blob> {
  const originalSizeMB = file.size / (1024 * 1024);
  console.log(`📊 Imagem original: ${originalSizeMB.toFixed(2)}MB`);
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = async () => {
      let width = img.width;
      let height = img.height;

      console.log(`📐 Dimensões originais: ${width}x${height}`);

      // Calcular novas dimensões mantendo proporção
      const needsResize = width > maxWidth || height > maxHeight;
      
      if (needsResize) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
        console.log(`📐 Novas dimensões: ${width}x${height}`);
      }

      // Criar canvas e desenhar
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Não foi possível criar contexto do canvas'));
        return;
      }

      // Melhorar qualidade do redimensionamento
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Estratégia de compressão adaptativa
      // Sempre usar JPEG para melhor compressão
      const tryCompress = async (quality: number): Promise<Blob | null> => {
        return new Promise((res) => {
          canvas.toBlob(
            (blob) => res(blob),
            'image/jpeg',
            quality
          );
        });
      };

      // Tentar diferentes níveis de qualidade até atingir tamanho aceitável
      let finalBlob: Blob | null = null;
      const qualityLevels = [0.85, 0.75, 0.65, 0.55];
      
      for (const quality of qualityLevels) {
        const blob = await tryCompress(quality);
        if (!blob) continue;
        
        const sizeMB = blob.size / (1024 * 1024);
        console.log(`🔄 Tentativa com qualidade ${(quality * 100).toFixed(0)}%: ${sizeMB.toFixed(2)}MB`);
        
        finalBlob = blob;
        
        // Se o tamanho está bom OU é menor que o original, usar este
        if (sizeMB <= targetMaxSizeMB || sizeMB < originalSizeMB) {
          console.log(`✅ Qualidade ${(quality * 100).toFixed(0)}% aceita (${sizeMB.toFixed(2)}MB)`);
          break;
        }
      }

      if (!finalBlob) {
        // Fallback: usar a menor qualidade possível
        finalBlob = await tryCompress(0.5);
      }

      if (finalBlob) {
        const finalSizeMB = finalBlob.size / (1024 * 1024);
        const reduction = ((originalSizeMB - finalSizeMB) / originalSizeMB * 100);
        console.log(`✅ Imagem processada: ${finalSizeMB.toFixed(2)}MB (redução de ${reduction.toFixed(1)}%)`);
        resolve(finalBlob);
      } else {
        reject(new Error('Falha ao processar imagem'));
      }
      
      // Limpar objeto URL
      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Falha ao carregar imagem'));
    };

    img.src = URL.createObjectURL(file);
  });
}
