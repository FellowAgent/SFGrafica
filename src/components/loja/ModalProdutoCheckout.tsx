import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import { formatCurrencyWithSymbol, parseCurrencyToNumber } from "@/utils/inputMasks";
import { useProdutos } from "@/hooks/useProdutos";

interface ProdutoData {
  id?: string;
  produto_id: string;
  variacao_id?: string;
  quantidade: number;
  preco_unitario: number;
  desconto: number;
  observacoes?: string;
  medida?: string;
  material?: string;
  acabamento?: string;
}

interface ModalProdutoCheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (produto: ProdutoData) => Promise<void>;
  produtoInicial?: ProdutoData | null;
  titulo?: string;
}

export function ModalProdutoCheckout({ 
  open, 
  onOpenChange, 
  onSave, 
  produtoInicial,
  titulo = "Produto"
}: ModalProdutoCheckoutProps) {
  const { produtos: produtosDB } = useProdutos();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<ProdutoData>({
    produto_id: "",
    quantidade: 1,
    preco_unitario: 0,
    desconto: 0,
    observacoes: "",
    medida: "",
    material: "",
    acabamento: "",
  });

  // Preço e desconto formatados para exibição
  const [precoFormatado, setPrecoFormatado] = useState("");
  const [descontoFormatado, setDescontoFormatado] = useState("");

  useEffect(() => {
    if (produtoInicial) {
      setFormData(produtoInicial);
      setPrecoFormatado(formatCurrencyWithSymbol(produtoInicial.preco_unitario));
      setDescontoFormatado(formatCurrencyWithSymbol(produtoInicial.desconto));
    } else {
      setFormData({
        produto_id: "",
        quantidade: 1,
        preco_unitario: 0,
        desconto: 0,
        observacoes: "",
        medida: "",
        material: "",
        acabamento: "",
      });
      setPrecoFormatado("");
      setDescontoFormatado("");
    }
  }, [produtoInicial, open]);

  const handleProdutoChange = (produtoId: string) => {
    const produto = produtosDB.find(p => p.id === produtoId);
    if (produto) {
      const novoPreco = produto.preco || 0;
      setFormData(prev => ({
        ...prev,
        produto_id: produtoId,
        preco_unitario: novoPreco,
      }));
      setPrecoFormatado(formatCurrencyWithSymbol(novoPreco));
    }
  };

  const handlePrecoChange = (value: string) => {
    setPrecoFormatado(value);
    const numericValue = parseCurrencyToNumber(value);
    setFormData(prev => ({ ...prev, preco_unitario: numericValue }));
  };

  const handleDescontoChange = (value: string) => {
    setDescontoFormatado(value);
    const numericValue = parseCurrencyToNumber(value);
    setFormData(prev => ({ ...prev, desconto: numericValue }));
  };

  const handleSave = async () => {
    if (!formData.produto_id) return;
    
    setLoading(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const calcularSubtotal = () => {
    const subtotal = (formData.quantidade * formData.preco_unitario) - formData.desconto;
    return subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1">
          <div className="space-y-4 px-6 py-1">
            {/* Produto */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">* Produto</Label>
              <Select 
                value={formData.produto_id} 
                onValueChange={handleProdutoChange}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {produtosDB
                    .filter(p => p.ativo)
                    .map((produto) => (
                      <SelectItem key={produto.id} value={produto.id}>
                        {produto.nome} {produto.codigo_barras && `- ${produto.codigo_barras}`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grid: Quantidade, Preço e Desconto */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">* Quantidade</Label>
                <Input
                  type="number"
                  min="1"
                  className="h-9"
                  value={formData.quantidade}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    quantidade: parseInt(e.target.value) || 1 
                  }))}
                />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">* Preço</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="h-9"
                  value={precoFormatado}
                  onChange={(e) => handlePrecoChange(e.target.value)}
                  placeholder="R$ 0,00"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Desconto</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="h-9"
                  value={descontoFormatado}
                  onChange={(e) => handleDescontoChange(e.target.value)}
                  placeholder="R$ 0,00"
                />
              </div>
            </div>

            {/* Grid: Medida, Material e Acabamento */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Medida</Label>
                <Input
                  type="text"
                  className="h-9"
                  value={formData.medida || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, medida: e.target.value }))}
                  placeholder="Ex: 10x15cm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Material</Label>
                <Input
                  type="text"
                  className="h-9"
                  value={formData.material || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, material: e.target.value }))}
                  placeholder="Ex: Papel fosco"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Acabamento</Label>
                <Input
                  type="text"
                  className="h-9"
                  value={formData.acabamento || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, acabamento: e.target.value }))}
                  placeholder="Ex: Laminado"
                />
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Observações</Label>
              <Textarea
                value={formData.observacoes || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Observações adicionais sobre o produto"
                className="min-h-[80px] resize-none"
              />
            </div>

            {/* Subtotal */}
            <div className="border-t pt-3 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Subtotal:</span>
                <span className="text-xl font-bold text-primary">R$ {calcularSubtotal()}</span>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!formData.produto_id || loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
