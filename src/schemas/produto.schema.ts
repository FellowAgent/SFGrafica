import { z } from "zod";

export const produtoSchema = z.object({
  // Dados Básicos
  nome: z.string().trim().min(1, "Nome é obrigatório").max(200, "Nome muito longo"),
  descricao: z.string().trim().max(1000, "Descrição muito longa").optional(),
  codigo_barras: z.string().trim().max(50, "Código de barras muito longo").optional(),
  preco: z.number().min(0, "Preço deve ser maior ou igual a zero").max(99999999.99, "Preço máximo: R$ 99.999.999,99"),
  custo: z.number().min(0, "Custo deve ser maior ou igual a zero").max(99999999.99, "Custo máximo: R$ 99.999.999,99").optional(),
  estoque: z.number().int("Estoque deve ser um número inteiro").min(0, "Estoque não pode ser negativo").optional(),
  estoque_minimo: z.number().int("Estoque mínimo deve ser um número inteiro").min(0, "Estoque mínimo não pode ser negativo").optional(),
  unidade_medida: z.string().trim().max(10, "Unidade de medida muito longa").default("un"),
  categoria_id: z.string().uuid("Categoria inválida").optional().nullable(),
  categorias_ids: z.array(z.string().uuid("Categoria inválida")).optional().default([]),
  imagem_url: z.string().trim().max(500, "URL de imagem muito longa").optional(),
  imagens: z.array(z.string().trim().max(500, "URL de imagem muito longa")).max(5, "Máximo de 5 imagens").optional(),
  ativo: z.boolean().default(true),
  desconto: z.number().min(0, "Desconto deve ser maior ou igual a zero").max(99999999.99, "Desconto máximo: R$ 99.999.999,99").optional(),
  tipo_desconto: z.enum(["valor", "porcentagem"]).default("valor").optional(),
  
  // Características
  descricaoCurta: z.string().trim().max(500, "Descrição curta muito longa").optional(),
  descricaoComplementar: z.string().trim().max(2000, "Descrição complementar muito longa").optional(),
  observacoes: z.string().trim().max(1000, "Observações muito longas").optional(),
  tags: z.array(z.string()).optional(),
  
  // Campos adicionais para pedidos
  medidas: z.string().trim().max(100, "Medidas muito longas").optional(),
  material: z.string().trim().max(100, "Material muito longo").optional(),
  arte_final_acabamentos: z.string().trim().max(200, "Arte Final/Acabamentos muito longo").optional(),
  quantidade: z.string().trim().max(50, "Quantidade muito longa").optional(),
  
  // Tributação
  ncm: z.string().trim().max(20, "NCM muito longo").optional(),
  cest: z.string().trim().max(20, "CEST muito longo").optional(),
  origem: z.string().trim().max(10, "Origem muito longa").optional(),
  cfop: z.string().trim().max(10, "CFOP muito longo").optional(),
  icms_cst: z.string().trim().max(10, "CST ICMS muito longo").optional(),
  icms_aliquota: z.number().min(0).max(100, "Alíquota ICMS inválida").optional(),
  pis_cst: z.string().trim().max(10, "CST PIS muito longo").optional(),
  pis_aliquota: z.number().min(0).max(100, "Alíquota PIS inválida").optional(),
  cofins_cst: z.string().trim().max(10, "CST COFINS muito longo").optional(),
  cofins_aliquota: z.number().min(0).max(100, "Alíquota COFINS inválida").optional(),
  codigo_servico: z.string().trim().max(20, "Código de serviço muito longo").optional(),
  iss_aliquota: z.number().min(0).max(100, "Alíquota ISS inválida").optional(),
});

export const produtoUpdateSchema = produtoSchema.partial();

export type ProdutoInput = z.infer<typeof produtoSchema>;
export type ProdutoUpdateInput = z.infer<typeof produtoUpdateSchema>;
