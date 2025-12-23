// NOTA: Este arquivo deve estar em `supabase/functions/ai-chat/index.ts`
import { GoogleGenAI } from "https://esm.sh/@google/genai@0.12.0";

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not set in Supabase Edge Functions secrets.");
    }
      
    const { query, contextData } = await req.json();
    if (!query || !contextData) {
        return new Response(JSON.stringify({ error: "query and contextData are required." }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const systemInstruction = `Você é um assistente financeiro amigável e prestativo para o app "Curatela Contas". Sua função é ajudar o usuário a entender suas finanças familiares de forma simples e direta.
    - Use os dados JSON fornecidos como sua única fonte de conhecimento. Não invente informações.
    - A data de hoje é: ${new Date().toLocaleDateString('pt-BR')}.
    - Seja conciso e claro. Responda em português do Brasil.
    - Se não souber a resposta ou os dados não forem suficientes, diga "Não tenho informações suficientes para responder a essa pergunta.".
    - Formate valores monetários como R$ 1.234,56.
    
    Aqui estão os dados do usuário:
    ${JSON.stringify(contextData, null, 2)}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: query,
        config: {
            systemInstruction: systemInstruction,
        }
    });

    if (!response.text) {
      throw new Error("A IA não retornou uma resposta de texto.");
    }
    
    return new Response(JSON.stringify({ reply: response.text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error in 'ai-chat' edge function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});