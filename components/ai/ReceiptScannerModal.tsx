import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import Modal from '../ui/Modal';
import { fileToBase64 } from '../../utils/imageUtils';
import { useLogger } from '../../hooks/useLogger';
import { UploadCloud, ScanLine, AlertCircle, Loader2 } from 'lucide-react';

// FIX: API key is now handled via environment variables as per guidelines.

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
    setIsLoading(true);
    setScanError('');

    log.info('Iniciando digitalização do recibo...');
    try {
      log.info('Comprimindo e convertendo imagem para base64...');
      const { mimeType, data: base64Image } = await fileToBase64(selectedFile);
      log.info('Imagem processada. Enviando para a IA...');

      // FIX: Initialize GoogleGenAI with API_KEY from environment variable.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const imagePart = {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      };

      // --- Chamadas sequenciais para a IA para maior compatibilidade ---
      log.info('Iniciando chamadas sequenciais para a IA para maior compatibilidade (Safari).');

      // 1. Extrair dados
      log.info('Executando extração de dados...');
      const dataPrompt = `Analise a imagem do recibo e extraia o valor total da transação (use ponto como separador decimal), a data (no formato AAAA-MM-DD) e o nome do estabelecimento ou uma breve descrição da compra. Se a data não for encontrada, use a data de hoje. Se o valor não for encontrado, use 0.`;
      const dataResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ text: dataPrompt }, imagePart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              value: { type: Type.NUMBER, description: 'Valor total da compra, use ponto como separador decimal.' },
              date: { type: Type.STRING, description: 'Data da transação no formato AAAA-MM-DD.' },
              description: { type: Type.STRING, description: 'Nome do estabelecimento ou descrição da compra.' },
            },
            required: ["value", "date", "description"]
          }
        }
      });
      log.info('Extração de dados concluída.');
      
      // 2. Limpar a imagem
      log.info('Executando limpeza da imagem...');
      const cleaningPrompt = `Aja como um scanner de documentos profissional e realize um pós-processamento completo na imagem deste recibo. O objetivo é gerar um documento limpo, nítido e perfeitamente legível, ideal para arquivamento e prestação de contas. Execute as seguintes ações:
1. **Detecção e Alinhamento:** Detecte as bordas do documento, corrija a perspectiva e qualquer ângulo torto, e centralize o recibo na imagem.
2. **Limpeza de Fundo:** Remova completamente o fundo original, substituindo-o por um fundo perfeitamente branco e uniforme.
3. **Ajuste de Qualidade:** Aumente o contraste e a nitidez para garantir que o texto seja escuro e totalmente legível.
4. **Remoção de Imperfeições:** Elimine quaisquer sombras, reflexos, borrões ou outras distorções visuais.
O resultado final deve ser idêntico a um documento digitalizado por um scanner de alta qualidade.`;
      const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: cleaningPrompt }, imagePart] }
      });
      log.info('Limpeza da imagem concluída. Ambas as respostas da IA foram recebidas.');

      // Processando os resultados
      // FIX: Add check for dataResponse.text to prevent crash on trim().
      if (!dataResponse.text) {
        throw new Error("A IA não retornou dados de texto para extração.");
      }
      const extractedData = JSON.parse(dataResponse.text.trim());
      log.info('Dados extraídos:', extractedData);

      const imagePartResponse = imageResponse.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
      let cleanedImageBase64: string;
      if (imagePartResponse?.inlineData?.data) {
        cleanedImageBase64 = imagePartResponse.inlineData.data;
        log.info('Imagem limpa e processada.');
      } else {
        cleanedImageBase64 = base64Image;
        log.warn('Não foi possível obter imagem limpa da IA, usando a original otimizada.');
      }

      // Validando e combinando os dados
      if (!/^\d{4}-\d{2}-\d{2}$/.test(extractedData.date)) {
        log.warn("Formato de data inválido da IA, usando data de hoje.", { date: extractedData.date });
        extractedData.date = new Date().toISOString().split('T')[0];
      }
      
      const finalData = {
        ...extractedData,
        scannedImage: cleanedImageBase64,
      };

      log.info('Digitalização concluída com sucesso.', { description: finalData.description, value: finalData.value, date: finalData.date });
      onScanComplete(finalData);
      handleClose();

    } catch (error) {
       if (error instanceof Error) {
        log.error("Erro ao digitalizar recibo.", { message: error.message, stack: error.stack });
        // FIX: Removed API_KEY_MISSING check as it's no longer relevant.
        if (error.message.includes('JSON')) {
            setScanError('A IA retornou um formato inválido. Tente uma imagem mais nítida.');
        } else {
            setScanError('A IA não conseguiu processar a imagem. Tente novamente.');
        }
      } else {
        log.error("Erro desconhecido ao digitalizar recibo.", { error });
        setScanError('Ocorreu um erro inesperado. Verifique o console.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Digitalizar Recibo com IA">
      <div className="space-y-4">
        {previewUrl ? (
          <div className="text-center">
            <img src={previewUrl} alt="Pré-visualização do recibo" className="max-h-60 w-auto inline-block rounded-md border" />
          </div>
        ) : (
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">Arraste e solte o recibo aqui, ou clique para selecionar</p>
            <p className="text-xs text-gray-500">PNG, JPG ou WEBP</p>
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
            <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                disabled={isLoading}
            >
                Cancelar
            </button>
            <button
                type="button"
                onClick={handleScan}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold shadow disabled:bg-blue-300 disabled:cursor-not-allowed"
                disabled={!selectedFile || isLoading}
            >
                {isLoading ? (
                    <>
                        <Loader2 size={20} className="animate-spin" />
                        Analisando...
                    </>
                ) : (
                    <>
                        <ScanLine size={20} />
                        Analisar Recibo
                    </>
                )}
            </button>
        </div>
      </div>
    </Modal>
  );
};

export default ReceiptScannerModal;