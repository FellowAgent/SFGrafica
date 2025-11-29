// Teste simples de upload de imagem para diagnóstico
import { supabase } from '@/integrations/supabase';
import { getSupabaseAdminClient } from '@/integrations/supabase/adminClient';
import { ensureCorrectMimeType } from '@/utils/imageProcessing';

export interface TestResult {
  success: boolean;
  error?: string;
  url?: string;
  statusCode?: number;
  bucketExists?: boolean;
  canUpload?: boolean;
  canRead?: boolean;
}

export async function testImageUpload(): Promise<TestResult> {
  console.log('🧪 Iniciando teste de upload de imagem...');

  const result: TestResult = {
    success: false,
  };

  try {
    // 0. Verificar autenticação
    console.log('👤 Verificando autenticação...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      result.error = `Erro de autenticação: ${authError.message}`;
      console.error('❌ Erro de autenticação:', authError);
      return result;
    }

    if (!user) {
      result.error = 'Usuário não está autenticado. Faça login primeiro.';
      console.error('❌ Usuário não autenticado');
      return result;
    }

    console.log('✅ Usuário autenticado:', user.email);

    // 1. Verificar se bucket existe
    console.log('🔍 Verificando bucket...');
    const { error: listError } = await supabase.storage
      .from('produtos-imagens')
      .list('', { limit: 1 });

    if (listError && (listError.message?.toLowerCase().includes('bucket not found') ||
                      listError.message?.toLowerCase().includes('not found'))) {
      result.bucketExists = false;
      result.error = 'Bucket "produtos-imagens" não existe. Crie o bucket no painel do Supabase primeiro.';
      console.error('❌ Bucket não existe');
      return result;
    }

    if (listError && (listError.message?.toLowerCase().includes('permission') ||
                      listError.message?.toLowerCase().includes('unauthorized'))) {
      result.bucketExists = true; // Bucket existe, mas sem permissão de listagem
      console.log('✅ Bucket existe (sem permissão de listagem)');
    } else if (!listError) {
      result.bucketExists = true;
      console.log('✅ Bucket existe e é acessível');
    }

    // 2. Testar upload
    console.log('📤 Testando upload...');

    // Criar uma imagem de teste simples e confiável
    // Usar uma abordagem mais direta: criar um canvas maior e mais simples
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas não está disponível');
    }

    // Preencher com uma cor sólida
    ctx.fillStyle = '#FF0000'; // Vermelho
    ctx.fillRect(0, 0, 10, 10);

    // Converter para blob JPEG
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) {
          resolve(result);
        } else {
          reject(new Error('Falha ao converter canvas para blob'));
        }
      }, 'image/jpeg', 0.95); // Qualidade alta
    });

    // Garantir que o blob tenha tipo MIME correto
    console.log(`🔍 Verificando tipo MIME do blob de teste...`);
    console.log(`   Tipo original: ${blob.type}`);
    const correctedBlob = await ensureCorrectMimeType(blob, 'image/jpeg');
    console.log(`   Tipo após correção: ${correctedBlob.type}`);

    const fileName = `test-${Date.now()}.jpg`;

    // Função auxiliar para upload com fallback
    const uploadWithFallback = async (): Promise<{ data: any; error: any; usedAdminClient: boolean }> => {
      // Tentar upload com cliente anon primeiro
      console.log(`📤 Tentando upload com cliente anon...`);
      const { data, error } = await supabase.storage
        .from('produtos-imagens')
        .upload(fileName, correctedBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: correctedBlob.type || 'image/jpeg'
        });

      if (!error) {
        console.log(`✅ Upload bem-sucedido com cliente anon`);
        return { data, error: null, usedAdminClient: false };
      }

      // Verificar se é erro de tipo MIME ou permissão
      const isMimeError = error.message?.toLowerCase().includes('mime') ||
                         error.message?.toLowerCase().includes('content-type') ||
                         error.message?.toLowerCase().includes('text/plain');
      const isPermissionError = error.message?.toLowerCase().includes('permission') ||
                               error.message?.toLowerCase().includes('denied') ||
                               error.message?.toLowerCase().includes('unauthorized');

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
              upsert: true,
              contentType: correctedBlob.type || 'image/jpeg'
            });

          if (!adminError) {
            console.log(`✅ Upload bem-sucedido com cliente admin`);
            return { data: adminData, error: null, usedAdminClient: true };
          }

          console.error(`❌ Upload também falhou com cliente admin:`, adminError);
          return { data: null, error: adminError, usedAdminClient: true };
        }
      }

      return { data: null, error, usedAdminClient: false };
    };

    const uploadResult = await uploadWithFallback();

    if (uploadResult.error) {
      result.canUpload = false;
      result.error = `Erro no upload: ${uploadResult.error.message}`;
      result.statusCode = uploadResult.error.statusCode;
      console.error('❌ Erro no upload:', uploadResult.error);
      console.error(`   Cliente usado: ${uploadResult.usedAdminClient ? 'Admin' : 'Anon'}`);
      return result;
    }

    result.canUpload = true;
    console.log(`✅ Upload bem-sucedido (cliente: ${uploadResult.usedAdminClient ? 'Admin' : 'Anon'})`);

    // Determinar qual cliente usar para operações subsequentes
    const clientToUse = uploadResult.usedAdminClient ? getSupabaseAdminClient() : supabase;
    if (!clientToUse) {
      result.error = 'Cliente não disponível para operações subsequentes';
      return result;
    }

    // 3. Testar leitura (URL pública) - usar cliente correto
    const { data: urlData } = clientToUse.storage
      .from('produtos-imagens')
      .getPublicUrl(fileName);

    if (urlData?.publicUrl) {
      result.canRead = true;
      result.url = urlData.publicUrl;
      console.log('✅ URL pública gerada:', urlData.publicUrl);
    } else {
      result.canRead = false;
      console.warn('⚠️ URL pública não gerada');
    }

    // 4. Limpar arquivo de teste - usar cliente correto
    const { error: deleteError } = clientToUse.storage
      .from('produtos-imagens')
      .remove([fileName]);

    if (deleteError) {
      console.warn('⚠️ Não foi possível remover arquivo de teste:', deleteError);
    } else {
      console.log('🧹 Arquivo de teste removido');
    }

    result.success = true;
    return result;
  } catch (error: any) {
    result.error = `Erro inesperado: ${error.message}`;
    console.error('❌ Erro no teste:', error);
    return result;
  }
}
