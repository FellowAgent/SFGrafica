import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Banknote, FileText, Wallet, Receipt } from "lucide-react";

interface FormaPagamentoSelectorProps {
  meioPagamento: string | null;
  onMeioPagamentoChange: (meio: string) => void;
  gerarNotaFiscal?: boolean;
  onGerarNotaFiscalChange?: (gerar: boolean) => void;
  showNotaFiscal?: boolean;
}

export function FormaPagamentoSelector({
  meioPagamento,
  onMeioPagamentoChange,
  gerarNotaFiscal = false,
  onGerarNotaFiscalChange,
  showNotaFiscal = true,
}: FormaPagamentoSelectorProps) {
  return (
    <div className="space-y-4">
      <Label className="text-base">Meio de Pagamento</Label>
      <div className="space-y-2">
        {/* PIX */}
        <button
          type="button"
          onClick={() => onMeioPagamentoChange("pix")}
          className={cn(
            "w-full px-3 py-2 rounded-lg border-2 transition-all text-left flex items-center gap-3",
            meioPagamento === "pix"
              ? "border-primary bg-primary/5"
              : "border-border bg-background hover:border-primary/50"
          )}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 flex-shrink-0">
            <path fill="#4db6ac" d="M11.9,12h-0.68l8.04-8.04c2.62-2.61,6.86-2.61,9.48,0L36.78,12H36.1c-1.6,0-3.11,0.62-4.24,1.76l-6.8,6.77c-0.59,0.59-1.53,0.59-2.12,0l-6.8-6.77C15.01,12.62,13.5,12,11.9,12z"/>
            <path fill="#4db6ac" d="M36.1,36h0.68l-8.04,8.04c-2.62,2.61-6.86,2.61-9.48,0L11.22,36h0.68c1.6,0,3.11-0.62,4.24-1.76l6.8-6.77c0.59-0.59,1.53-0.59,2.12,0l6.8,6.77C32.99,35.38,34.5,36,36.1,36z"/>
            <path fill="#4db6ac" d="M44.04,28.74L38.78,34H36.1c-1.07,0-2.07-0.42-2.83-1.17l-6.8-6.78c-1.36-1.36-3.58-1.36-4.94,0l-6.8,6.78C13.97,33.58,12.97,34,11.9,34H9.22l-5.26-5.26c-2.61-2.62-2.61-6.86,0-9.48L9.22,14h2.68c1.07,0,2.07,0.42,2.83,1.17l6.8,6.78c0.68,0.68,1.58,1.02,2.47,1.02s1.79-0.34,2.47-1.02l6.8-6.78C34.03,14.42,35.03,14,36.1,14h2.68l5.26,5.26C46.65,21.88,46.65,26.12,44.04,28.74z"/>
          </svg>
          <span className="font-medium text-sm">PIX</span>
        </button>

        {/* Crédito */}
        <button
          type="button"
          onClick={() => onMeioPagamentoChange("credito")}
          className={cn(
            "w-full px-3 py-2 rounded-lg border-2 transition-all text-left flex items-center gap-3",
            meioPagamento === "credito"
              ? "border-primary bg-primary/5"
              : "border-border bg-background hover:border-primary/50"
          )}
        >
          <CreditCard className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <span className="font-medium text-sm">Crédito</span>
        </button>

        {/* Débito */}
        <button
          type="button"
          onClick={() => onMeioPagamentoChange("debito")}
          className={cn(
            "w-full px-3 py-2 rounded-lg border-2 transition-all text-left flex items-center gap-3",
            meioPagamento === "debito"
              ? "border-primary bg-primary/5"
              : "border-border bg-background hover:border-primary/50"
          )}
        >
          <CreditCard className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <span className="font-medium text-sm">Débito</span>
        </button>

        {/* Boleto */}
        <button
          type="button"
          onClick={() => onMeioPagamentoChange("boleto")}
          className={cn(
            "w-full px-3 py-2 rounded-lg border-2 transition-all text-left flex items-center gap-3",
            meioPagamento === "boleto"
              ? "border-primary bg-primary/5"
              : "border-border bg-background hover:border-primary/50"
          )}
        >
          <FileText className="w-5 h-5 text-gray-600 flex-shrink-0" />
          <span className="font-medium text-sm">Boleto</span>
        </button>

        {/* Dinheiro */}
        <button
          type="button"
          onClick={() => onMeioPagamentoChange("dinheiro")}
          className={cn(
            "w-full px-3 py-2 rounded-lg border-2 transition-all text-left flex items-center gap-3",
            meioPagamento === "dinheiro"
              ? "border-primary bg-primary/5"
              : "border-border bg-background hover:border-primary/50"
          )}
        >
          <Banknote className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="font-medium text-sm">Dinheiro</span>
        </button>

        {/* Faturado */}
        <button
          type="button"
          onClick={() => onMeioPagamentoChange("faturado")}
          className={cn(
            "w-full px-3 py-2 rounded-lg border-2 transition-all text-left flex items-center gap-3",
            meioPagamento === "faturado"
              ? "border-primary bg-primary/5"
              : "border-border bg-background hover:border-primary/50"
          )}
        >
          <Receipt className="w-5 h-5 text-purple-600 flex-shrink-0" />
          <span className="font-medium text-sm">Faturado</span>
        </button>
      </div>

      {showNotaFiscal && onGerarNotaFiscalChange && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-accent/10 border border-accent/20 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">📄</span>
            <Label htmlFor="notaFiscal" className="font-medium cursor-pointer text-sm">
              Gerar Nota Fiscal
            </Label>
          </div>
          <Switch
            id="notaFiscal"
            checked={gerarNotaFiscal}
            onCheckedChange={onGerarNotaFiscalChange}
          />
        </div>
      )}
    </div>
  );
}
