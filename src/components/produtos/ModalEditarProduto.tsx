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

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto bg-card border-border my-4">
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
