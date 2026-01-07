// NOTA: Este arquivo deve estar em `supabase/functions/process-pdf-statement/index.ts`
// Removemos o import estático do GoogleGenAI para evitar overhead no boot da função
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Helper para decodificar Base64 manualmente (evita dependências externas que podem falhar no boot)
function decodeBase64(str: string): Uint8Array {
  const binaryString = atob(str);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper para codificar Base64 manualmente
function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const generateSystemInstruction = (categoryNames: string[]) => {
    const categoriesStr = categoryNames && categoryNames.length > 0 ? categoryNames.join(', ') : 'Alimentação, Transporte, Moradia, Saúde, Lazer, Outros';
    return `
    Você é um especialista em contabilidade e extração de dados bancários.
    Sua tarefa é analisar o arquivo PDF fornecido e extrair todos os lançamentos financeiros.
    
    Regras:
    1. Ignore linhas de saldo, saldo anterior ou resumo. Foque apenas nas transações individuais.
    2. Identifique DATA (YYYY-MM-DD), DESCRIÇÃO, VALOR (numérico) e NATUREZA ('RECEITA' ou 'DESPESA').
    3. Banco do Brasil/Itaú/Bradesco: 'C' ou créditos = Receita, 'D' ou débitos = Despesa.
    4. Categorize baseado em: [${categoriesStr}]. Se incerto, use 'Outros'.
    
    Saída JSON:
    {
      "transactions": [
        { "date": "2024-05-12", "description": "MERCADO", "value": 150.50, "nature": "DESPESA", "categoryName": "Alimentação" }
      ]
    }
    `;
};

const analyzeWithGemini = async (base64Data: string, mimeType: string, systemInstruction: string) => {
    console.log(`[Gemini] Starting analysis. MimeType: ${mimeType}, Base64 Length: ${base64Data.length}`);
    
    // LAZY LOAD: Importa a biblioteca apenas quando necessário.
    // Isso faz com que a ação 'get_upload_url' seja extremamente rápida e à prova de falhas de importação.
    const { GoogleGenAI } = await import("https://esm.sh/@google/genai@0.12.0");
    
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview', 
            contents: {
                parts: [
                    { text: "Extraia os lançamentos." },
                    { inlineData: { mimeType: mimeType, data: base64Data } }
                ]
            },
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json"
            }
        });

        if (!response.text) {
             console.error("[Gemini] No response text received.");
             throw new Error("A IA não retornou resposta.");
        }
        
        console.log(`[Gemini] Raw Response Preview: ${response.text.substring(0, 300)}...`);

        try {
            return JSON.parse(response.text);
        } catch (e) {
            console.error(`[Gemini] JSON Parse Error. Raw text:`, response.text);
            throw new Error(`A IA retornou formato inválido.`);
        }
    } catch (apiError) {
        console.error("[Gemini] API Call Error:", apiError);
        throw apiError;
    }
};


Deno.serve(async (req) => {
  console.log(`[Request] Method: ${req.method} URL: ${req.url}`);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificação de chaves apenas para ações que precisam delas
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
       throw new Error("Missing env vars: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const requestData = await req.json();
    const { action } = requestData;
    console.log(`[Action] ${action}`);

    // --- AÇÃO 1: Processamento Direto (Payload Base64) ---
    if (action === 'process_payload') {
        if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
        
        const { fileData, mimeType, categoryNames, fileName } = requestData;
        if (!fileData || !mimeType) throw new Error("fileData and mimeType required");
        console.log(`[Process Payload] Size: ${fileData.length}, Type: ${mimeType}`);

        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        const backupPromise = (async () => {
            try {
                const filePath = `uploads/${crypto.randomUUID()}-${fileName || 'upload.pdf'}`;
                const fileBuffer = decodeBase64(fileData);
                const { error: uploadError } = await supabaseAdmin.storage
                    .from('attachments')
                    .upload(filePath, fileBuffer, { contentType: mimeType });
                
                if (uploadError) console.warn("[Backup Warning] Failed:", uploadError.message);
                else console.log(`[Backup] Success: ${filePath}`);
            } catch (e) {
                console.warn("[Backup Error]", e);
            }
        })();

        const analysisPromise = analyzeWithGemini(fileData, mimeType, generateSystemInstruction(categoryNames));
        const [jsonResponse] = await Promise.all([analysisPromise, backupPromise]);
        
        return new Response(JSON.stringify(jsonResponse), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }
    
    // --- AÇÃO 2: Gerar URL de Upload Assinada (Para bypass de RLS em arquivos grandes) ---
    // Esta ação agora é LEVE. Não carrega Gemini. Deve responder quase instantaneamente.
    if (action === 'get_upload_url') {
        const { fileName } = requestData;
        if (!fileName) throw new Error("fileName is required for get_upload_url");

        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const filePath = `uploads/${crypto.randomUUID()}-${fileName}`;
        console.log(`[Get Upload URL] Generating for path: ${filePath}`);

        const { data, error } = await supabaseAdmin.storage
            .from('attachments')
            .createSignedUploadUrl(filePath);

        if (error) {
            console.error("[Get Upload URL] Error creating signed URL:", error);
            throw error;
        }

        return new Response(JSON.stringify({ 
            token: data.token, 
            path: data.path,
            signedUrl: data.signedUrl 
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    // --- AÇÃO 3: Processar Arquivo já no Storage (Via Path) ---
    if (action === 'process') {
        if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

        const { filePath, mimeType, categoryNames } = requestData;
        if (!filePath || !mimeType) throw new Error("filePath and mimeType required");
        console.log(`[Process] Downloading from storage: ${filePath}`);

        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { data: fileData, error: downloadError } = await supabaseAdmin.storage
            .from('attachments')
            .download(filePath);

        if (downloadError) {
             console.error("[Process] Storage Download Error:", downloadError);
             throw new Error(`Failed to download file from storage: ${downloadError.message}`);
        }
        
        const arrayBuffer = await fileData.arrayBuffer();
        console.log(`[Process] File downloaded. Size: ${arrayBuffer.byteLength} bytes`);

        const base64Data = encodeBase64(new Uint8Array(arrayBuffer));
        
        const jsonResponse = await analyzeWithGemini(base64Data, mimeType, generateSystemInstruction(categoryNames));
        
        return new Response(JSON.stringify(jsonResponse), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
    }

    throw new Error(`Invalid action: ${action}. Use 'process_payload', 'get_upload_url' or 'process'.`);

  } catch (error) {
    console.error("[Edge Function Error]", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});