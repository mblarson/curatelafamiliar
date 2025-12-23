import React, { useState, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import Modal from '../ui/Modal';
import { fileToBase64 } from '../../utils/imageUtils';
import { useLogger } from '../../hooks/useLogger';
import { UploadCloud, ScanLine, AlertCircle, Loader2 } from 'lucide-react';
// FIX: Removed GEMINI_API_KEY import to use environment variable as per guidelines.

interface ScannedData {
  value: number;
  date: string;
  description: string;
  scannedImage: string;
}

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (data: ScannedData) => void;
}

const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({ isOpen, onClose, onScanComplete }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scanError, setScanError] = useState('');
  const log = useLogger();

  const resetState = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsLoading(false);
    setScanError('');
  }

  const handleClose = () => {
    resetState();
    onClose();
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setScanError('');
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setScanError('');
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
        setScanError('Por favor, envie um arquivo de imagem (PNG, JPG, etc).')
    }
  }, []);

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleScan = async () => {
    if (!selectedFile) {
      setScanError('Por favor, selecione uma imagem primeiro.');
      return;
    }
    
    // FIX: Removed check for placeholder API key. As per guidelines, the API key is assumed to be configured via environment variables.

    setIsLoading(true);
    setScanError('');

    log.info('Iniciando digitalização do recibo...');
    try {
      log.info('Comprimindo e convertendo imagem para base64...');
      const { mimeType, data: base64Image } = await fileToBase64(selectedFile);
      log.info('Imagem processada. Enviando para a IA...');
      
      // FIX: Use process.env.API_KEY for Gemini API initialization as per guidelines.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const imagePart = {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      };

      log.info('Iniciando chamadas sequenciais para a IA para maior compatibilidade.');

      // 1. Extrair dados
      log.info('Executando extração de dados...');
      const dataPrompt = `Analise a imagem do recibo e extraia o valor total da transação (use ponto como separador decimal), a data (no formato AAAA-MM-DD) e o nome do estabelecimento ou uma breve descrição da compra. Se a data não for encontrada, use a data de hoje. Se o valor não for encontrado, use 0. Responda APENAS com um objeto JSON no formato {"value": <number>, "date": "<string>", "description": "<string>"}. Não inclua markdown (como \`\`\`json).`;
      const dataResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ text: dataPrompt }, imagePart] },
      });
      log.info('Extração de dados concluída.');
      
      // 2. Limpar a imagem
      log.info('Executando limpeza da imagem...');
      const cleaningPrompt = `Aja como um scanner de documentos profissional e realize um pós-processamento completo na imagem deste recibo. O resultado final deve ser idêntico a um documento digitalizado por um scanner de alta qualidade.`;
      const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: cleaningPrompt }, imagePart] }
      });
      log.info('Limpeza da imagem concluída.');

      if (!dataResponse.text) {
        throw new Error("A IA não retornou dados de texto para extração.");
      }
      const extractedData = JSON.parse(dataResponse.text.trim());

      const imagePartResponse = imageResponse.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
      const cleanedImageBase64 = imagePartResponse?.inlineData?.data || base64Image;

      if (!/^\d{4}-\d{2}-\d{2}$/.test(extractedData.date)) {
        extractedData.date = new Date().toISOString().split('T')[0];
      }
      
      onScanComplete({ ...extractedData, scannedImage: cleanedImageBase64 });
      handleClose();

    } catch (error) {
      log.error("Erro detalhado na digitalização:", error);
      let userMessage = 'Falha ao processar o recibo. Verifique a qualidade da imagem e tente novamente.';
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes('api key not valid') || message.includes('api key is missing')) {
            userMessage = "A chave de API do Gemini é inválida ou não foi configurada. Verifique as configurações.";
        } else if (message.includes('json')) {
            userMessage = 'A IA retornou um formato inválido. Tente uma imagem mais nítida ou de um recibo diferente.';
        } else if (message.includes('quota')) {
            userMessage = 'A cota de uso da API foi excedida. Verifique sua conta do Google AI Studio.';
        } else if (message.includes('network') || message.includes('failed to fetch')) {
            userMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
        }
      }
      setScanError(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Digitalizar Recibo com IA">
      <div className="space-y-4">
        {previewUrl ? (
          <div className="text-center">
            <img src={previewUrl} alt="Pré-visualização" className="max-h-48 w-auto inline-block rounded-md border" />
          </div>
        ) : (
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">Arraste ou selecione o recibo</p>
            <input id="file-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
        )}

        {scanError && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded-md flex items-center gap-2">
            <AlertCircle size={20} />
            <p className="text-sm">{scanError}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
            <button onClick={handleClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md">Cancelar</button>
            <button
                onClick={handleScan}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold shadow disabled:bg-blue-300"
                disabled={!selectedFile || isLoading}
            >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <ScanLine size={20} />}
                {isLoading ? 'Analisando...' : 'Analisar Recibo'}
            </button>
        </div>
      </div>
    </Modal>
  );
};

export default ReceiptScannerModal;