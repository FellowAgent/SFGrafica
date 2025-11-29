/**
 * Script para configurar e criar bucket do Supabase Storage
 * Pode ser executado manualmente ou via interface
 */

import { supabase } from '@/integrations/supabase/client';

const BUCKET_NAME = 'produtos-imagens';

export interface SetupResult {
  success: boolean;
  message: string;
  details: string[];
  errors: string[];
}

/**
 * Cria o bucket de produtos-imagens se não existir
 */
export async function setupStorageBucket(): Promise<SetupResult> {
  const result: SetupResult = {
    success: false,
    message: '',
    details: [],
    errors: [],
  };

  console.log('🚀 Iniciando setup do bucket de storage...');

  try {
    // 1. Verificar se o bucket já existe
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      result.errors.push(`Erro ao listar buckets: ${listError.message}`);
      result.message = 'Falha ao verificar buckets existentes';
      console.error('❌ Erro ao listar buckets:', listError);
      return result;
    }

    const bucketExists = buckets?.some(b => b.id === BUCKET_NAME);

    if (bucketExists) {
      result.success = true;
      result.message = 'Bucket já existe';
      result.details.push(`O bucket '${BUCKET_NAME}' já está configurado`);
      console.log(`✅ Bucket '${BUCKET_NAME}' já existe`);
      return result;
    }

    console.log(`📦 Bucket '${BUCKET_NAME}' não existe, criando...`);

    // 2. Criar o bucket
    const { data: newBucket, error: createError } = await supabase.storage.createBucket(
      BUCKET_NAME,
      {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      }
    );

    if (createError) {
      // Se erro for de permissão, informar que precisa fazer manual
      if (createError.message?.includes('permission') || createError.message?.includes('denied')) {
        result.errors.push('Sem permissão para criar bucket programaticamente');
        result.message = 'Criação manual necessária';
        result.details.push(
          'Este bucket precisa ser criado manualmente no painel do Supabase'
        );
        result.details.push(
          'Acesse: https://supabase.com/dashboard → Storage → Novo Bucket'
        );
        result.details.push(`Nome: ${BUCKET_NAME}`);
        result.details.push('Marcar como Público: Sim');
        result.details.push('Tamanho máximo: 5MB');
        result.details.push('Tipos permitidos: JPEG, PNG, WEBP');
        console.warn('⚠️ Sem permissão para criar bucket:', createError);
        return result;
      }

      result.errors.push(`Erro ao criar bucket: ${createError.message}`);
      result.message = 'Falha ao criar bucket';
      console.error('❌ Erro ao criar bucket:', createError);
      return result;
    }

    console.log('✅ Bucket criado com sucesso!');
    result.details.push('Bucket criado com sucesso');

    // 3. Verificar políticas RLS
    // Nota: Políticas RLS normalmente são criadas via SQL migrations
    // Aqui apenas informamos sobre elas
    result.details.push(
      'IMPORTANTE: Verifique se as políticas RLS estão configuradas'
    );
    result.details.push(
      'Execute a migration SQL em supabase/migrations/20251124030913_*.sql'
    );

    result.success = true;
    result.message = 'Setup concluído com sucesso';
    console.log('✅ Setup do bucket concluído!');

    return result;
  } catch (error: any) {
    result.errors.push(`Erro inesperado: ${error.message}`);
    result.message = 'Erro durante o setup';
    console.error('❌ Erro inesperado durante setup:', error);
    return result;
  }
}

/**
 * Verifica se o bucket está configurado corretamente
 */
export async function validateBucketSetup(): Promise<boolean> {
  try {
    console.log(`🔍 Verificando bucket '${BUCKET_NAME}'...`);

    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error('❌ Erro ao listar buckets:', error);
      return false;
    }

    const bucket = buckets?.find(b => b.id === BUCKET_NAME);

    if (!bucket) {
      console.warn(`❌ Bucket '${BUCKET_NAME}' não encontrado`);
      console.log('📋 Buckets encontrados:', buckets?.map(b => b.id));
      return false;
    }

    console.log(`✅ Bucket encontrado:`, {
      id: bucket.id,
      name: bucket.name,
      public: bucket.public,
      created_at: bucket.created_at
    });

    // Verificar se é público
    if (!bucket.public) {
      console.warn(`⚠️ Bucket '${BUCKET_NAME}' não é público - isso pode causar problemas`);
    }

    // Verificar se conseguimos fazer uma operação simples
    try {
      console.log('🔍 Testando acesso ao bucket...');
      const { error: testError } = await supabase.storage
        .from(BUCKET_NAME)
        .list('', { limit: 1 });

      if (testError) {
        console.warn('⚠️ Erro ao acessar bucket:', testError.message);
        if (testError.message?.toLowerCase().includes('permission')) {
          console.log('💡 Isso pode indicar problema nas políticas RLS');
        }
      } else {
        console.log('✅ Bucket é acessível');
      }
    } catch (testError) {
      console.warn('⚠️ Erro ao testar bucket:', testError);
    }

    console.log(`✅ Bucket '${BUCKET_NAME}' está configurado`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao validar bucket:', error);
    return false;
  }
}

/**
 * Verifica se pode criar bucket programaticamente
 */
export async function canCreateBucket(): Promise<boolean> {
  try {
    // Tentar criar um bucket de teste temporário
    const testBucketName = `test-bucket-${Date.now()}`;

    const { error } = await supabase.storage.createBucket(testBucketName, {
      public: true,
      allowedMimeTypes: ['image/jpeg'],
    });

    if (!error) {
      // Se conseguiu criar, deletar o bucket de teste
      await supabase.storage.deleteBucket(testBucketName);
      return true;
    }

    // Se erro for de permissão RLS, não pode criar programaticamente
    if (error.message?.toLowerCase().includes('row-level security') ||
        error.message?.toLowerCase().includes('policy') ||
        error.message?.toLowerCase().includes('permission')) {
      return false;
    }

    // Outros erros podem ser temporários
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Tenta recriar o bucket (apenas se possível)
 */
export async function recreateBucket(): Promise<SetupResult> {
  const result: SetupResult = {
    success: false,
    message: '',
    details: [],
    errors: [],
  };

  try {
    console.log('🔍 Verificando permissões para criar bucket...');

    const canCreate = await canCreateBucket();

    if (!canCreate) {
      result.errors.push('Sem permissão para criar buckets programaticamente');
      result.message = 'Criação manual necessária';
      result.details.push('Este projeto Supabase não permite criação de buckets via API');
      result.details.push('Você precisa criar o bucket manualmente no painel do Supabase');
      result.details.push('');
      result.details.push(...getManualSetupInstructions());

      console.log('⚠️ Criação programática não permitida - instruções manuais fornecidas');
      return result;
    }

    console.log('✅ Criação programática permitida, recriando bucket...');

    // Primeiro, tentar deletar se existir
    try {
      console.log('🗑️ Tentando remover bucket existente...');
      const { error: deleteError } = await supabase.storage.deleteBucket(BUCKET_NAME);
      if (deleteError) {
        console.warn('⚠️ Não foi possível deletar bucket existente:', deleteError.message);
      } else {
        console.log('✅ Bucket antigo removido');
      }
    } catch (deleteError) {
      console.warn('⚠️ Erro ao tentar deletar bucket:', deleteError);
    }

    // Criar novo bucket
    console.log('📦 Criando novo bucket...');
    const { data: newBucket, error: createError } = await supabase.storage.createBucket(
      BUCKET_NAME,
      {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      }
    );

    if (createError) {
      result.errors.push(`Erro ao criar bucket: ${createError.message}`);
      result.message = 'Falha ao criar bucket';
      console.error('❌ Erro ao criar bucket:', createError);
      return result;
    }

    console.log('✅ Bucket criado com sucesso');
    result.details.push('Bucket criado com configurações básicas');
    result.details.push('IMPORTANTE: Execute a migration SQL para aplicar políticas RLS');
    result.details.push('Arquivo: supabase/migrations/20251124030913_*.sql');

    result.success = true;
    result.message = 'Bucket recriado com sucesso';

  } catch (error: any) {
    result.errors.push(`Erro inesperado: ${error.message}`);
    result.message = 'Erro durante recriação';
    console.error('❌ Erro inesperado:', error);
  }

  return result;
}

/**
 * Executar políticas RLS via API (se possível)
 */
export async function applyStoragePolicies(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('🔒 Aplicando políticas RLS via API...');

    // Como a execução direta de SQL pode não funcionar, vamos tentar uma abordagem diferente
    // Usar as funções do Supabase Storage API para testar se as políticas funcionam

    console.log('🧪 Testando se as políticas já estão funcionando...');

    // Testar upload de uma imagem pequena
    const testBlob = new Blob(['test'], { type: 'image/jpeg' });
    const testFileName = `policy-test-${Date.now()}.jpg`;

    // Tentar upload
    const { error: uploadError } = await supabase.storage
      .from('produtos-imagens')
      .upload(testFileName, testBlob, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/jpeg'
      });

    if (uploadError) {
      console.error('❌ Políticas RLS podem não estar configuradas:', uploadError.message);

      // Verificar se é erro de bucket ou de política
      if (uploadError.message?.includes('bucket not found')) {
        return {
          success: false,
          message: 'Bucket não existe. Crie o bucket primeiro.'
        };
      }

      return {
        success: false,
        message: 'Políticas RLS não estão configuradas. Execute manualmente no SQL Editor.'
      };
    }

    // Se upload funcionou, tentar deletar o arquivo de teste
    await supabase.storage
      .from('produtos-imagens')
      .remove([testFileName]);

    console.log('✅ Políticas RLS estão funcionando');
    return {
      success: true,
      message: 'Políticas RLS já estão configuradas e funcionando'
    };

  } catch (error: any) {
    console.error('❌ Erro ao testar políticas RLS:', error);
    return {
      success: false,
      message: `Erro: ${error.message}. Execute as migrations SQL manualmente.`
    };
  }
}

/**
 * Obter instruções de setup manual
 */
export function getManualSetupInstructions(): string[] {
  return [
    '1. Acesse o painel do Supabase: https://supabase.com/dashboard',
    '2. Selecione seu projeto',
    '3. Navegue até Storage no menu lateral',
    '4. Clique em "New bucket" (Novo bucket)',
    `5. Nome do bucket: ${BUCKET_NAME}`,
    '6. Marque "Public bucket" (Bucket público): SIM',
    '7. File size limit: 5242880 (5MB)',
    '8. Allowed MIME types: image/jpeg, image/png, image/webp',
    '9. Clique em "Create bucket" (Criar bucket)',
    '10. Execute a migration simples no SQL Editor:',
    '    - supabase/migrations/20250126200000_simple_storage_policies.sql (versão mais simples e confiável)',
  ];
}

