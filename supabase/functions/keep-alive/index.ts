// NOTA: Este arquivo deve estar em `supabase/functions/keep-alive/index.ts`
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// FIX: Declare Deno to resolve TypeScript errors in environments that don't have Deno types.
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// A função será invocada via cron job, que pode precisar de uma chave de serviço
// para contornar políticas de Row Level Security.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("PARA O DESENVOLVEDOR: As variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam ser configuradas para esta função.");
    }
    
    // Cria um cliente Supabase com a chave de serviço para privilégios de administrador
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Insere um novo registro na tabela keep_alive_logs.
    // A tabela deve ter um valor padrão para 'pinged_at' como now().
    const { error } = await supabaseAdmin.from('keep_alive_logs').insert({});

    if (error) {
      throw error;
    }
    
    return new Response(JSON.stringify({ success: true, message: "Verificação de atividade bem-sucedida." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Erro na Edge Function 'keep-alive':", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});