import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/utils/toastHelper";

const LimparDadosFicticios = () => {
  const [loading, setLoading] = useState(false);

  const limparDados = async () => {
    setLoading(true);
    try {
      // Atualizar produto para remover categoria fictícia
      const { error: updateError } = await supabase
        .from('produtos')
        .update({ categoria_id: null })
        .eq('id', '4397d218-a463-4a3f-a511-dbbf2da90fc8');

      if (updateError) throw updateError;

      // Deletar produtos fictícios
      const produtosFicticios = [
        '64cd0282-df52-4f34-aca3-84ba9df9dead',
        '07d7fafd-7e59-49b1-9b3c-872531721abf',
        '93ab3d7f-c504-4748-9397-54f53bc8dbcf',
        '72b571f4-6aba-4120-bbd3-62f0e8e98fa4',
        '7df7bd86-dffb-4777-aa25-2ebfc56fd96f'
      ];

      const { error: deleteProdutosError } = await supabase
        .from('produtos')
        .delete()
        .in('id', produtosFicticios);

      if (deleteProdutosError) throw deleteProdutosError;

      // Deletar categoria fictícia
      const { error: deleteCategoriaError } = await supabase
        .from('categorias')
        .delete()
        .eq('id', '6eaa94ce-4f2a-4014-8dfa-4c7062fe77eb');

      if (deleteCategoriaError) throw deleteCategoriaError;

      toast.success('Dados fictícios removidos com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao limpar dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Limpar Dados Fictícios</h1>
        <p className="text-muted-foreground">
          Esta página remove os dados de teste do sistema:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm">
          <li>Produtos fictícios (Carro elétrico, Espanador de água, etc.)</li>
          <li>Categoria "Cartão de Visita"</li>
          <li>Atualiza produto "Lavador de Papel Carbono"</li>
        </ul>
        <Button 
          onClick={limparDados} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Removendo...' : 'Remover Dados Fictícios'}
        </Button>
      </div>
    </div>
  );
};

export default LimparDadosFicticios;
