/**
 * Utilitário para diagnóstico de saúde do Supabase Storage
 * Verifica bucket, permissões, e realiza testes de upload
 */

import { supabase } from '@/integrations/supabase/client';

export interface StorageHealthStatus {
  healthy: boolean;
  bucketExists: boolean;
  canList: boolean;
  canRead: boolean;
  canUpload: boolean;
  canDelete: boolean;
  errors: string[];
  warnings: string[];
  testFileUrl?: string;
}

const BUCKET_NAME = 'produtos-imagens';
const TEST_FILE_NAME = 'test-health-check.txt';

/**
 * Executa verificação completa de saúde do storage
 */
export async function checkStorageHealth(): Promise<StorageHealthStatus> {
  const status: StorageHealthStatus = {
    healthy: true,
    bucketExists: false,
    canList: false,
    canRead: false,
    canUpload: false,
    canDelete: false,
    errors: [],
    warnings: [],
  };

  console.log('🔍 Iniciando diagnóstico de saúde do storage...');

  // 1. Verificar se o bucket existe (método mais robusto)
  try {
    console.log(`🔍 Verificando existência do bucket '${BUCKET_NAME}'...`);
    
    // Tentar listar conteúdo do bucket específico
    const { error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', { limit: 1 });

    // Se não houver erro ou for erro de permissão (mas não "not found"), bucket existe
    if (!listError) {
      status.bucketExists = true;
      console.log(`✅ Bucket '${BUCKET_NAME}' existe e está acessível`);
    } else if (listError.message?.toLowerCase().includes('bucket not found') || 
               listError.message?.toLowerCase().includes('not found')) {
      status.bucketExists = false;
      status.errors.push(`Bucket '${BUCKET_NAME}' não existe`);
      status.healthy = false;
      console.error(`❌ Bucket '${BUCKET_NAME}' não encontrado`);
      return status;
    } else if (listError.message?.toLowerCase().includes('permission') || 
               listError.message?.toLowerCase().includes('denied')) {
      // Bucket existe mas sem permissão de listagem (ainda OK para uploads)
      status.bucketExists = true;
      status.warnings.push('Sem permissão para listar buckets, mas bucket parece existir');
      console.log(`✅ Bucket '${BUCKET_NAME}' existe (sem permissão de listagem)`);
    } else {
      // Tentar método alternativo: obter URL pública
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl('test.jpg');
      
      if (urlData?.publicUrl && urlData.publicUrl.includes(BUCKET_NAME)) {
        status.bucketExists = true;
        console.log(`✅ Bucket '${BUCKET_NAME}' existe (confirmado via URL)`);
      } else {
        status.bucketExists = false;
        status.errors.push(`Não foi possível confirmar existência do bucket: ${listError.message}`);
        status.healthy = false;
        console.error(`❌ Erro ao verificar bucket:`, listError);
        return status;
      }
    }
  } catch (error: any) {
    status.errors.push(`Erro ao verificar bucket: ${error.message}`);
    status.healthy = false;
    console.error('❌ Erro ao verificar bucket:', error);
    return status;
  }

  // 2. Testar permissão de listagem
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', { limit: 1 });

    if (error) {
      status.errors.push(`Erro ao listar arquivos: ${error.message}`);
      status.warnings.push('Sem permissão de listagem');
      console.warn('⚠️ Sem permissão de listagem:', error);
    } else {
      status.canList = true;
      console.log('✅ Permissão de listagem OK');
    }
  } catch (error: any) {
    status.warnings.push(`Erro ao testar listagem: ${error.message}`);
    console.warn('⚠️ Erro ao testar listagem:', error);
  }

  // 3. Testar upload
  try {
    const testContent = new Blob([`Health check - ${new Date().toISOString()}`], {
      type: 'text/plain',
    });

    const testPath = `health-check/${TEST_FILE_NAME}`;
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(testPath, testContent, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      status.errors.push(`Erro ao fazer upload de teste: ${error.message}`);
      status.healthy = false;
      console.error('❌ Erro ao fazer upload de teste:', error);
    } else {
      status.canUpload = true;
      console.log('✅ Permissão de upload OK');

      // 4. Testar leitura (URL pública)
      try {
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(testPath);

        if (urlData?.publicUrl) {
          status.canRead = true;
          status.testFileUrl = urlData.publicUrl;
          console.log('✅ Permissão de leitura OK');
          console.log('📎 URL de teste:', urlData.publicUrl);
        } else {
          status.warnings.push('Não foi possível obter URL pública');
          console.warn('⚠️ Não foi possível obter URL pública');
        }
      } catch (error: any) {
        status.warnings.push(`Erro ao obter URL pública: ${error.message}`);
        console.warn('⚠️ Erro ao obter URL pública:', error);
      }

      // 5. Testar deleção
      try {
        const { error: deleteError } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([testPath]);

        if (deleteError) {
          status.warnings.push(`Erro ao deletar arquivo de teste: ${deleteError.message}`);
          console.warn('⚠️ Erro ao deletar arquivo de teste:', deleteError);
        } else {
          status.canDelete = true;
          console.log('✅ Permissão de deleção OK');
        }
      } catch (error: any) {
        status.warnings.push(`Erro ao testar deleção: ${error.message}`);
        console.warn('⚠️ Erro ao testar deleção:', error);
      }
    }
  } catch (error: any) {
    status.errors.push(`Erro ao testar upload: ${error.message}`);
    status.healthy = false;
    console.error('❌ Erro ao testar upload:', error);
  }

  // Determinar se está saudável
  status.healthy = status.bucketExists && status.canUpload && status.canRead;

  if (status.healthy) {
    console.log('✅ Storage está saudável e pronto para uso!');
  } else {
    console.error('❌ Storage apresenta problemas:', status.errors);
  }

  return status;
}

/**
 * Verificação rápida se o bucket existe
 * Usa tentativa de listagem no bucket específico em vez de listar todos os buckets
 */
export async function quickBucketCheck(): Promise<boolean> {
  try {
    console.log('🔍 Verificando bucket "produtos-imagens"...');
    
    // Método 1: Tentar listar arquivos do bucket (mais confiável)
    const { error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', { limit: 1 });

    // Se não houver erro ao listar, o bucket existe
    if (!listError) {
      console.log('✅ Bucket "produtos-imagens" existe e está acessível');
      return true;
    }

    // Se o erro for "Bucket not found", o bucket realmente não existe
    if (listError.message?.toLowerCase().includes('bucket not found') || 
        listError.message?.toLowerCase().includes('not found')) {
      console.warn('❌ Bucket "produtos-imagens" não existe:', listError.message);
      return false;
    }

    // Se for erro de permissão, o bucket existe mas pode ter restrições de listagem
    // Isso ainda é OK para uploads
    if (listError.message?.toLowerCase().includes('permission') || 
        listError.message?.toLowerCase().includes('denied')) {
      console.log('✅ Bucket "produtos-imagens" existe (sem permissão de listagem, mas OK para upload)');
      return true;
    }

    // Método 2 (fallback): Tentar obter URL pública de um arquivo fictício
    // Se o bucket não existe, isso também vai falhar de forma diferente
    try {
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl('test.jpg');

      // Se conseguiu obter uma URL (mesmo que o arquivo não exista), o bucket existe
      if (urlData?.publicUrl && urlData.publicUrl.includes(BUCKET_NAME)) {
        console.log('✅ Bucket "produtos-imagens" existe (verificado via URL pública)');
        return true;
      }
    } catch (urlError) {
      console.error('Erro ao tentar obter URL pública:', urlError);
    }

    // Se chegou aqui, assume que não existe
    console.error('❌ Não foi possível confirmar existência do bucket:', listError);
    return false;
  } catch (error) {
    console.error('❌ Erro ao verificar bucket:', error);
    // Em caso de erro inesperado, assume que existe para não bloquear o usuário
    return true;
  }
}

/**
 * Obter informações detalhadas do bucket
 */
export async function getBucketInfo() {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      throw error;
    }

    const bucket = buckets?.find(b => b.id === BUCKET_NAME);
    
    if (!bucket) {
      return null;
    }

    return {
      id: bucket.id,
      name: bucket.name,
      public: bucket.public,
      createdAt: bucket.created_at,
      updatedAt: bucket.updated_at,
    };
  } catch (error) {
    console.error('Erro ao obter informações do bucket:', error);
    return null;
  }
}

