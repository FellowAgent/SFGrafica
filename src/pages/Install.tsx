import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Monitor } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-accent/10 p-4 rounded-full">
              <Download className="h-12 w-12 text-accent" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Instalar Fellow CRM</CardTitle>
          <CardDescription className="text-lg mt-2">
            Tenha acesso rápido ao sistema direto da tela inicial do seu dispositivo
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {isInstalled ? (
            <div className="text-center space-y-4">
              <div className="bg-green-500/10 text-green-700 dark:text-green-300 p-4 rounded-lg">
                <p className="font-semibold">✓ App já instalado!</p>
                <p className="text-sm mt-1">Você pode acessar o Fellow CRM da tela inicial do seu dispositivo.</p>
              </div>
              <Button onClick={() => navigate("/login")} className="w-full" size="lg">
                Ir para Login
              </Button>
            </div>
          ) : isInstallable ? (
            <div className="space-y-4">
              <div className="bg-accent/10 p-4 rounded-lg">
                <p className="text-center font-medium">
                  Instale o app para ter acesso offline e uma experiência mais rápida!
                </p>
              </div>
              <Button onClick={handleInstall} className="w-full" size="lg">
                <Download className="mr-2 h-5 w-5" />
                Instalar Agora
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-center text-muted-foreground">
                  Para instalar o app, siga as instruções do seu navegador:
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-6 w-6 text-accent" />
                      <CardTitle className="text-lg">No Celular</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <p className="font-semibold">iPhone/Safari:</p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
                        <li>Toque no ícone de compartilhar</li>
                        <li>Role e toque em "Adicionar à Tela Inicial"</li>
                        <li>Confirme tocando em "Adicionar"</li>
                      </ol>
                    </div>
                    <div className="pt-3">
                      <p className="font-semibold">Android/Chrome:</p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
                        <li>Toque no menu (três pontos)</li>
                        <li>Toque em "Instalar app" ou "Adicionar à tela inicial"</li>
                        <li>Confirme a instalação</li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Monitor className="h-6 w-6 text-accent" />
                      <CardTitle className="text-lg">No Desktop</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <p className="font-semibold">Chrome/Edge:</p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
                        <li>Clique no ícone de instalação na barra de endereço</li>
                        <li>Ou vá no menu e clique em "Instalar Fellow CRM"</li>
                        <li>Confirme a instalação</li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Button onClick={() => navigate("/login")} variant="outline" className="w-full">
                Continuar sem instalar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
