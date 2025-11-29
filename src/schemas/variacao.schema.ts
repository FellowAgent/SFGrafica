import { z } from "zod";

export const templateVariacaoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  descricao: z.string().optional(),
  ativo: z.boolean().default(true),
  ordem: z.number().int().min(0).default(0),
});

export const atributoVariacaoSchema = z.object({
  template_id: z.string().uuid("Template inválido"),
  nome: z.string().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  pai_id: z.string().uuid().nullable().optional(),
  nivel: z.number().int().min(0).max(5, "Máximo de 5 níveis permitidos").default(0),
  ordem: z.number().int().min(0).default(0),
});

export const opcaoVariacaoSchema = z.object({
  atributo_id: z.string().uuid("Atributo inválido"),
  nome: z.string().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  sku: z.string().optional(),
  codigo_barras: z.string().optional(),
  valor_adicional: z.number().min(0, "Valor não pode ser negativo").default(0),
  estoque: z.number().int().min(0, "Estoque não pode ser negativo").default(0),
  imagem_url: z.string().url("URL inválida").optional().or(z.literal("")),
  ativo: z.boolean().default(true),
  ordem: z.number().int().min(0).default(0),
});

export type TemplateVariacao = z.infer<typeof templateVariacaoSchema>;
export type AtributoVariacao = z.infer<typeof atributoVariacaoSchema>;
export type OpcaoVariacao = z.infer<typeof opcaoVariacaoSchema>;
