import { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  Connection,
  useNodesState,
  useEdgesState,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/utils/toastHelper';
import { Trash2, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Definição de todas as páginas do sistema
const systemPages = [
  { id: 'login', label: 'Login', path: '/login', file: 'src/pages/Login.tsx', position: { x: 0, y: 0 } },
  { id: 'inicio', label: 'Início', path: '/inicio', file: 'src/pages/loja/Inicio.tsx', position: { x: 300, y: 0 } },
  { id: 'clientes', label: 'Clientes', path: '/clientes', file: 'src/pages/loja/Clientes.tsx', position: { x: 600, y: 0 } },
  { id: 'produtos', label: 'Produtos', path: '/produtos', file: 'src/pages/loja/produtos/Produtos.tsx', position: { x: 300, y: 200 } },
  { id: 'categorias', label: 'Categorias', path: '/categorias', file: 'src/pages/loja/produtos/Categorias.tsx', position: { x: 600, y: 200 } },
  { id: 'novo-pedido', label: 'Novo Pedido', path: '/novo-pedido', file: 'src/pages/loja/NovoPedido.tsx', position: { x: 0, y: 200 } },
  { id: 'financeiro', label: 'Pedidos', path: '/pedidos', file: 'src/pages/loja/Financeiro.tsx', position: { x: 0, y: 400 } },
  { id: 'configuracoes', label: 'Configurações', path: '/configuracoes', file: 'src/pages/loja/Configuracoes.tsx', position: { x: 300, y: 400 } },
  { id: 'minha-conta', label: 'Minha Conta', path: '/minha-conta', file: 'src/pages/loja/MinhaConta.tsx', position: { x: 600, y: 400 } },
  { id: 'checkout', label: 'Checkout', path: '/checkout', file: 'src/pages/loja/Checkout.tsx', position: { x: 900, y: 200 } },
  { id: 'detalhes-pedido', label: 'Detalhes Pedido', path: '/pedido/:id', file: 'src/pages/loja/DetalhesPedido.tsx', position: { x: 900, y: 0 } },
  { id: 'adicionar-usuario', label: 'Adicionar Usuário', path: '/adicionar-usuario', file: 'src/pages/loja/AdicionarUsuario.tsx', position: { x: 900, y: 400 } },
  { id: 'editar-usuario', label: 'Editar Usuário', path: '/editar-usuario/:id', file: 'src/pages/loja/EditarUsuario.tsx', position: { x: 1200, y: 400 } },
  { id: 'dashboard-master', label: 'Dashboard Master', path: '/master/dashboard', file: 'src/pages/master/Dashboard.tsx', position: { x: 0, y: 600 } },
];

// Conexões iniciais baseadas no fluxo natural do sistema
const initialEdges: Edge[] = [
  { id: 'e1', source: 'login', target: 'inicio', animated: true },
  { id: 'e2', source: 'inicio', target: 'clientes', animated: true },
  { id: 'e3', source: 'inicio', target: 'produtos', animated: true },
  { id: 'e4', source: 'inicio', target: 'novo-pedido', animated: true },
  { id: 'e5', source: 'inicio', target: 'financeiro', animated: true },
  { id: 'e6', source: 'inicio', target: 'configuracoes', animated: true },
  { id: 'e7', source: 'produtos', target: 'categorias', animated: true },
  { id: 'e8', source: 'novo-pedido', target: 'checkout', animated: true },
  { id: 'e9', source: 'novo-pedido', target: 'detalhes-pedido', animated: true },
  { id: 'e10', source: 'configuracoes', target: 'adicionar-usuario', animated: true },
  { id: 'e11', source: 'adicionar-usuario', target: 'editar-usuario', animated: true },
  { id: 'e12', source: 'login', target: 'dashboard-master', animated: true },
];

// Componente customizado para o node
const CustomNode = ({ data }: any) => {
  const [imgHover, setImgHover] = useState(false);

  return (
    <Card className="p-4 min-w-[200px] shadow-lg border-2 hover:border-primary transition-all">
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-center">{data.label}</h3>
        
        <div 
          className="relative overflow-hidden rounded border bg-muted h-32 cursor-pointer"
          onMouseEnter={() => setImgHover(true)}
          onMouseLeave={() => setImgHover(false)}
        >
          <div className={`absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center transition-transform duration-300 ${imgHover ? 'scale-150' : 'scale-100'}`}>
            <div className="text-xs text-center p-2">
              <div className="font-mono text-muted-foreground">{data.path}</div>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground truncate" title={data.file}>
          {data.file}
        </div>

        <Button
          variant="destructive"
          size="sm"
          className="w-full gap-2"
          onClick={() => data.onDelete(data.id, data.file)}
        >
          <Trash2 className="h-3 w-3" />
          Remover
        </Button>
      </div>
    </Card>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

export default function Mapa() {
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    // Inicializa os nodes com as páginas do sistema
    const initialNodes: Node[] = systemPages.map((page) => ({
      id: page.id,
      type: 'custom',
      position: page.position,
      data: {
        label: page.label,
        path: page.path,
        file: page.file,
        onDelete: handleDeletePage,
      },
    }));
    setNodes(initialNodes);
  }, [setNodes]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
      toast.success('Conexão criada entre páginas');
    },
    [setEdges]
  );

  const handleDeletePage = async (pageId: string, filePath: string) => {
    if (!confirm(`Tem certeza que deseja remover a página "${pageId}" do sistema?\n\nArquivo: ${filePath}`)) {
      return;
    }

    try {
      // Remove o node do mapa
      setNodes((nds) => nds.filter((node) => node.id !== pageId));
      
      // Remove as edges conectadas
      setEdges((eds) => eds.filter((edge) => edge.source !== pageId && edge.target !== pageId));
      
      toast.success(`Página "${pageId}" removida do mapa`);
      toast.info('AVISO: A remoção real do arquivo deve ser feita manualmente ou via código');
    } catch (error) {
      console.error('Erro ao remover página:', error);
      toast.error('Erro ao remover página');
    }
  };

  return (
    <div className="h-screen w-screen bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-background"
      >
        <Background />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            return 'hsl(var(--primary))';
          }}
        />
        <Panel position="top-left" className="bg-card p-4 rounded-lg shadow-lg m-4 border">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Home className="h-6 w-6" />
              Mapa do Sistema
            </h1>
            <p className="text-sm text-muted-foreground">
              Visualize e gerencie todas as páginas e conexões do sistema
            </p>
            <div className="pt-2 space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary"></div>
                <span>Arraste para reorganizar</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-primary"></div>
                <span>Conecte nodes arrastando das bordas</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4"
              onClick={() => navigate('/inicio')}
            >
              Voltar ao Sistema
            </Button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
