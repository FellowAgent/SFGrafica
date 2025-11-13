import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase";
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
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user?.id) {
          // Se está logado, busca o tema do banco de dados
          const { data: perfil } = await supabase
            .from('perfis')
            .select('tema')
            .eq('id', user.id)
            .single();

          const tema = perfil?.tema || 'light';
          document.documentElement.classList.remove("dark", "light");
          document.documentElement.classList.add(tema === "dark" ? "dark" : "light");
          localStorage.setItem("theme", tema);
        } else {
          // Se não está logado, usa localStorage
          const localTheme = localStorage.getItem("theme") || 'light';
          document.documentElement.classList.remove("dark", "light");
          document.documentElement.classList.add(localTheme === "dark" ? "dark" : "light");
        }
      } catch (error) {
        console.error('Erro ao carregar tema:', error);
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <StatusConfigProvider>
        <ThemeApplier />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
          <Route path="/" element={<Navigate to="/loja/inicio" replace />} />
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
          
          {/* Protected Loja Routes - Require Authentication */}
          <Route path="/loja/inicio" element={
            <ProtectedRoute>
              <LojaInicio />
            </ProtectedRoute>
          } />
          <Route path="/loja/checkout/:id" element={
            <ProtectedRoute>
              <LojaCheckout />
            </ProtectedRoute>
          } />
          <Route path="/loja/pedido/:id" element={
            <ProtectedRoute>
              <LojaDetalhesPedido />
            </ProtectedRoute>
          } />
          <Route path="/loja/clientes" element={
            <ProtectedRoute>
              <LojaClientes />
            </ProtectedRoute>
          } />
          <Route path="/loja/produtos" element={
            <ProtectedRoute>
              <LojaProdutos />
            </ProtectedRoute>
          } />
          <Route path="/loja/produtos/categorias" element={
            <ProtectedRoute>
              <LojaCategorias />
            </ProtectedRoute>
          } />
          <Route path="/loja/financeiro" element={
            <ProtectedRoute>
              <LojaFinanceiro />
            </ProtectedRoute>
          } />
          <Route path="/loja/relatorios" element={
            <ProtectedRoute>
              <LojaRelatorios />
            </ProtectedRoute>
          } />
          <Route path="/loja/configuracoes" element={
            <ProtectedRoute>
              <LojaConfiguracoes />
            </ProtectedRoute>
          } />
          <Route path="/loja/adicionar-usuario" element={
            <ProtectedRoute>
              <LojaAdicionarUsuario />
            </ProtectedRoute>
          } />
          <Route path="/loja/editar-usuario/:id" element={
            <ProtectedRoute>
              <LojaEditarUsuario />
            </ProtectedRoute>
          } />
          <Route path="/loja/novo-pedido" element={
            <ProtectedRoute>
              <LojaNovoPedido />
            </ProtectedRoute>
          } />
          <Route path="/loja/minha-conta" element={
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
