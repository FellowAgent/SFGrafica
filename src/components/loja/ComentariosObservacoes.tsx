import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { useComentariosPedido, ComentarioPedido } from "@/hooks/useComentariosPedido";

interface ComentariosObservacoesProps {
  pedidoId: string;
}

export default function ComentariosObservacoes({ pedidoId }: ComentariosObservacoesProps) {
  const { comentarios, addComentario, loading } = useComentariosPedido(pedidoId);
  const [comentarioTexto, setComentarioTexto] = useState("");

  const handlePostarComentario = async () => {
    if (!comentarioTexto.trim()) return;
    
    try {
      await addComentario(pedidoId, comentarioTexto);
      setComentarioTexto("");
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold text-foreground">Comentários/Observações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-6">
        {loading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Lista de comentários */}
            {comentarios.length > 0 && (
              <ScrollArea className="h-[300px] pr-3">
                <div className="space-y-3">
                  {comentarios.map((comentario) => (
                    <Card key={comentario.id} className="shadow-sm bg-background border-border">
                      <CardContent className="p-3">
                        <div className="space-y-1">
                          <div className="flex items-start justify-between">
                            <p className="font-semibold text-sm text-foreground">
                              {comentario.perfis?.nome || "Usuário"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(comentario.created_at).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <p className="text-sm text-foreground">{comentario.comentario}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Campo para adicionar comentário */}
            <div className="space-y-3">
              <Textarea
                value={comentarioTexto}
                onChange={(e) => setComentarioTexto(e.target.value)}
                placeholder="Escrever um comentário..."
                rows={3}
                className="resize-none bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handlePostarComentario}
                  disabled={!comentarioTexto.trim()}
                  className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Send className="h-4 w-4" />
                  Postar
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
