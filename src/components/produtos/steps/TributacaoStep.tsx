import { UseFormReturn } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface TributacaoStepProps {
  form: UseFormReturn<any>;
}

export function TributacaoStep({ form }: TributacaoStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Tributação</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Configure as informações tributárias do produto
        </p>
      </div>

      <Form {...form}>
        <div className="space-y-4">
          {/* Alíquota de Serviço */}
          <FormField
            control={form.control}
            name="iss_aliquota"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alíquota de Serviço (%):</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Ex: 5.00"
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Form>
    </div>
  );
}
