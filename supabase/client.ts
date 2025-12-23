import { createClient } from '@supabase/supabase-js';

// =================================================================
// CONFIGURAÇÃO DA CHAVE DE API DO GEMINI
// =================================================================
// Substitua o valor abaixo pela sua chave real obtida em https://ai.google.dev/
// Este é o único lugar onde você precisa configurar a chave.
export const GEMINI_API_KEY = "AIzaSyAsjrqN8VIYVr9z37vEHXw5YJEj4orX-Ok";
// =================================================================

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