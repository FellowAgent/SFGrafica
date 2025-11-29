import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ProdutoFormEtapas } from "./ProdutoFormEtapas";
import { ProdutoFormCompleto } from "./ProdutoFormCompleto";

interface ProdutoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editandoProduto?: any;
}

export function ModalEditarProduto({ open, onOpenChange, editandoProduto }: ProdutoFormDialogProps) {
  const [modo, setModo] = useState<"etapas" | "completo">("completo");

  // Interceptar fechamento do dialog para permitir que o formulário controle
  const handleOpenChange = (newOpen: boolean) => {
    // Se estiver tentando fechar, ignorar - o formulário controla via botões
    if (!newOpen) {
      // Não fazer nada - o formulário lida com fechamento via botões
      return;
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal>
      <DialogContent 
        className="max-w-7xl max-h-[90vh] overflow-y-auto bg-card border-border my-4 [&>button]:hidden"
        onPointerDownOutside={(e) => {
          // Não bloquear - permitir que o Select funcione normalmente
          // O controle de fechamento é feito via botões
        }}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          if (!target) {
            e.preventDefault();
            return;
          }
          
          // Verificar se a interação foi com um elemento do Radix UI (Select, Popover, etc)
          // Esses componentes usam Portals renderizados no body
          const isRadixComponent = 
            target.closest('[role="listbox"]') !== null || // Select content
            target.closest('[role="option"]') !== null || // Select item
            target.closest('[data-radix-select-content]') !== null ||
            target.closest('[data-radix-popover-content]') !== null ||
            target.closest('[data-radix-portal]') !== null ||
            target.closest('[data-radix-dialog-content]') !== null ||
            target.closest('[data-radix-alert-dialog-content]') !== null;
          
          if (isRadixComponent) {
            return; // Permitir a interação com componentes Radix
          }
          
          // Bloquear apenas cliques fora de tudo (no overlay)
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {editandoProduto ? "Editar Produto" : "Novo Produto"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {editandoProduto ? "Formulário para editar informações do produto" : "Formulário para cadastrar novo produto"}
          </DialogDescription>
        </DialogHeader>
        
        {modo === "etapas" ? (
          <ProdutoFormEtapas
            onComplete={() => onOpenChange(false)}
            onModoCompleto={() => setModo("completo")}
          />
        ) : (
          <ProdutoFormCompleto 
            onComplete={() => onOpenChange(false)}
            editandoProduto={editandoProduto}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
