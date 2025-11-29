import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, ArrowUpToLine, ArrowDownToLine, MoveVertical, ArrowLeftToLine, ArrowRightToLine, Bell, Clock, Trash2 } from "lucide-react";
import { toast } from "@/utils/toastHelper";
import { useNavigate } from "react-router-dom";
import { Slider } from "@/components/ui/slider";

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

  // Configurações de posição dos toasts
  const toastPosSalva = localStorage.getItem('toastPosition');
  const toastPosInicial = toastPosSalva ? JSON.parse(toastPosSalva) : {
    altura: "top",
    lado: "right",
  };
  const [toastPosition, setToastPosition] = useState(toastPosInicial);

  // Configuração de duração dos toasts
  const toastDuracaoSalva = localStorage.getItem('toastDuration');
  const [toastDuration, setToastDuration] = useState(toastDuracaoSalva || "4000");
  const [customDuration, setCustomDuration] = useState("");

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

  const mostrarPreviewToast = (altura: string, lado: string) => {
    // Temporariamente atualizar posição para mostrar preview
    const tempPosition = { altura, lado };
    localStorage.setItem('toastPosition', JSON.stringify(tempPosition));
    window.dispatchEvent(new Event('toastPositionChange'));
    
    // Mostrar toast de preview
    toast.info("Esta é a posição de preview");
  };

  const handleToastPositionChange = (tipo: 'altura' | 'lado', valor: string) => {
    const novaPosition = { ...toastPosition, [tipo]: valor };
    setToastPosition(novaPosition);
    mostrarPreviewToast(novaPosition.altura, novaPosition.lado);
  };

  const handleSalvar = () => {
    // Salvar cores no localStorage
    localStorage.setItem('coresTema', JSON.stringify(cores));
    
    // Salvar configurações do Kanban
    localStorage.setItem('kanbanConfig', JSON.stringify(kanbanConfig));
    
    // Salvar posição dos toasts
    localStorage.setItem('toastPosition', JSON.stringify(toastPosition));
    
    // Salvar duração dos toasts
    localStorage.setItem('toastDuration', toastDuration);
    
    // Aplicar cores imediatamente
    aplicarCores(cores);
    
    // Disparar evento para atualizar a posição dos toasts
    window.dispatchEvent(new Event('toastPositionChange'));
    
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

      {/* Posição dos Toasts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Posição das Notificações
          </CardTitle>
          <CardDescription>
            Configure onde as notificações do sistema aparecerão na tela
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Preview Visual */}
          <div className="relative w-full h-64 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border-2 border-dashed border-border/50 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 font-medium">
              <span className="text-sm">Preview da Tela</span>
            </div>
            
            {/* Toast Preview */}
            <div
              className={`absolute transition-all duration-300 ease-out ${
                toastPosition.altura === "top" ? "top-4" : 
                toastPosition.altura === "center" ? "top-1/2 -translate-y-1/2" : 
                "bottom-4"
              } ${
                toastPosition.lado === "left" ? "left-4" : "right-4"
              } w-72 animate-fade-in`}
            >
              <div className="bg-gradient-to-br from-slate-950/95 to-slate-900/95 text-slate-50 rounded-xl border border-slate-500/30 shadow-2xl p-4 backdrop-blur-xl">
                <div className="flex items-start gap-3">
                  <Bell className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Notificação de Exemplo</p>
                    <p className="text-xs opacity-90 mt-1">Esta é a posição atual</p>
                  </div>
                </div>
                <div className="h-0.5 mt-3 bg-white/10 overflow-hidden rounded-full">
                  <div className="h-full w-3/4 bg-gradient-to-r from-cyan-400/80 to-blue-300/60"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Altura */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <MoveVertical className="h-4 w-4" />
                Posição Vertical
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={toastPosition.altura === "top" ? "default" : "outline"}
                  onClick={() => handleToastPositionChange("altura", "top")}
                  className="h-auto py-4 flex-col gap-2 transition-all hover:scale-105 hover:shadow-md"
                >
                  <ArrowUpToLine className="h-5 w-5" />
                  <span className="text-xs font-medium">Topo</span>
                </Button>
                <Button
                  type="button"
                  variant={toastPosition.altura === "center" ? "default" : "outline"}
                  onClick={() => handleToastPositionChange("altura", "center")}
                  className="h-auto py-4 flex-col gap-2 transition-all hover:scale-105 hover:shadow-md"
                >
                  <MoveVertical className="h-5 w-5" />
                  <span className="text-xs font-medium">Centro</span>
                </Button>
                <Button
                  type="button"
                  variant={toastPosition.altura === "bottom" ? "default" : "outline"}
                  onClick={() => handleToastPositionChange("altura", "bottom")}
                  className="h-auto py-4 flex-col gap-2 transition-all hover:scale-105 hover:shadow-md"
                >
                  <ArrowDownToLine className="h-5 w-5" />
                  <span className="text-xs font-medium">Base</span>
                </Button>
              </div>
            </div>

            {/* Lado */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <ArrowLeftToLine className="h-4 w-4" />
                Posição Horizontal
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={toastPosition.lado === "left" ? "default" : "outline"}
                  onClick={() => handleToastPositionChange("lado", "left")}
                  className="h-auto py-4 flex-col gap-2 transition-all hover:scale-105 hover:shadow-md"
                >
                  <ArrowLeftToLine className="h-5 w-5" />
                  <span className="text-xs font-medium">Esquerda</span>
                </Button>
                <Button
                  type="button"
                  variant={toastPosition.lado === "right" ? "default" : "outline"}
                  onClick={() => handleToastPositionChange("lado", "right")}
                  className="h-auto py-4 flex-col gap-2 transition-all hover:scale-105 hover:shadow-md"
                >
                  <ArrowRightToLine className="h-5 w-5" />
                  <span className="text-xs font-medium">Direita</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Duração */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <Clock className="h-4 w-4" />
                Duração da Notificação
              </Label>
              <Badge variant="secondary" className="text-xs font-mono">
                {parseInt(toastDuration) < 1000 
                  ? `${parseInt(toastDuration)}ms` 
                  : `${(parseInt(toastDuration) / 1000).toFixed(1)}s`}
              </Badge>
            </div>
            
            <div className="space-y-3">
              <Slider
                value={[parseInt(toastDuration)]}
                onValueChange={(value) => setToastDuration(value[0].toString())}
                min={1000}
                max={10000}
                step={500}
                className="w-full"
              />
              
              <div className="grid grid-cols-4 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={toastDuration === "1000" ? "default" : "outline"}
                  onClick={() => setToastDuration("1000")}
                  className="transition-all hover:scale-105"
                >
                  1s
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={toastDuration === "2000" ? "default" : "outline"}
                  onClick={() => setToastDuration("2000")}
                  className="transition-all hover:scale-105"
                >
                  2s
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={toastDuration === "4000" ? "default" : "outline"}
                  onClick={() => setToastDuration("4000")}
                  className="transition-all hover:scale-105"
                >
                  4s
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={toastDuration === "6000" ? "default" : "outline"}
                  onClick={() => setToastDuration("6000")}
                  className="transition-all hover:scale-105"
                >
                  6s
                </Button>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex-1 text-left">Rápido (1s)</span>
                <span className="flex-1 text-center">Normal (4s)</span>
                <span className="flex-1 text-right">Lento (10s)</span>
              </div>
            </div>
          </div>

          {/* Botão de teste */}
          <div className="pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                toast.info("Esta é uma notificação de teste!", {
                  duration: parseInt(toastDuration) || 4000,
                })
              }
              className="w-full transition-all hover:scale-[1.02] hover:shadow-md"
            >
              <Bell className="mr-2 h-4 w-4" />
              Testar Notificação
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 justify-end">
        <Button 
          type="button" 
          variant="outline"
          onClick={() => navigate("/inicio")}
        >
          Cancelar
        </Button>
        <Button onClick={handleSalvar}>Salvar Aparência</Button>
      </div>
    </div>
  );
};
