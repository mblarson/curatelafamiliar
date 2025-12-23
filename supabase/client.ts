import { createClient } from '@supabase/supabase-js';

// A CHAVE DE API DO GEMINI FOI MOVIDA PARA AS EDGE FUNCTIONS DO SUPABASE.
// Esta é a abordagem correta e segura. A chave não deve NUNCA ser exposta no código do frontend.
// Para configurar:
// 1. Acesse o painel do seu projeto no Supabase.
// 2. Vá para "Project Settings" > "Edge Functions".
// 3. Adicione um "New Secret" com o nome GEMINI_API_KEY e o valor da sua nova chave.

const supabaseUrl = "https://wjgvusaiwyapldzyhhqz.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3Z1c2Fpd3lhcGxkenloaHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTY0MjcsImV4cCI6MjA3OTczMjQyN30.6tdjx7wIX3ZXrlBt2KxY1aV3_bbX1IkrQbNiRseTipQ";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const base64ToBlob = (base64: string, contentType: string = 'image/jpeg'): Blob => {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
};