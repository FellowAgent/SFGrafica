import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0'
import {
  fixMalformedACL,
  validateSQL,
  splitSQLStatements,
  executeStatement,
} from '../_shared/sql-utils.ts'
import type { ExecutionResult } from '../_shared/sql-utils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImportOptions {
  dryRun?: boolean
  continueOnError?: boolean
  skipValidation?: boolean
}

interface ImportResult {
  success: boolean
  dryRun: boolean
  totalStatements: number
  executedStatements: number
  successfulStatements: number
  failedStatements: number
  results: ExecutionResult[]
  executionTime: number
  error?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Iniciando importação de schema...');

    const body = await req.json();
    const { sql, options = {} } = body as { sql: string; options: ImportOptions };
    
    const dryRun = options.dryRun || false;
    const continueOnError = options.continueOnError || false;
    const skipValidation = options.skipValidation || false;

    console.log('Opções:', { dryRun, continueOnError, skipValidation });

    // Corrigir sintaxes ACL malformadas automaticamente
    console.log('Verificando e corrigindo sintaxes ACL...');
    const { sql: fixedSQL, fixes } = fixMalformedACL(sql);
    sql = fixedSQL;
    
    if (fixes.length > 0) {
      console.log(`${fixes.length} correções ACL aplicadas automaticamente`);
    }

    // Validar SQL se não for skipValidation
    if (!skipValidation) {
      console.log('Validando SQL...');
      const validation = validateSQL(sql);
      
      if (!validation.valid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Validação falhou',
            validationErrors: validation.errors,
            aclFixes: fixes
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        );
      }
    }

    // Criar cliente Supabase com service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Split SQL em statements individuais
    console.log('Dividindo SQL em statements...');
    const statements = splitSQLStatements(sql);
    console.log(`Total de statements: ${statements.length}`);

    // Executar statements
    const startTime = performance.now();
    const results: ExecutionResult[] = [];
    let executedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    if (!dryRun) {
      // Iniciar transação explícita
      console.log('Iniciando transação...');
      await supabaseAdmin.rpc('exec_sql', {
        sql_query: 'BEGIN;'
      });
    }

    try {
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        
        // Ignorar statements vazios ou apenas comentários
        if (!statement.trim() || statement.trim().startsWith('--')) {
          continue;
        }
        
        console.log(`Executando statement ${i + 1}/${statements.length}...`);
        
        const result = await executeStatement(supabaseAdmin, statement, dryRun);
        results.push(result);
        executedCount++;
        
        if (result.success) {
          successCount++;
        } else {
          failedCount++;
          console.error(`Erro no statement ${i + 1}:`, result.error);
          
          // Se não deve continuar em erro, fazer rollback e parar
          if (!continueOnError && !dryRun) {
            console.log('Fazendo rollback...');
            await supabaseAdmin.rpc('exec_sql', {
              sql_query: 'ROLLBACK;'
            });
            
            const totalTime = performance.now() - startTime;
            
            return new Response(
              JSON.stringify({
                success: false,
                dryRun,
                totalStatements: statements.length,
                executedStatements: executedCount,
                successfulStatements: successCount,
                failedStatements: failedCount,
                results,
                executionTime: totalTime,
                error: `Erro no statement ${i + 1}: ${result.error}. Transação revertida.`
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
              }
            );
          }
        }
      }

      // Commit da transação se não for dry run
      if (!dryRun) {
        console.log('Fazendo commit da transação...');
        await supabaseAdmin.rpc('exec_sql', {
          sql_query: 'COMMIT;'
        });
      }

      const totalTime = performance.now() - startTime;

      console.log('Importação concluída com sucesso!');
      console.log(`Total: ${executedCount}, Sucesso: ${successCount}, Falhas: ${failedCount}`);
      console.log(`Tempo total: ${totalTime.toFixed(2)}ms`);

      return new Response(
        JSON.stringify({
          success: failedCount === 0,
          dryRun,
          totalStatements: statements.length,
          executedStatements: executedCount,
          successfulStatements: successCount,
          failedStatements: failedCount,
          results,
          executionTime: totalTime,
          aclFixes: fixes.length > 0 ? fixes : undefined
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );

    } catch (error) {
      // Rollback em caso de erro
      if (!dryRun) {
        console.log('Erro durante execução, fazendo rollback...');
        try {
          await supabaseAdmin.rpc('exec_sql', {
            sql_query: 'ROLLBACK;'
          });
        } catch (rollbackError) {
          console.error('Erro ao fazer rollback:', rollbackError);
        }
      }
      
      throw error;
    }

  } catch (error) {
    console.error('Erro na importação:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
