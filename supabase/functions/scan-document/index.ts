// NOTA: Este arquivo deve estar em `supabase/functions/scan-document/index.ts`
import { GoogleGenAI } from "https://esm.sh/@google/genai@0.12.0";

// FIX: Declare Deno to resolve TypeScript errors in environments that don't have Deno types.
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

    const cleaningPrompt = `Aja como um scanner de documentos profissional. Melhore a nitidez, brilho e contraste deste documento para arquivamento digital.`;
    const imagePart = { inlineData: { mimeType, data: image } };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: cleaningPrompt }, imagePart] }
    });

    const imagePartResponse = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    const scannedImage = imagePartResponse?.inlineData?.data || image;

    return new Response(JSON.stringify({ scannedImage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Erro na Edge Function 'scan-document':", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});