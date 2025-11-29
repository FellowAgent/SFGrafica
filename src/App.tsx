import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase";
import { useSchemaVersion } from "@/hooks/useSchemaVersion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Login from "./pages/Login";
import Install from "./pages/Install";
import ConfigSupabase from "./pages/ConfigSupabase";
import Diagnostico from "./pages/Diagnostico";
import Mapa from "./pages/Mapa";
import MasterDashboard from "./pages/master/Dashboard";
import LojaInicio from "./pages/loja/Inicio";
import LojaCheckout from "./pages/loja/Checkout";
import LojaDetalhesPedido from "./pages/loja/DetalhesPedido";
import LojaClientes from "./pages/loja/Clientes";
import LojaProdutos from "./pages/loja/produtos/Produtos";
import LojaCategorias from "./pages/loja/produtos/Categorias";
import LojaVariacoes from "./pages/loja/produtos/Variacoes";
import LojaFinanceiro from "./pages/loja/Financeiro";
import LojaConfiguracoes from "./pages/loja/Configuracoes";
import LojaRelatorios from "./pages/loja/Relatorios";
import LojaAdicionarUsuario from "./pages/loja/AdicionarUsuario";
import LojaEditarUsuario from "./pages/loja/EditarUsuario";
import LojaNovoPedido from "./pages/loja/NovoPedido";
import LojaMinhaConta from "./pages/loja/MinhaConta";
import LimparDadosFicticios from "./pages/LimparDadosFicticios";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { StatusConfigProvider } from "./contexts/StatusConfigContext";

const queryClient = new QueryClient();

// Função para converter HEX para HSL
function hexToHSL(hex: string): string {
  hex = hex.replace(/^#/, '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Componente para aplicar tema global
const isValidHexColor = (hex: string): boolean => {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
};

const isValidHSL = (hsl: string): boolean => {
  return /^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/.test(hsl);
};

const ThemeApplier = () => {
  const [isLoading, setIsLoading] = useState(true);

  // Carrega tema do usuário ou localStorage e escuta mudanças de autenticação
  useEffect(() => {
    const loadTheme = async () => {
      try {
        // Verificar se há sessão ativa
        const { data } = await supabase.auth.getSession();
        
        if (data.session?.user?.id) {
          // Se está logado, busca o tema do banco de dados
          try {
            const { data: perfil, error } = await supabase
              .from('perfis')
              .select('tema')
              .eq('id', data.session.user.id)
              .single();

            // Ignorar erros 406 (sem permissão) - usar localStorage como fallback
            if (error && error.code !== 'PGRST301') {
              console.error('Erro ao carregar tema:', error);
            }

            if (perfil?.tema) {
              const tema = perfil.tema || 'dark';
              document.documentElement.classList.remove("dark", "light");
              document.documentElement.classList.add(tema === "dark" ? "dark" : "light");
              localStorage.setItem("theme", tema);
              return;
            }
          } catch (error: any) {
            // Ignorar erros 406 (Not Acceptable - sem permissão RLS)
            if (error?.status !== 406) {
              console.error('Erro ao carregar tema:', error);
            }
          }
        }
        
        // Fallback para localStorage (padrão: dark)
        const localTheme = localStorage.getItem("theme") || 'dark';
        document.documentElement.classList.remove("dark", "light");
        document.documentElement.classList.add(localTheme === "dark" ? "dark" : "light");
      } catch (error) {
        console.error('Erro ao carregar tema:', error);
        // Fallback para localStorage em caso de erro (padrão: dark)
        const localTheme = localStorage.getItem("theme") || 'dark';
        document.documentElement.classList.remove("dark", "light");
        document.documentElement.classList.add(localTheme === "dark" ? "dark" : "light");
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();

    // Escuta mudanças de autenticação para recarregar o tema
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadTheme();
    });

    return () => subscription.unsubscribe();
  }, []);

  // Aplica cores customizadas
  useEffect(() => {
    try {
      const coresSalvas = localStorage.getItem('coresTema');
      if (!coresSalvas) return;
      
      const cores = JSON.parse(coresSalvas);
      
      if (!cores || typeof cores !== 'object') {
        console.warn('Invalid theme structure');
        return;
      }
      
      if (!isValidHexColor(cores.principal) || !isValidHexColor(cores.secundaria)) {
        console.warn('Invalid color format in theme');
        return;
      }
      
      const root = document.documentElement;
      const primaryHSL = hexToHSL(cores.principal);
      const secondaryHSL = hexToHSL(cores.secundaria);
      
      if (!isValidHSL(primaryHSL) || !isValidHSL(secondaryHSL)) {
        console.warn('Invalid HSL conversion');
        return;
      }
      
      root.style.setProperty('--primary', primaryHSL);
      root.style.setProperty('--accent', primaryHSL);
      root.style.setProperty('--secondary', secondaryHSL);
      root.style.setProperty('--ring', primaryHSL);
      root.style.setProperty('--primary-foreground', '0 0% 10%');
      root.style.setProperty('--secondary-foreground', '0 0% 100%');
      root.style.setProperty('--accent-foreground', '0 0% 10%');
    } catch (error) {
      console.error('Error applying theme:', error);
    }
  }, []);
  
  if (isLoading) {
    return null;
  }
  
  return null;
};

// Componente para alertas de schema
const SchemaVersionAlert = () => {
  const { updateAvailable, versionStatus } = useSchemaVersion();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="fixed top-4 right-4 left-4 md:left-auto md:w-[400px] z-50">
      <Alert className="border-yellow-600 bg-yellow-50 dark:bg-yellow-950">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertTitle>Schema Modificado</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p className="text-sm">{versionStatus?.message}</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => navigate('/config-supabase?tab=status')}>
              Ver Detalhes
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDismissed(true)}>
              Dispensar
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <StatusConfigProvider>
        <ThemeApplier />
        <Toaster />
        <BrowserRouter>
          <SchemaVersionAlert />
          <Routes>
          <Route path="/" element={<Navigate to="/inicio" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/install" element={<Install />} />
          <Route path="/config-supabase" element={<ConfigSupabase />} />
          <Route path="/diagnostico" element={<Diagnostico />} />
          <Route path="/mapa" element={<Mapa />} />
          
          {/* Protected Master Routes */}
          <Route path="/master/dashboard" element={
            <ProtectedRoute requiredRole="master">
              <MasterDashboard />
            </ProtectedRoute>
          } />
          
          {/* Protected Routes - Require Authentication */}
          <Route path="/inicio" element={
            <ProtectedRoute>
              <LojaInicio />
            </ProtectedRoute>
          } />
          <Route path="/checkout/:id" element={
            <ProtectedRoute>
              <LojaCheckout />
            </ProtectedRoute>
          } />
          <Route path="/pedido/:id" element={
            <ProtectedRoute>
              <LojaDetalhesPedido />
            </ProtectedRoute>
          } />
          <Route path="/clientes" element={
            <ProtectedRoute>
              <LojaClientes />
            </ProtectedRoute>
          } />
          <Route path="/produtos" element={
            <ProtectedRoute>
              <LojaProdutos />
            </ProtectedRoute>
          } />
          <Route path="/produtos/categorias" element={
            <ProtectedRoute>
              <LojaCategorias />
            </ProtectedRoute>
          } />
          <Route path="/produtos/variacoes" element={
            <ProtectedRoute>
              <LojaVariacoes />
            </ProtectedRoute>
          } />
          <Route path="/pedidos" element={
            <ProtectedRoute>
              <LojaFinanceiro />
            </ProtectedRoute>
          } />
          <Route path="/relatorios" element={
            <ProtectedRoute>
              <LojaRelatorios />
            </ProtectedRoute>
          } />
          <Route path="/configuracoes" element={
            <ProtectedRoute>
              <LojaConfiguracoes />
            </ProtectedRoute>
          } />
          <Route path="/adicionar-usuario" element={
            <ProtectedRoute>
              <LojaAdicionarUsuario />
            </ProtectedRoute>
          } />
          <Route path="/editar-usuario/:id" element={
            <ProtectedRoute>
              <LojaEditarUsuario />
            </ProtectedRoute>
          } />
          <Route path="/novo-pedido" element={
            <ProtectedRoute>
              <LojaNovoPedido />
            </ProtectedRoute>
          } />
          <Route path="/minha-conta" element={
            <ProtectedRoute>
              <LojaMinhaConta />
            </ProtectedRoute>
          } />
          
          <Route path="/limpar-dados-ficticios" element={<LimparDadosFicticios />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </StatusConfigProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
