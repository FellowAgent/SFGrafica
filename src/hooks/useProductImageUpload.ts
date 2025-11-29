import { useState } from 'react';
import { supabase } from '@/integrations/supabase';
import { getSupabaseAdminClient } from '@/integrations/supabase/adminClient';
import { toast } from '@/utils/toastHelper';
import { ensureCorrectMimeType } from '@/utils/imageProcessing';

export interface ImageData {
  id: string;
  file?: File;
  blob?: Blob;
  url?: string;
  preview: string;
  isPrincipal: boolean;
  order: number;
  dimensions?: {
    width: number;
    height: number;
  };
  size?: number;
  uploadStatus?: 'pending' | 'uploading' | 'success' | 'error';
  uploadError?: string;
}

export interface UploadResult {
  success: boolean;
  uploadedUrls: string[];
  errors: Array<{ imageId: string; error: string }>;
}

interface UseProductImageUploadReturn {
  uploadImages: (images: ImageData[], produtoId?: string) => Promise<UploadResult>;
  deleteImage: (url: string) => Promise<void>;
  deleteAllImages: (produtoId: string) => Promise<void>;
  isUploading: boolean;
  uploadProgress: number;
}

export function useProductImageUpload(): UseProductImageUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadImages = async (images: ImageData[], produtoId?: string): Promise<UploadResult> => {
    const result: UploadResult = {
      success: false,
      uploadedUrls: [],
      errors: [],
    };

    if (!images || images.length === 0) {
      console.log('📸 Upload: Nenhuma imagem para enviar');
      result.success = true;
      return result;
    }

    console.log('='.repeat(60));
    console.log(`📸 INICIANDO UPLOAD DE ${images.length} IMAGENS`);
    console.log('='.repeat(60));
    console.log('Detalhes das imagens:', images.map((img, i) => ({
      index: i,
      id: img.id,
      hasUrl: !!img.url,
      hasBlob: !!img.blob,
      hasFile: !!img.file,
      isPrincipal: img.isPrincipal,
      order: img.order,
      size: img.size,
    })));
    
    setIsUploading(true);
    setUploadProgress(0);

    const totalImages = images.length;

    try {
      // Verificar se bucket existe (método mais robusto)
      console.log('🔍 Verificando se bucket "produtos-imagens" existe...');

      // Método 1: Tentar listar arquivos (mais confiável)
      const { error: bucketCheckError } = await supabase.storage
        .from('produtos-imagens')
        .list('', { limit: 1 });

      // Método 2: Tentar obter URL pública (fallback)
      let bucketExists = false;
      let canList = false;

      if (!bucketCheckError) {
        // Se conseguiu listar, bucket existe e tem permissão
        bucketExists = true;
        canList = true;
        console.log('✅ Bucket "produtos-imagens" existe e está acessível');
      } else if (bucketCheckError.message?.toLowerCase().includes('bucket not found') ||
                 bucketCheckError.message?.toLowerCase().includes('not found')) {
        // Bucket realmente não existe
        bucketExists = false;
        console.error('❌ Bucket "produtos-imagens" não existe:', bucketCheckError.message);
      } else if (bucketCheckError.message?.toLowerCase().includes('permission') ||
                 bucketCheckError.message?.toLowerCase().includes('denied') ||
                 bucketCheckError.message?.toLowerCase().includes('unauthorized')) {
        // Bucket existe mas sem permissão de listagem - testar via URL pública
        console.log('⚠️ Sem permissão de listagem, testando via URL pública...');

        try {
          const { data: urlData } = supabase.storage
            .from('produtos-imagens')
            .getPublicUrl('test.jpg');

          if (urlData?.publicUrl && urlData.publicUrl.includes('produtos-imagens')) {
            bucketExists = true;
            console.log('✅ Bucket "produtos-imagens" existe (confirmado via URL)');
          } else {
            bucketExists = false;
            console.warn('⚠️ Não foi possível confirmar existência via URL');
          }
        } catch (urlError) {
          console.warn('⚠️ Erro ao testar via URL pública:', urlError);
          // Em caso de dúvida, assumir que existe e tentar upload
          bucketExists = true;
        }
      } else {
        // Outro tipo de erro - assumir que bucket existe e tentar upload
        console.warn('⚠️ Erro inesperado na verificação:', bucketCheckError.message);
        bucketExists = true;
      }

      if (!bucketExists) {
        const errorMsg = 'Bucket "produtos-imagens" não existe. Crie o bucket no Supabase Storage primeiro.';
        console.error('❌', errorMsg);
        console.error('📋 Para criar o bucket:');
        console.error('   1. Acesse https://supabase.com/dashboard → Storage');
        console.error('   2. Clique em "New bucket"');
        console.error('   3. Nome: produtos-imagens');
        console.error('   4. Marque como público');
        toast.error(errorMsg, { duration: 8000 });
        result.errors.push({ imageId: 'all', error: errorMsg });
        return result;
      }

      console.log(`✅ Bucket verificado - Existe: ${bucketExists}, Pode listar: ${canList}`);

      // Usar ID temporário se não tiver produtoId ainda
      const folder = produtoId || `temp-${Date.now()}`;
      console.log(`📁 Pasta de upload: ${folder}`);

      // Função auxiliar para upload com fallback para admin client
      const uploadWithFallback = async (
        fileName: string,
        blob: Blob,
        contentType: string
      ): Promise<{ data: any; error: any; usedAdminClient: boolean }> => {
        // Garantir tipo MIME correto antes do upload
        console.log(`🔍 Verificando tipo MIME antes do upload...`);
        console.log(`   Tipo original: ${blob.type}`);
        console.log(`   ContentType esperado: ${contentType}`);
        
        const correctedBlob = await ensureCorrectMimeType(blob, contentType);
        console.log(`   Tipo após correção: ${correctedBlob.type}`);

        // Tentar upload com cliente anon primeiro
        console.log(`📤 Tentando upload com cliente anon...`);
        const { data, error } = await supabase.storage
          .from('produtos-imagens')
          .upload(fileName, correctedBlob, {
            cacheControl: '3600',
            upsert: false,
            contentType: correctedBlob.type || contentType,
          });

        // Se sucesso, retornar
        if (!error) {
          console.log(`✅ Upload bem-sucedido com cliente anon`);
          return { data, error: null, usedAdminClient: false };
        }

        // Verificar se o erro é de tipo MIME ou permissão
        const isMimeError = error.message?.toLowerCase().includes('mime') ||
                           error.message?.toLowerCase().includes('content-type') ||
                           error.message?.toLowerCase().includes('text/plain');
        const isPermissionError = error.message?.toLowerCase().includes('permission') ||
                                 error.message?.toLowerCase().includes('denied') ||
                                 error.message?.toLowerCase().includes('unauthorized') ||
                                 error.message?.toLowerCase().includes('row-level security');

        // Se for erro de tipo MIME ou permissão, tentar com admin client
        if ((isMimeError || isPermissionError) && getSupabaseAdminClient()) {
          console.log(`⚠️ Upload falhou com cliente anon (${isMimeError ? 'tipo MIME' : 'permissão'})`);
          console.log(`🔐 Tentando upload com cliente admin...`);
          
          const adminClient = getSupabaseAdminClient();
          if (adminClient) {
            const { data: adminData, error: adminError } = await adminClient.storage
              .from('produtos-imagens')
              .upload(fileName, correctedBlob, {
                cacheControl: '3600',
                upsert: false,
                contentType: correctedBlob.type || contentType,
              });

            if (!adminError) {
              console.log(`✅ Upload bem-sucedido com cliente admin`);
              return { data: adminData, error: null, usedAdminClient: true };
            }

            console.error(`❌ Upload também falhou com cliente admin:`, adminError);
            return { data: null, error: adminError, usedAdminClient: true };
          }
        }

        // Retornar erro original se não for possível usar admin client
        return { data: null, error, usedAdminClient: false };
      };

      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        console.log('\n' + '-'.repeat(60));
        console.log(`📸 PROCESSANDO IMAGEM ${i + 1}/${images.length}`);
        console.log('-'.repeat(60));
        console.log('Detalhes:', {
          id: image.id,
          hasUrl: !!image.url,
          urlValue: image.url?.substring(0, 50) + '...',
          hasBlob: !!image.blob,
          blobSize: image.blob?.size,
          hasFile: !!image.file,
          fileName: image.file?.name,
          isPrincipal: image.isPrincipal,
          order: image.order,
        });
        
        // VALIDAÇÃO: Rejeitar URLs blob (temporárias e corrompidas)
        if (image.url && image.url.startsWith('blob:')) {
          const errorMsg = `⚠️ Imagem ${i + 1} tem URL blob (temporária) - será necessário fazer novo upload`;
          console.warn(errorMsg);
          console.warn(`   URL blob detectada: ${image.url.substring(0, 50)}...`);
          // Continuar sem adicionar ao resultado - forçará novo upload ou será ignorada
          continue;
        }
        
        // Se já tem URL do storage (imagem existente e válida), manter
        if (image.url && image.url.includes('produtos-imagens')) {
          console.log(`✅ Imagem ${i + 1} já está no Supabase Storage, mantendo URL`);
          console.log(`   URL: ${image.url}`);
          result.uploadedUrls.push(image.url);
          setUploadProgress(Math.round(((i + 1) / totalImages) * 100));
          continue;
        }

        // Verificar se tem blob ou file para upload
        if (!image.blob && !image.file) {
          const errorMsg = `Imagem ${i + 1} (${image.id}) sem blob ou file para upload`;
          console.error(`❌ ${errorMsg}`);
          result.errors.push({ imageId: image.id, error: errorMsg });
          continue;
        }

        const fileToUpload = image.blob || image.file!;
        const timestamp = Date.now() + i; // Adicionar index para evitar colisão
        const prefix = image.isPrincipal ? 'principal' : `adicional-${i}`;
        
        // Extrair extensão e tipo MIME de forma segura
        let extension = 'jpg';
        let contentType = 'image/jpeg';
        
        if (image.file?.name) {
          const parts = image.file.name.split('.');
          extension = parts.length > 1 ? parts[parts.length - 1] : 'jpg';
          contentType = image.file.type || 'image/jpeg';
        } else if (image.blob?.type) {
          const mimeParts = image.blob.type.split('/');
          extension = mimeParts.length > 1 ? mimeParts[1] : 'jpg';
          contentType = image.blob.type || 'image/jpeg';
        }
        
        const fileName = `${folder}/${prefix}-${timestamp}.${extension}`;
        console.log(`📤 Fazendo upload para: ${fileName}`);
        console.log(`   Tamanho: ${fileToUpload.size} bytes`);
        console.log(`   Tipo original: ${fileToUpload.type}`);

        try {
          // Usar função de upload com fallback
          const uploadResult = await uploadWithFallback(fileName, fileToUpload, contentType);

          if (uploadResult.error) {
            let errorMsg = `Erro no upload: ${uploadResult.error.message}`;
            let userFriendlyMsg = `Falha no upload da imagem ${i + 1}`;

            // Mensagens específicas para erros comuns
            if (uploadResult.error.message?.toLowerCase().includes('bucket not found')) {
              errorMsg = 'Bucket "produtos-imagens" não existe no Supabase';
              userFriendlyMsg = 'Bucket de imagens não encontrado. Configure o storage primeiro.';
            } else if (uploadResult.error.message?.toLowerCase().includes('permission') ||
                       uploadResult.error.message?.toLowerCase().includes('denied') ||
                       uploadResult.error.message?.toLowerCase().includes('unauthorized')) {
              errorMsg = `Sem permissão para upload: ${uploadResult.error.message}`;
              userFriendlyMsg = 'Sem permissão para enviar imagens. Verifique as políticas do Supabase.';
            } else if (uploadResult.error.message?.toLowerCase().includes('file size')) {
              errorMsg = `Arquivo muito grande: ${uploadResult.error.message}`;
              userFriendlyMsg = 'Imagem muito grande. Máximo 5MB por arquivo.';
            } else if (uploadResult.error.message?.toLowerCase().includes('content-type') ||
                       uploadResult.error.message?.toLowerCase().includes('mime') ||
                       uploadResult.error.message?.toLowerCase().includes('text/plain')) {
              errorMsg = `Tipo de arquivo não permitido: ${uploadResult.error.message}`;
              userFriendlyMsg = 'Formato não suportado. Use apenas JPG, PNG ou WEBP.';
            }

            console.error(`❌ ${errorMsg}`);
            console.error('   Detalhes do erro:', uploadResult.error);
            console.error(`   Cliente usado: ${uploadResult.usedAdminClient ? 'Admin' : 'Anon'}`);
            result.errors.push({ imageId: image.id, error: errorMsg });
            toast.error(userFriendlyMsg, { duration: 6000 });
            continue;
          }

          // Obter URL pública (usar cliente correto)
          const clientToUse = uploadResult.usedAdminClient ? getSupabaseAdminClient() : supabase;
          if (!clientToUse) {
            const errorMsg = 'Cliente não disponível para obter URL pública';
            console.error(`❌ ${errorMsg}`);
            result.errors.push({ imageId: image.id, error: errorMsg });
            continue;
          }

          const { data: urlData } = clientToUse.storage
            .from('produtos-imagens')
            .getPublicUrl(fileName);

          if (!urlData?.publicUrl) {
            const errorMsg = 'Não foi possível obter URL pública';
            console.error(`❌ ${errorMsg}`);
            result.errors.push({ imageId: image.id, error: errorMsg });
            continue;
          }

          console.log(`✅ Upload da imagem ${i + 1} CONCLUÍDO!`);
          console.log(`   Cliente usado: ${uploadResult.usedAdminClient ? 'Admin (Service Role)' : 'Anon'}`);
          console.log(`   URL: ${urlData.publicUrl}`);
          result.uploadedUrls.push(urlData.publicUrl);
        } catch (error: any) {
          const errorMsg = `Exceção durante upload: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          console.error('   Stack:', error.stack);
          result.errors.push({ imageId: image.id, error: errorMsg });
          toast.error(`Erro ao enviar imagem ${i + 1}`);
        }

        setUploadProgress(Math.round(((i + 1) / totalImages) * 100));
      }

      console.log('\n' + '='.repeat(60));
      console.log('📊 RESUMO DO UPLOAD');
      console.log('='.repeat(60));
      console.log(`✅ Sucesso: ${result.uploadedUrls.length}/${totalImages} imagens`);
      console.log(`❌ Falhas: ${result.errors.length}`);
      
      if (result.uploadedUrls.length > 0) {
        console.log('\n📎 URLs enviadas:');
        result.uploadedUrls.forEach((url, i) => {
          console.log(`   ${i + 1}. ${url}`);
        });
      }

      if (result.errors.length > 0) {
        console.log('\n❌ Erros encontrados:');
        result.errors.forEach((err, i) => {
          console.log(`   ${i + 1}. [${err.imageId}] ${err.error}`);
        });
      }

      console.log('='.repeat(60));

      // Considerar sucesso se pelo menos uma imagem foi enviada
      result.success = result.uploadedUrls.length > 0;

      if (result.success) {
        toast.success(`${result.uploadedUrls.length} ${result.uploadedUrls.length === 1 ? 'imagem enviada' : 'imagens enviadas'} para o Supabase`);
      } else {
        toast.error('Nenhuma imagem foi enviada com sucesso');
      }

      return result;
    } catch (error: any) {
      console.error('❌ ERRO CRÍTICO no upload de imagens:', error);
      console.error('   Stack:', error.stack);
      toast.error(`Erro crítico: ${error.message}`);
      result.errors.push({ imageId: 'all', error: error.message });
      return result;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteImage = async (url: string): Promise<void> => {
    try {
      // Ignorar blob URLs - não estão no storage
      if (!url || url.startsWith('blob:')) {
        return;
      }

      // Extrair o path da URL
      const urlObj = new URL(url);
      const path = urlObj.pathname.split('/produtos-imagens/')[1];
      
      if (!path) {
        console.warn('Path inválido para deletar:', url);
        return;
      }

      const { error } = await supabase.storage
        .from('produtos-imagens')
        .remove([path]);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao deletar imagem:', error);
      // Não mostrar toast de erro aqui, pode ser que a imagem já não exista
    }
  };

  const deleteAllImages = async (produtoId: string): Promise<void> => {
    try {
      // Listar todas as imagens do produto
      const { data: files, error: listError } = await supabase.storage
        .from('produtos-imagens')
        .list(produtoId);

      if (listError) throw listError;

      if (files && files.length > 0) {
        const filePaths = files.map(file => `${produtoId}/${file.name}`);
        
        const { error: deleteError } = await supabase.storage
          .from('produtos-imagens')
          .remove(filePaths);

        if (deleteError) throw deleteError;
      }
    } catch (error) {
      console.error('Erro ao deletar todas as imagens:', error);
    }
  };

  return {
    uploadImages,
    deleteImage,
    deleteAllImages,
    isUploading,
    uploadProgress,
  };
}
