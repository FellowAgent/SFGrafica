import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cnpj } = await req.json();
    
    if (!cnpj) {
      return new Response(
        JSON.stringify({ error: 'CNPJ é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limpar CNPJ (remover pontuação)
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    
    if (cnpjLimpo.length !== 14) {
      return new Response(
        JSON.stringify({ error: 'CNPJ inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Consultando CNPJ:', cnpjLimpo);

    // Consultar API da ReceitaWS (API pública gratuita)
    const response = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpjLimpo}`);
    
    if (!response.ok) {
      console.error('Erro na API ReceitaWS:', response.status);
      return new Response(
        JSON.stringify({ error: 'Erro ao consultar CNPJ. Tente novamente mais tarde.' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    if (data.status === 'ERROR') {
      console.error('CNPJ não encontrado:', data.message);
      return new Response(
        JSON.stringify({ error: data.message || 'CNPJ não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filtrar apenas o primeiro telefone se houver múltiplos
    const telefoneRaw = data.telefone || '';
    const primeiroTelefone = telefoneRaw.includes('/') 
      ? telefoneRaw.split('/')[0].trim() 
      : telefoneRaw;

    // Formatar dados da resposta
    const resultado = {
      nome: data.nome || '',
      razao_social: data.nome || '',
      email: data.email || '',
      telefone: primeiroTelefone,
      cep: data.cep?.replace(/\D/g, '') || '',
      endereco: data.logradouro || '',
      numero: data.numero || '',
      complemento: data.complemento || '',
      bairro: data.bairro || '',
      cidade: data.municipio || '',
      estado: data.uf || '',
    };

    console.log('CNPJ consultado com sucesso:', resultado);

    return new Response(
      JSON.stringify(resultado),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao processar requisição' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});