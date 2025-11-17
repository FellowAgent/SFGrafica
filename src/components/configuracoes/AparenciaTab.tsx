import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/utils/toastHelper";
import { useNavigate } from "react-router-dom";
import { useStatusConfig } from "@/hooks/useStatusConfig";

// Função para converter HEX para HSL
function hexToHSL(hex: string): string {
  // Remove o # se existir
  hex = hex.replace(/^#/, '');
  
  // Converte para RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  
  return `${h} ${s}% ${l}%`;
}

export const AparenciaTab = () => {
  const navigate = useNavigate();
  const { status, loading, createStatus, updateStatus, deleteStatus } = useStatusConfig();
  
  // Carregar cores do localStorage ou usar padrão
  const coresSalvas = localStorage.getItem('coresTema');
  const coresIniciais = coresSalvas ? JSON.parse(coresSalvas) : {
    principal: "#00FF00",
    secundaria: "#1C2023",
    terciaria: "#9ca3af",
  };
  
  const [cores, setCores] = useState(coresIniciais);
  const [logo, setLogo] = useState<string | null>(null);
  const [favicon, setFavicon] = useState<string | null>(null);
  
  // Configurações do Kanban
  const kanbanSalvo = localStorage.getItem('kanbanConfig');
  const kanbanInicial = kanbanSalvo ? JSON.parse(kanbanSalvo) : {
    corFundo: "#f5f5f5",
    imagemFundo: null,
  };
  const [kanbanConfig, setKanbanConfig] = useState(kanbanInicial);

  // Estados de edição
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editingStatusNome, setEditingStatusNome] = useState("");
  const [editingStatusCor, setEditingStatusCor] = useState("");
  const [editingStatusTextColor, setEditingStatusTextColor] = useState("#000000");

  const handleCorChange = (tipo: keyof typeof cores, valor: string) => {
    setCores({ ...cores, [tipo]: valor });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
        toast.success("Logo carregado com sucesso");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFavicon(reader.result as string);
        toast.success("Favicon carregado com sucesso");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKanbanImagemUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setKanbanConfig({ ...kanbanConfig, imagemFundo: reader.result as string });
        toast.success("Imagem de fundo carregada com sucesso");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoverImagemKanban = () => {
    setKanbanConfig({ ...kanbanConfig, imagemFundo: null });
    toast.success("Imagem de fundo removida");
  };

  const adicionarStatus = async () => {
    try {
      const maxOrdem = Math.max(...status.map(s => s.ordem), 0);
      await createStatus({
        nome: "novo status",
        cor: "#e5e7eb",
        text_color: "#374151",
        ordem: maxOrdem + 1,
      });
    } catch (error) {
      console.error('Erro ao adicionar status:', error);
    }
  };

  const removerStatus = async (id: string) => {
    try {
      await deleteStatus(id);
    } catch (error) {
      console.error('Erro ao remover status:', error);
    }
  };

  const iniciarEdicao = (statusItem: any) => {
    setEditingStatusId(statusItem.id);
    setEditingStatusNome(statusItem.nome);
    setEditingStatusCor(statusItem.cor);
    setEditingStatusTextColor(statusItem.text_color || "#000000");
  };

  const salvarEdicao = async () => {
    if (editingStatusId) {
      try {
        await updateStatus(editingStatusId, {
          nome: editingStatusNome,
          cor: editingStatusCor,
          text_color: editingStatusTextColor,
        });
        setEditingStatusId(null);
      } catch (error) {
        console.error('Erro ao salvar edição:', error);
      }
    }
  };

  const cancelarEdicao = () => {
    setEditingStatusId(null);
    setEditingStatusNome("");
    setEditingStatusCor("");
    setEditingStatusTextColor("#000000");
  };

  const aplicarCores = (coresTema: typeof cores) => {
    const root = document.documentElement;
    
    // Converter cores HEX para HSL e aplicar
    const primaryHSL = hexToHSL(coresTema.principal);
    const secondaryHSL = hexToHSL(coresTema.secundaria);
    const accentHSL = hexToHSL(coresTema.terciaria);
    
    // Aplicar no light mode
    root.style.setProperty('--primary', primaryHSL);
    root.style.setProperty('--accent', primaryHSL);
    root.style.setProperty('--secondary', secondaryHSL);
    root.style.setProperty('--ring', primaryHSL);
    
    // Cores derivadas para melhor contraste
    root.style.setProperty('--primary-foreground', '0 0% 10%');
    root.style.setProperty('--secondary-foreground', '0 0% 100%');
    root.style.setProperty('--accent-foreground', '0 0% 10%');
  };

  const handleSalvar = () => {
    // Salvar cores no localStorage
    localStorage.setItem('coresTema', JSON.stringify(cores));
    
    // Salvar configurações do Kanban
    localStorage.setItem('kanbanConfig', JSON.stringify(kanbanConfig));
    
    // Aplicar cores imediatamente
    aplicarCores(cores);
    
    toast.success("Aparência salva com sucesso!");
  };

  return (
    <div className="space-y-6">
      {/* Cores */}
      <Card>
        <CardHeader>
          <CardTitle>Cores da Interface</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="cor-principal">Cor Principal</Label>
              <div className="flex gap-2">
                <Input
                  id="cor-principal"
                  type="color"
                  value={cores.principal}
                  onChange={(e) => handleCorChange("principal", e.target.value)}
                  className="w-20 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={cores.principal}
                  onChange={(e) => handleCorChange("principal", e.target.value)}
                  placeholder="#242629"
                  className="flex-1"
                />
              </div>
              <div 
                className="h-16 rounded-md border"
                style={{ backgroundColor: cores.principal }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cor-secundaria">Cor Secundária</Label>
              <div className="flex gap-2">
                <Input
                  id="cor-secundaria"
                  type="color"
                  value={cores.secundaria}
                  onChange={(e) => handleCorChange("secundaria", e.target.value)}
                  className="w-20 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={cores.secundaria}
                  onChange={(e) => handleCorChange("secundaria", e.target.value)}
                  placeholder="#6b7280"
                  className="flex-1"
                />
              </div>
              <div 
                className="h-16 rounded-md border"
                style={{ backgroundColor: cores.secundaria }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cor-terciaria">Cor Terciária</Label>
              <div className="flex gap-2">
                <Input
                  id="cor-terciaria"
                  type="color"
                  value={cores.terciaria}
                  onChange={(e) => handleCorChange("terciaria", e.target.value)}
                  className="w-20 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={cores.terciaria}
                  onChange={(e) => handleCorChange("terciaria", e.target.value)}
                  placeholder="#9ca3af"
                  className="flex-1"
                />
              </div>
              <div 
                className="h-16 rounded-md border"
                style={{ backgroundColor: cores.terciaria }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logo e Favicon */}
      <Card>
        <CardHeader>
          <CardTitle>Logotipo e Favicon</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logotipo */}
            <div className="space-y-2">
              <Label>Logotipo</Label>
              <label htmlFor="logo-upload" className="cursor-pointer">
                <div className="border-2 border-dashed rounded-lg p-8 text-center bg-muted/10 hover:bg-muted/20 transition-colors">
                  {logo ? (
                    <img src={logo} alt="Logo" className="max-h-32 mx-auto" />
                  ) : (
                    <div className="text-muted-foreground">
                      <Upload className="mx-auto h-12 w-12 mb-2" />
                      <p>Clique para fazer upload</p>
                    </div>
                  )}
                </div>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </label>
            </div>

            {/* Favicon */}
            <div className="space-y-2">
              <Label>Favicon</Label>
              <label htmlFor="favicon-upload" className="cursor-pointer">
                <div className="border-2 border-dashed rounded-lg p-8 text-center bg-muted/10 hover:bg-muted/20 transition-colors">
                  {favicon ? (
                    <img src={favicon} alt="Favicon" className="max-h-16 mx-auto" />
                  ) : (
                    <div className="text-muted-foreground">
                      <Upload className="mx-auto h-8 w-8 mb-2" />
                      <p className="text-sm">Clique para fazer upload</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Recomendado: 32x32 ou 64x64 pixels
                      </p>
                    </div>
                  )}
                </div>
                <input
                  id="favicon-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFaviconUpload}
                />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quadro/Kanban */}
      <Card>
        <CardHeader>
          <CardTitle>Quadro/Kanban</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kanban-cor-fundo">Cor de Fundo do Quadro</Label>
              <div className="flex gap-2">
                <Input
                  id="kanban-cor-fundo"
                  type="color"
                  value={kanbanConfig.corFundo}
                  onChange={(e) => setKanbanConfig({ ...kanbanConfig, corFundo: e.target.value })}
                  className="w-20 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={kanbanConfig.corFundo}
                  onChange={(e) => setKanbanConfig({ ...kanbanConfig, corFundo: e.target.value })}
                  placeholder="#f5f5f5"
                  className="flex-1"
                />
              </div>
              <div 
                className="h-16 rounded-md border"
                style={{ backgroundColor: kanbanConfig.corFundo }}
              />
            </div>

            <div className="space-y-2">
              <Label>Imagem de Fundo do Quadro</Label>
              <p className="text-xs text-muted-foreground">
                Recomendado: 1920x1080 pixels
              </p>
              <div className="border-2 border-dashed rounded-lg p-6 text-center bg-muted/10">
                {kanbanConfig.imagemFundo ? (
                  <div className="space-y-4">
                    <img 
                      src={kanbanConfig.imagemFundo} 
                      alt="Imagem de fundo do Kanban" 
                      className="max-h-48 mx-auto rounded-md border" 
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRemoverImagemKanban}
                      size="sm"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remover Imagem
                    </Button>
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    <Upload className="mx-auto h-12 w-12 mb-2" />
                    <p>Nenhuma imagem de fundo</p>
                  </div>
                )}
              </div>
              
              {!kanbanConfig.imagemFundo && (
                <label htmlFor="kanban-image-upload">
                  <Button type="button" variant="outline" asChild className="w-full">
                    <span className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />
                      Fazer Upload da Imagem
                    </span>
                  </Button>
                  <input
                    id="kanban-image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleKanbanImagemUpload}
                  />
                </label>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Status de Pedidos</CardTitle>
          <Button onClick={adicionarStatus} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Status
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {status.map((statusItem) => (
              <div 
                key={statusItem.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                {editingStatusId === statusItem.id ? (
                  <>
                    <Input
                      value={editingStatusCor}
                      type="color"
                      onChange={(e) => setEditingStatusCor(e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={editingStatusNome}
                      onChange={(e) => setEditingStatusNome(e.target.value)}
                      className="flex-1"
                      placeholder="Nome do status"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button onClick={salvarEdicao} size="sm" variant="default">
                        Salvar
                      </Button>
                      <Button onClick={cancelarEdicao} size="sm" variant="outline">
                        Cancelar
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Badge 
                      className="justify-center px-4 py-1.5 text-xs font-medium border-0 whitespace-nowrap"
                      style={{ 
                        backgroundColor: statusItem.cor,
                        color: statusItem.text_color || "#000000",
                        borderRadius: '6px'
                      }}
                    >
                      {statusItem.nome}
                    </Badge>
                    <div className="flex-1" />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => iniciarEdicao(statusItem)}
                        size="sm"
                        variant="ghost"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => removerStatus(statusItem.id)}
                        size="sm"
                        variant="ghost"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 justify-end">
        <Button 
          type="button" 
          variant="outline"
          onClick={() => navigate("/loja/inicio")}
        >
          Cancelar
        </Button>
        <Button onClick={handleSalvar}>Salvar Aparência</Button>
      </div>
    </div>
  );
};
