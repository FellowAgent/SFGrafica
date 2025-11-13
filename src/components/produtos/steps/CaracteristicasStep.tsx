import { UseFormReturn } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { ChipInput } from "@/components/ui/chip-input";
import { RichTextEditor } from "../RichTextEditor";
import { limitText } from "@/utils/inputMasks";

interface CaracteristicasStepProps {
  form: UseFormReturn<any>;
}

export function CaracteristicasStep({ form }: CaracteristicasStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Características</h3>
        <p className="text-sm text-muted-foreground">
          Adicione informações complementares sobre o produto
        </p>
      </div>

      <Form {...form}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="descricaoCurta"
            render={({ field }) => {
              const currentLength = field.value?.length || 0;
              return (
                <FormItem>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <FormLabel className="cursor-help">
                          Descrição Curta <span className="text-muted-foreground text-xs ml-1">({currentLength}/1000)</span>
                        </FormLabel>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Digite uma breve descrição do produto (máximo 1000 caracteres)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <FormControl>
                    <Textarea
                      placeholder="Breve descrição do produto"
                      className="min-h-[100px]"
                      {...field}
                      value={field.value || ''}
                      maxLength={1000}
                      onChange={(e) => field.onChange(limitText(e.target.value, 1000))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="descricaoComplementar"
            render={({ field }) => (
              <FormItem>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <FormLabel className="cursor-help">
                        Descrição Detalhada
                      </FormLabel>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Descrição completa com formatação (negrito, itálico, listas)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <FormControl>
                  <RichTextEditor
                    content={field.value || ''}
                    onChange={field.onChange}
                    placeholder="Digite a descrição detalhada do produto..."
                    maxLength={2000}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="observacoes"
            render={({ field }) => {
              const currentLength = field.value?.length || 0;
              return (
                <FormItem>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <FormLabel className="cursor-help">
                          Observações <span className="text-muted-foreground text-xs ml-1">({currentLength}/1000)</span>
                        </FormLabel>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Digite observações internas sobre o produto (máximo 1000 caracteres)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <FormControl>
                    <Textarea
                      placeholder="Observações internas"
                      className="min-h-[100px]"
                      {...field}
                      value={field.value || ''}
                      maxLength={1000}
                      onChange={(e) => field.onChange(limitText(e.target.value, 1000))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags:</FormLabel>
                <FormControl>
                  <ChipInput
                    value={field.value || []}
                    onChange={field.onChange}
                    placeholder="Digite e pressione Enter ou Tab"
                  />
                </FormControl>
                <p className="text-sm text-muted-foreground">
                  Separe as diferentes opções pressionando Tab ou Enter
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Form>
    </div>
  );
}
