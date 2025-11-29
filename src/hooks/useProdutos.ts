import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase";
import { toast } from "@/hooks/use-toast";
import { produtoSchema, produtoUpdateSchema } from "@/schemas/produto.schema";
import { SimpleImageData } from "./useSimpleImageUpload";
import { 
  guaranteedDelete, 
  deleteProductImages, 
  moveImagesToProduct,
  resetSessionId 
} from "@/utils/guaranteedUpload";

// Função para converter preço em formato pt-BR para número
const parsePrecoVariacao = (preco: string | number | null | undefined): number => {
  if (preco === null || preco === undefined) return 0;
  if (typeof preco === 'number') return preco;
  
  // Verificar se é negativo
  const isNegativo = preco.startsWith('-');
  
  // Remover o sinal de menos para processar
  let precoLimpo = preco.replace('-', '');
  
  // Remover pontos de milhar e substituir vírgula por ponto
  precoLimpo = precoLimpo.replace(/\./g, '').replace(',', '.');
  
  const valor = parseFloat(precoLimpo) || 0;
  return isNegativo ? -valor : valor;
};

export interface CategoriaPai {
  id: string;
  nome: string;
}

export interface Categoria {
  id: string;
  nome: string;
  categoria_pai_id?: string;
  categorias?: CategoriaPai;
}

export interface Produto {
  id: string;
  nome: string;
  codigo_barras?: string;
  categoria_id?: string;
  categorias?: Categoria;
  produtos_categorias?: Array<{ categorias: Categoria }>;
  descricao?: string;
  preco: number;
  custo: number;
  desconto?: number;
  tipo_desconto?: "valor" | "porcentagem";
  unidade_medida: string;
  ativo: boolean;
  estoque: number;
  estoque_minimo: number;
  imagem_url?: string;
  imagens?: string[];
  created_at: string;
  updated_at: string;
  descricao_curta?: string;
  descricao_complementar?: string;
  observacoes?: string;
  tags?: string[];
  ncm?: string;
  cest?: string;
  origem?: string;
  cfop?: string;
  icms_cst?: string;
  icms_aliquota?: number;
  pis_cst?: string;
  pis_aliquota?: number;
  cofins_cst?: string;
  cofins_aliquota?: number;
  codigo_servico?: string;
  iss_aliquota?: number;
}

export const useProdutos = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProdutos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('produtos')
        .select(`
          *,
          categorias:categoria_id (
            id,
            nome,
            categoria_pai_id,
            categorias:categoria_pai_id (
              id,
              nome,
              categoria_pai_id,
              categorias:categoria_pai_id (
                id,
                nome
              )
            )
          ),
          produtos_categorias (
            categorias:categoria_id (
              id,
              nome,
              categoria_pai_id,
              categorias:categoria_pai_id (
                id,
                nome,
                categoria_pai_id,
                categorias:categoria_pai_id (
                  id,
                  nome
                )
              )
            )
          )
        `)
        .order('nome', { ascending: true });

      if (error) throw error;
      setProdutos(data as any || []);
    } catch (error: any) {
      // Não mostrar erro se for problema de autenticação
      if (!error.message?.includes('JWT') && !error.message?.includes('permission denied')) {
        toast({ title: "Erro", description: 'Erro ao carregar produtos: ' + error.message, variant: "destructive" });
      }
      console.warn('Produtos fetch error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const createProduto = async (input: unknown, images?: SimpleImageData[], variacoes?: any[]) => {
    try {
      // Validate input
      const validated = produtoSchema.parse(input);
      const { categorias_ids, ...produtoData } = validated as any;
      
      console.log('='.repeat(60));
      console.log('🆕 CRIANDO NOVO PRODUTO');
      console.log('='.repeat(60));
      console.log('Dados do produto:', produtoData);
      console.log(`Imagens a processar: ${images?.length || 0}`);
      console.log(`Variações a processar: ${variacoes?.length || 0}`);
      
      const { data, error } = await supabase
        .from('produtos')
        .insert([produtoData])
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ Produto criado com ID: ${data.id}`);

      // Coletar URLs das imagens (já foram enviadas pelo SimpleImageUploader)
      if (images && images.length > 0) {
        console.log(`\n📸 Processando ${images.length} imagens para produto ${data.id}`);
        
        // Filtrar apenas imagens que já foram enviadas (têm URL do storage)
        const uploadedUrls = images
          .filter(img => img.url && img.url.includes('produtos-imagens') && !img.isUploading && !img.uploadError)
          .map(img => img.url);
        
        console.log(`📊 Imagens já enviadas: ${uploadedUrls.length}`);
        
        if (uploadedUrls.length > 0) {
          // Mover imagens da pasta temporária para a pasta do produto
          console.log('\n📦 Movendo imagens para pasta do produto...');
          const { newUrls, errors: moveErrors } = await moveImagesToProduct(uploadedUrls, data.id);
          
          if (moveErrors.length > 0) {
            console.warn('⚠️ Alguns erros ao mover imagens:', moveErrors);
          }
          
          console.log('\n📝 Atualizando produto com URLs das imagens...');
          
          // Atualizar produto com URLs das imagens (novas URLs após mover)
          const { error: updateError } = await supabase
            .from("produtos")
            .update({
              imagem_url: newUrls[0],
              imagens: newUrls,
            })
            .eq("id", data.id);

          if (updateError) {
            console.error("❌ Erro ao atualizar produto com URLs das imagens:", updateError);
            throw updateError;
          }
          
          console.log(`✅ Produto atualizado com ${newUrls.length} imagens`);
          data.imagem_url = newUrls[0];
          data.imagens = newUrls;
          
          // Resetar session ID após criar produto com sucesso
          resetSessionId();
        } else {
          console.warn('⚠️ Nenhuma imagem foi enviada com sucesso');
        }
      }

      // Criar relacionamentos com categorias
      if (categorias_ids && categorias_ids.length > 0) {
        const relacionamentos = categorias_ids.map((categoria_id: string) => ({
          produto_id: data.id,
          categoria_id,
        }));

        const { error: relError } = await supabase
          .from('produtos_categorias')
          .insert(relacionamentos);

        if (relError) throw relError;
      }

      // Salvar variações se houver
      if (variacoes && variacoes.length > 0) {
        console.log(`\n🎨 Salvando ${variacoes.length} variações para produto ${data.id}`);
        console.log('📋 Variações recebidas:', variacoes);
        
        const variacoesParaSalvar = variacoes.map((variacao: any) => {
          const valorAdicional = parsePrecoVariacao(variacao.preco);
          const templateVariacaoId = variacao.variacaoProdutoId || null;
          console.log(`   Variação: ${variacao.combinacao}, preco original: "${variacao.preco}", valor convertido: ${valorAdicional}, modificado: ${variacao.modificado}, template_variacao_id: ${templateVariacaoId}`);
          
          return {
            produto_id: data.id,
            nome: variacao.combinacao,
            valor_adicional: valorAdicional,
            estoque: parseInt(variacao.estoque) || 0,
            sku: variacao.codigo || null,
            codigo_barras: variacao.codigo || null,
            ativo: true,
            modificado: variacao.modificado || false,
            template_variacao_id: templateVariacaoId, // Preservar ID do template se existir
          };
        });

        console.log('📋 Variações a salvar:', JSON.stringify(variacoesParaSalvar, null, 2));

        const { error: varError } = await supabase
          .from('variacoes_produto')
          .insert(variacoesParaSalvar);

        if (varError) {
          console.error('❌ Erro ao salvar variações:', varError);
          throw varError;
        }
        
        console.log(`✅ ${variacoes.length} variações salvas com sucesso`);
      }

      toast({ title: "Sucesso", description: 'Produto criado com sucesso!', variant: "success" });
      
      // Limpar localStorage de imagens
      localStorage.removeItem('produto-form-images-autosave');
      
      fetchProdutos();
      return data;
    } catch (error: any) {
      toast({ title: "Erro", description: 'Erro ao criar produto: ' + error.message, variant: "destructive" });
      throw error;
    }
  };

  const updateProduto = async (id: string, input: unknown, images?: SimpleImageData[], variacoes?: any[]) => {
    try {
      // Validate input
      const validated = produtoUpdateSchema.parse(input);
      const { categorias_ids, ...produtoData } = validated as any;

      console.log('='.repeat(60));
      console.log(`📝 ATUALIZANDO PRODUTO ${id}`);
      console.log('='.repeat(60));
      console.log('Dados do produto:', produtoData);
      console.log(`Imagens a processar: ${images?.length || 0}`);

      // Buscar produto atual para comparar imagens
      const { data: produtoAtual, error: fetchError } = await supabase
        .from("produtos")
        .select("imagens")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Processar imagens (mesmo se array vazio - significa que todas foram removidas)
      if (images !== undefined) {
        console.log(`\n📸 Processando imagens para produto ${id}`);
        console.log(`📸 Imagens recebidas: ${images.length}`);
        
        try {
          // Identificar imagens antigas que foram removidas
          const oldUrls = produtoAtual?.imagens || [];
          console.log(`📸 URLs antigas no banco (${oldUrls.length}):`, oldUrls);
          
          // Filtrar apenas imagens já enviadas com sucesso
          const newImageUrls = images
            .filter(img => img.url && img.url.includes('produtos-imagens') && !img.isUploading && !img.uploadError)
            .map(img => img.url);
          console.log(`📸 URLs novas/mantidas (${newImageUrls.length}):`, newImageUrls);
          
          const removedUrls = oldUrls.filter((url: string) => !newImageUrls.includes(url));
          console.log(`🗑️ URLs para deletar (${removedUrls.length}):`, removedUrls);

          // Deletar imagens removidas do storage
          if (removedUrls.length > 0) {
            console.log('🗑️ Deletando imagens removidas do storage...');
            for (const url of removedUrls) {
              const deleted = await guaranteedDelete(url);
              if (deleted) {
                console.log(`✅ Deletada: ${url.substring(url.lastIndexOf('/') + 1)}`);
              } else {
                console.warn(`⚠️ Não foi possível deletar: ${url.substring(url.lastIndexOf('/') + 1)}`);
              }
            }
            console.log('✅ Processamento de exclusão concluído');
          }

          // Atualizar produto com URLs das imagens (ou limpar se não houver)
          if (newImageUrls.length > 0) {
            (produtoData as any).imagem_url = newImageUrls[0];
            (produtoData as any).imagens = newImageUrls;
            console.log(`✅ Salvando ${newImageUrls.length} imagens no banco`);
          } else {
            // Limpar imagens do banco se todas foram removidas
            (produtoData as any).imagem_url = null;
            (produtoData as any).imagens = [];
            console.log('🗑️ Removendo todas as imagens do banco (array vazio)');
          }
        } catch (uploadError: any) {
          console.error("❌ ERRO ao processar imagens:", uploadError);
          toast({ 
            title: "Erro nas Imagens", 
            description: `Erro ao processar imagens: ${uploadError.message}`, 
            variant: "destructive" 
          });
        }
      }
      
      // @ts-expect-error - RPC function exists but not in types
      const { error } = await supabase
        .from('produtos')
        .update(produtoData)
        .eq('id', id);

      if (error) throw error;

      // Verificar se as imagens foram realmente salvas
      if (images && images.length > 0 && (produtoData as any).imagens) {
        const { data: verificacao, error: verifyError } = await supabase
          .from("produtos")
          .select("imagem_url, imagens")
          .eq("id", id)
          .single();

        if (verifyError) {
          console.error("❌ Erro ao verificar salvamento:", verifyError);
        } else {
          console.log('✅ VERIFICAÇÃO DO BANCO:');
          console.log(`   imagem_url: ${verificacao.imagem_url}`);
          console.log(`   imagens (${verificacao.imagens?.length || 0}):`, verificacao.imagens);
          
          if (!verificacao.imagens || verificacao.imagens.length === 0) {
            console.error('❌ AVISO: Imagens não foram salvas no banco!');
            toast({ 
              title: "Aviso", 
              description: "Produto atualizado mas as imagens não foram salvas corretamente", 
              variant: "destructive" 
            });
          }
        }
      }

      // Atualizar relacionamentos com categorias
      if (categorias_ids !== undefined) {
        // Remover relacionamentos existentes
        await supabase
          .from('produtos_categorias')
          .delete()
          .eq('produto_id', id);

        // Criar novos relacionamentos
        if (categorias_ids.length > 0) {
          const relacionamentos = categorias_ids.map((categoria_id: string) => ({
            produto_id: id,
            categoria_id,
          }));

          const { error: relError } = await supabase
            .from('produtos_categorias')
            .insert(relacionamentos);

          if (relError) throw relError;
        }
      }

      // Atualizar variações se houver
      if (variacoes !== undefined) {
        console.log(`\n🎨 Atualizando variações para produto ${id}`);
        console.log('📋 Variações recebidas:', variacoes);
        
        // Remover variações existentes
        const { error: deleteError } = await supabase
          .from('variacoes_produto')
          .delete()
          .eq('produto_id', id);

        if (deleteError) {
          console.error('❌ Erro ao remover variações antigas:', deleteError);
        } else {
          console.log('✅ Variações antigas removidas');
        }

        // Criar novas variações
        if (variacoes.length > 0) {
          const variacoesParaSalvar = variacoes.map((variacao: any) => {
            const valorAdicional = parsePrecoVariacao(variacao.preco);
            const templateVariacaoId = variacao.variacaoProdutoId || null;
            console.log(`   Variação: ${variacao.combinacao}, preco original: "${variacao.preco}", valor convertido: ${valorAdicional}, modificado: ${variacao.modificado}, template_variacao_id: ${templateVariacaoId}`);
            
            return {
              produto_id: id,
              nome: variacao.combinacao,
              valor_adicional: valorAdicional,
              estoque: parseInt(variacao.estoque) || 0,
              sku: variacao.codigo || null,
              codigo_barras: variacao.codigo || null,
              ativo: true,
              modificado: variacao.modificado || false,
              template_variacao_id: templateVariacaoId, // Preservar ID do template se existir
            };
          });

          console.log('📋 Variações a salvar:', JSON.stringify(variacoesParaSalvar, null, 2));

          const { error: varError } = await supabase
            .from('variacoes_produto')
            .insert(variacoesParaSalvar);

          if (varError) {
            console.error('❌ Erro ao salvar variações:', varError);
            throw varError;
          }
          
          console.log(`✅ ${variacoes.length} variações salvas com sucesso`);
        }
      }

      toast({ title: "Sucesso", description: 'Produto atualizado com sucesso!', variant: "success" });
      
      // Limpar localStorage de imagens
      localStorage.removeItem('produto-form-images-autosave');
      
      fetchProdutos();
    } catch (error: any) {
      toast({ title: "Erro", description: 'Erro ao atualizar produto: ' + error.message, variant: "destructive" });
      throw error;
    }
  };

  const deleteProduto = async (id: string) => {
    try {
      console.log(`🗑️ Deletando produto ${id} e suas imagens...`);
      
      // Deletar todas as imagens do produto do storage (pasta inteira)
      const { deleted, errors: deleteErrors } = await deleteProductImages(id);
      if (deleted > 0) {
        console.log(`✅ ${deleted} imagens deletadas do storage`);
      }
      if (deleteErrors.length > 0) {
        console.warn('⚠️ Alguns erros ao deletar imagens:', deleteErrors);
      }
      
      // @ts-expect-error - RPC function exists but not in types
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Sucesso", description: 'Produto excluído com sucesso!', variant: "success" });
      fetchProdutos();
    } catch (error: any) {
      toast({ title: "Erro", description: 'Erro ao excluir produto: ' + error.message, variant: "destructive" });
      throw error;
    }
  };

  const toggleStatus = async (id: string, ativo: boolean) => {
    try {
      // @ts-expect-error - RPC function exists but not in types
      const { error } = await supabase
        .from('produtos')
        .update({ ativo } as any)
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Sucesso", description: `Produto ${ativo ? 'ativado' : 'desativado'} com sucesso!`, variant: "success" });
      fetchProdutos();
    } catch (error: any) {
      toast({ title: "Erro", description: 'Erro ao atualizar status: ' + error.message, variant: "destructive" });
      throw error;
    }
  };

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        fetchProdutos();
      }
    };
    
    checkAuthAndFetch();
    
    // Listener para carregar quando usuário logar
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        fetchProdutos();
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  return {
    produtos,
    loading,
    fetchProdutos,
    createProduto,
    updateProduto,
    deleteProduto,
    toggleStatus,
  };
};
