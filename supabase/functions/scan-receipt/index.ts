// NOTA: Este arquivo deve estar em `supabase/functions/scan-receipt/index.ts`
import { GoogleGenAI } from "https://esm.sh/@google/genai@0.12.0";

// FIX: Declare Deno to resolve TypeScript errors in environments that don't have Deno types.
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pega a chave de API das variáveis de ambiente secretas do Supabase
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

Deno.serve(async (req) => {
  // Trata a requisição pre-flight do CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
        throw new Error("PARA O DESENVOLVEDOR: A variável de ambiente GEMINI_API_KEY não está configurada nas Edge Functions do Supabase.");
    }
      
    const { mimeType, image } = await req.json();
    if (!mimeType || !image) {
        return new Response(JSON.stringify({ error: "mimeType e image são obrigatórios." }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const imagePart = { inlineData: { mimeType, data: image } };

    // Chamadas paralelas para a IA para otimizar o tempo de resposta
    const dataPromise = ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: { parts: [
        { text: `Extraia o valor total (número com ponto decimal), a data (formato AAAA-MM-DD) e uma breve descrição deste recibo. Tente extrair o máximo de informação possível. Se um campo não for encontrado, use um valor padrão: para 'value', use 0; para 'date', use a data de hoje; para 'description', use 'Recibo Digitalizado'. Responda SOMENTE com um objeto JSON: {"value": number, "date": "string", "description": "string"}. Não use markdown.` },
        imagePart
      ]},
    });
    
    const imagePromise = ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [
        { text: `Aja como um scanner profissional. Otimize esta imagem de recibo para arquivamento digital, melhorando contraste, brilho e nitidez.` },
        imagePart
      ]}
    });

    const [dataResponse, imageResponse] = await Promise.all([dataPromise, imagePromise]);

    if (!dataResponse.text) {
      throw new Error("A IA não retornou dados de texto para extração.");
    }
    
    let extractedData = { value: 0, date: '', description: 'Recibo Digitalizado' };
    try {
        const parsedJson = JSON.parse(dataResponse.text.trim());
        extractedData = { ...extractedData, ...parsedJson };
    } catch (e) {
        console.error("JSON.parse falhou, usando valores padrão. Erro:", e);
    }
    
    // Sanitiza e valida os dados finais
    if (typeof extractedData.value !== 'number' || isNaN(extractedData.value)) {
        extractedData.value = 0;
    }
    if (typeof extractedData.description !== 'string' || !extractedData.description.trim()) {
        extractedData.description = 'Recibo Digitalizado';
    }
    if (typeof extractedData.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(extractedData.date)) {
      extractedData.date = new Date().toISOString().split('T')[0];
    }

    const imagePartResponse = imageResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    const cleanedImageBase64 = imagePartResponse?.inlineData?.data || image;

    const responsePayload = { ...extractedData, scannedImage: cleanedImageBase64 };
    
    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Erro na Edge Function 'scan-receipt':", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});