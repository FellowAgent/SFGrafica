import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Download, 
  Smartphone, 
  Monitor, 
  Zap, 
  Wifi, 
  Bell, 
  Lock, 
  Rocket,
  CheckCircle2,
  ChevronRight,
  Chrome,
  Apple,
  CircleDot,
  Share2,
  MoreVertical,
  Menu,
  PlusSquare,
  Home
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string>("mobile");

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const benefits = [
    {
      icon: Zap,
      title: "Mais Rápido",
      description: "Carregamento instantâneo e performance otimizada"
    },
    {
      icon: Wifi,
      title: "Funciona Offline",
      description: "Acesse seus dados mesmo sem internet"
    },
    {
      icon: Bell,
      title: "Notificações",
      description: "Receba alertas importantes em tempo real"
    },
    {
      icon: Lock,
      title: "Mais Seguro",
      description: "App isolado do navegador para maior segurança"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Fellow CRM" className="h-8 object-contain" />
            <div className="hidden sm:block">
              <h1 className="font-bold text-lg">Fellow CRM</h1>
              <p className="text-xs text-muted-foreground">Progressive Web App</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/login")}
            className="text-muted-foreground hover:text-foreground"
          >
            Pular instalação
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Hero Section */}
        <div className="text-center space-y-6 mb-12">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full" />
              <div className="relative bg-gradient-to-br from-accent/10 to-primary/10 p-6 rounded-3xl border border-accent/20">
                <Download className="h-16 w-16 text-accent" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Badge variant="secondary" className="px-3 py-1">
              <Rocket className="mr-1.5 h-3.5 w-3.5" />
              Aplicativo Web Progressivo (PWA)
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Instale o Fellow CRM
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Transforme seu navegador em um aplicativo nativo. Mais rápido, mais prático, sempre disponível.
            </p>
          </div>

          {/* Install Button - Prominent */}
          {isInstalled ? (
            <div className="max-w-md mx-auto">
              <Card className="border-green-500/50 bg-green-500/5">
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="bg-green-500/10 p-3 rounded-full">
                      <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-lg text-green-700 dark:text-green-300">
                      ✓ App Instalado com Sucesso!
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Você pode acessar o Fellow CRM diretamente da tela inicial do seu dispositivo.
                    </p>
                  </div>
                  <Button 
                    onClick={() => navigate("/login")} 
                    className="w-full"
                    size="lg"
                  >
                    Acessar Sistema
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : isInstallable ? (
            <div className="max-w-md mx-auto space-y-4">
              <Card className="border-accent/50 bg-accent/5">
                <CardContent className="pt-6 space-y-4">
                  <p className="text-center font-medium">
                    🎉 Ótimas notícias! Seu navegador suporta instalação automática.
                  </p>
                  <Button 
                    onClick={handleInstall} 
                    className="w-full bg-accent hover:bg-accent/90"
                    size="lg"
                  >
                    <Download className="mr-2 h-5 w-5" />
                    Instalar Agora (Recomendado)
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Instalação rápida com um clique • Sem download adicional
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>

        {/* Benefits Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-center mb-8">Por que instalar?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card key={index} className="border-muted hover:border-accent/50 transition-colors">
                  <CardContent className="pt-6 text-center space-y-3">
                    <div className="flex justify-center">
                      <div className="bg-accent/10 p-3 rounded-lg">
                        <Icon className="h-6 w-6 text-accent" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Separator className="my-12" />

        {/* Installation Instructions */}
        {!isInstalled && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Como Instalar?</h2>
              <p className="text-muted-foreground">
                Escolha seu dispositivo e siga o passo a passo
              </p>
            </div>

            <Tabs defaultValue={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
                <TabsTrigger value="mobile" className="gap-2">
                  <Smartphone className="h-4 w-4" />
                  Celular
                </TabsTrigger>
                <TabsTrigger value="desktop" className="gap-2">
                  <Monitor className="h-4 w-4" />
                  Computador
                </TabsTrigger>
              </TabsList>

              {/* Mobile Instructions */}
              <TabsContent value="mobile" className="space-y-4 mt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* iPhone/Safari */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-500/10 p-2 rounded-lg">
                            <Apple className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">iPhone / iPad</CardTitle>
                            <CardDescription>Safari</CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <div className="bg-accent/10 rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                            1
                          </div>
                          <div className="flex-1 pt-0.5">
                            <p className="font-medium text-sm mb-1">Abra o Menu de Compartilhamento</p>
                            <p className="text-xs text-muted-foreground">
                              Toque no ícone <Share2 className="inline h-3 w-3 mx-0.5" /> na barra inferior do Safari
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="bg-accent/10 rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                            2
                          </div>
                          <div className="flex-1 pt-0.5">
                            <p className="font-medium text-sm mb-1">Adicionar à Tela Inicial</p>
                            <p className="text-xs text-muted-foreground">
                              Role para baixo e toque em <PlusSquare className="inline h-3 w-3 mx-0.5" /> "Adicionar à Tela de Início"
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="bg-accent/10 rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                            3
                          </div>
                          <div className="flex-1 pt-0.5">
                            <p className="font-medium text-sm mb-1">Confirme a Instalação</p>
                            <p className="text-xs text-muted-foreground">
                              Toque em "Adicionar" no canto superior direito
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">
                          💡 <span className="font-medium">Dica:</span> O ícone aparecerá na sua tela inicial como um app normal!
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Android/Chrome */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-500/10 p-2 rounded-lg">
                            <Chrome className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">Android</CardTitle>
                            <CardDescription>Chrome / Samsung Internet</CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <div className="bg-accent/10 rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                            1
                          </div>
                          <div className="flex-1 pt-0.5">
                            <p className="font-medium text-sm mb-1">Abra o Menu do Navegador</p>
                            <p className="text-xs text-muted-foreground">
                              Toque nos três pontos <MoreVertical className="inline h-3 w-3 mx-0.5" /> no canto superior direito
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="bg-accent/10 rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                            2
                          </div>
                          <div className="flex-1 pt-0.5">
                            <p className="font-medium text-sm mb-1">Selecione Instalar App</p>
                            <p className="text-xs text-muted-foreground">
                              Toque em "Instalar app" ou "Adicionar à tela inicial"
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="bg-accent/10 rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                            3
                          </div>
                          <div className="flex-1 pt-0.5">
                            <p className="font-medium text-sm mb-1">Confirme a Instalação</p>
                            <p className="text-xs text-muted-foreground">
                              Toque em "Instalar" na caixa de diálogo
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">
                          💡 <span className="font-medium">Dica:</span> Você pode arrastar o ícone para qualquer lugar da tela!
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Desktop Instructions */}
              <TabsContent value="desktop" className="space-y-4 mt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Chrome/Edge */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-500/10 p-2 rounded-lg">
                          <Chrome className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Chrome / Edge / Brave</CardTitle>
                          <CardDescription>Windows, Mac, Linux</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <div className="bg-accent/10 rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                            1
                          </div>
                          <div className="flex-1 pt-0.5">
                            <p className="font-medium text-sm mb-1">Procure o Ícone de Instalação</p>
                            <p className="text-xs text-muted-foreground">
                              Clique no ícone <CircleDot className="inline h-3 w-3 mx-0.5" /> ou <Download className="inline h-3 w-3 mx-0.5" /> na barra de endereço (lado direito)
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="bg-accent/10 rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                            2
                          </div>
                          <div className="flex-1 pt-0.5">
                            <p className="font-medium text-sm mb-1">Ou Use o Menu</p>
                            <p className="text-xs text-muted-foreground">
                              Clique nos três pontos <MoreVertical className="inline h-3 w-3 mx-0.5" /> → "Instalar Fellow CRM"
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="bg-accent/10 rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                            3
                          </div>
                          <div className="flex-1 pt-0.5">
                            <p className="font-medium text-sm mb-1">Confirme a Instalação</p>
                            <p className="text-xs text-muted-foreground">
                              Clique em "Instalar" na janela pop-up
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">
                          💡 <span className="font-medium">Dica:</span> O app abrirá em uma janela separada, como um programa nativo!
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Firefox/Safari Desktop */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="bg-orange-500/10 p-2 rounded-lg">
                          <Monitor className="h-6 w-6 text-orange-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Firefox / Safari</CardTitle>
                          <CardDescription>Windows, Mac</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-4">
                          <p className="text-sm font-medium mb-2">⚠️ Instalação Limitada</p>
                          <p className="text-xs text-muted-foreground mb-3">
                            Firefox e Safari desktop ainda não suportam instalação automática de PWAs. Mas você ainda pode usar o sistema normalmente!
                          </p>
                          <div className="space-y-2 text-xs text-muted-foreground">
                            <p className="flex items-start gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                              <span><span className="font-medium">Firefox:</span> Adicione aos favoritos para acesso rápido</span>
                            </p>
                            <p className="flex items-start gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                              <span><span className="font-medium">Safari (Mac):</span> Use File → Add to Dock</span>
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">
                          💡 <span className="font-medium">Recomendação:</span> Para melhor experiência, use Chrome ou Edge
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <Separator className="my-12" />

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-2xl font-bold text-center">Perguntas Frequentes</h2>
          
          <div className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">O que é um PWA (Progressive Web App)?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  É uma tecnologia moderna que transforma sites em aplicativos nativos. Você instala direto do navegador, sem precisar de loja de apps, e funciona como um app normal no seu dispositivo.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ocupa muito espaço no meu dispositivo?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Não! Um PWA ocupa muito menos espaço que um app tradicional (geralmente menos de 5 MB). Os dados são armazenados de forma eficiente no navegador.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">É seguro instalar?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Sim! A instalação é feita pelo próprio navegador e o app roda em um ambiente isolado e seguro. Seus dados permanecem protegidos com HTTPS e criptografia.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Como desinstalar se eu quiser?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">No celular:</span> Pressione e segure o ícone, depois selecione "Remover" ou "Desinstalar". <br />
                  <span className="font-medium">No desktop:</span> Clique nos três pontos no app → Desinstalar Fellow CRM.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="mt-12 text-center space-y-4">
          <Button 
            onClick={() => navigate("/login")} 
            variant="outline"
            size="lg"
            className="min-w-[200px]"
          >
            Continuar sem Instalar
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-xs text-muted-foreground">
            Você pode instalar a qualquer momento através das configurações do navegador
          </p>
        </div>
      </div>
    </div>
  );
}
