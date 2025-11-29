import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfiguracoesGerais } from "@/components/configuracoes/ConfiguracoesGerais";
import { UsuariosTab } from "@/components/configuracoes/UsuariosTab";
import { AparenciaTab } from "@/components/configuracoes/AparenciaTab";
import { AtalhosTab } from "@/components/configuracoes/AtalhosTab";
import { PedidosTab } from "@/components/configuracoes/PedidosTab";
import { AsaasConfigTab } from "@/components/configuracoes/AsaasConfigTab";
import { AuditLogsTab } from "@/components/configuracoes/AuditLogsTab";
import { AlertConfigTab } from "@/components/configuracoes/AlertConfigTab";
import { EmailsPendentesTab } from "@/components/configuracoes/EmailsPendentesTab";
import { EtiquetasTab } from "@/components/configuracoes/EtiquetasTab";
import { useUserRole } from "@/hooks/useUserRole";

const Configuracoes = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tabFromUrl = searchParams.get("tab") || "configuracoes";
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const { isMaster } = useUserRole();

  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/configuracoes?tab=${value}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar type="loja" />
      
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie as configurações da sua loja
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList>
            <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            {isMaster && <TabsTrigger value="emails">Emails Pendentes</TabsTrigger>}
            <TabsTrigger value="aparencia">Aparência</TabsTrigger>
            <TabsTrigger value="atalhos">Atalhos</TabsTrigger>
            <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
            {isMaster && <TabsTrigger value="etiquetas">Etiquetas</TabsTrigger>}
            {isMaster && <TabsTrigger value="auditoria">Auditoria</TabsTrigger>}
            {isMaster && <TabsTrigger value="alertas">Alertas</TabsTrigger>}
            {isMaster && <TabsTrigger value="asaas">API Asaas</TabsTrigger>}
          </TabsList>

          <TabsContent value="configuracoes">
            <ConfiguracoesGerais />
          </TabsContent>

          <TabsContent value="usuarios">
            <UsuariosTab />
          </TabsContent>

          <TabsContent value="emails">
            <EmailsPendentesTab />
          </TabsContent>

          <TabsContent value="aparencia">
            <AparenciaTab />
          </TabsContent>

          <TabsContent value="atalhos">
            <AtalhosTab />
          </TabsContent>

          <TabsContent value="pedidos">
            <PedidosTab />
          </TabsContent>

          <TabsContent value="etiquetas">
            <EtiquetasTab />
          </TabsContent>

          <TabsContent value="auditoria">
            <AuditLogsTab />
          </TabsContent>

          <TabsContent value="alertas">
            <AlertConfigTab />
          </TabsContent>

          <TabsContent value="asaas">
            <AsaasConfigTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Configuracoes;
