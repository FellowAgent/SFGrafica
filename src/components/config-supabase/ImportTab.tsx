import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Zap, RefreshCw } from 'lucide-react';
import { ImportOption1 } from './ImportOption1';
import { ImportOption2 } from './ImportOption2';
import { ImportOption3 } from './ImportOption3';
import { ImportOptionsTable } from './ImportOptionsTable';

export function ImportTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🤔 Qual opção escolher?</CardTitle>
          <CardDescription>
            Compare as três opções de importação e escolha a mais adequada para sua necessidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportOptionsTable />
        </CardContent>
      </Card>

      <Tabs defaultValue="option1" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="option1" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Opção 1
          </TabsTrigger>
          <TabsTrigger value="option2" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Opção 2
          </TabsTrigger>
          <TabsTrigger value="option3" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Opção 3
          </TabsTrigger>
        </TabsList>

        <TabsContent value="option1" className="mt-6">
          <ImportOption1 />
        </TabsContent>

        <TabsContent value="option2" className="mt-6">
          <ImportOption2 />
        </TabsContent>

        <TabsContent value="option3" className="mt-6">
          <ImportOption3 />
        </TabsContent>
      </Tabs>
    </div>
  );
}
