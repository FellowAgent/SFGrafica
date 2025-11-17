import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, X } from 'lucide-react';

export function ImportOptionsTable() {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Característica</TableHead>
            <TableHead>Opção 1 (Validação)</TableHead>
            <TableHead>Opção 2 (Automática)</TableHead>
            <TableHead>Opção 3 (Híbrida)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">Segurança</TableCell>
            <TableCell><Check className="h-4 w-4 text-green-600" /> Máxima</TableCell>
            <TableCell><X className="h-4 w-4 text-yellow-600" /> Média</TableCell>
            <TableCell><Check className="h-4 w-4 text-green-600" /> Alta</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Velocidade</TableCell>
            <TableCell><X className="h-4 w-4 text-red-600" /> Manual</TableCell>
            <TableCell><Check className="h-4 w-4 text-green-600" /> Instantânea</TableCell>
            <TableCell><Check className="h-4 w-4 text-green-600" /> Rápida</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Requer Service Role Key</TableCell>
            <TableCell><X className="h-4 w-4 text-green-600" /> Não</TableCell>
            <TableCell><Check className="h-4 w-4 text-yellow-600" /> Sim</TableCell>
            <TableCell><Check className="h-4 w-4 text-yellow-600" /> Sim</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
