
import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import Modal from '../ui/Modal';
import { fileToBase64 } from '../../utils/imageUtils';
import { useLogger } from '../../hooks/useLogger';
import { UploadCloud, ScanLine, AlertCircle, Loader2 } from 'lucide-react';

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
    if (file) {
      setScanError('');
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
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
      const base64Image = await fileToBase64(selectedFile);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

      const imagePart = {
        inlineData: {
          mimeType: selectedFile.type,
          data: base64Image,
        },
      };

      const requestPayload = {
        model: 'gemini-3-flash-preview',
        // O resto do payload contém dados sensíveis (imagem), então o omitimos dos logs.
      };
      log.info('Enviando requisição para a IA...', requestPayload);
      
      const apiCallPromise = ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [
            { text: `Você é um assistente de digitalização financeira. Sua tarefa é dupla:
1.  **Extrair Dados:** Analise a imagem do recibo e extraia o valor total, a data da transação (no formato AAAA-MM-DD) e uma breve descrição ou nome do estabelecimento. Se a data não for encontrada, use a data de hoje. Se o valor não for encontrado, use 0.
2.  **Limpar Imagem:** Aja como um scanner profissional. Corrija a perspectiva, remova sombras, aumente o contraste e retorne uma imagem limpa do recibo com fundo branco.

Retorne um único objeto JSON contendo os dados extraídos e a imagem limpa em formato base64.` }, 
            imagePart
        ]},
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    value: { type: Type.NUMBER, description: 'Valor total da compra, use ponto como separador decimal.' },
                    date: { type: Type.STRING, description: 'Data da transação no formato AAAA-MM-DD.' },
                    description: { type: Type.STRING, description: 'Nome do estabelecimento ou descrição da compra.' },
                    scannedImage: { type: Type.STRING, description: 'A imagem do recibo, limpa e codificada em base64.' }
                },
                required: ["value", "date", "description", "scannedImage"]
            }
        }
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('API_TIMEOUT')), 30000) // 30 seconds
      );
      
      const response: any = await Promise.race([apiCallPromise, timeoutPromise]);
      
      log.info('Resposta da IA recebida.', response);
      let parsedData;
      const textResponse = response.text?.trim();

      if (!textResponse) {
        log.error('A resposta da IA estava vazia ou nula.', { response });
        throw new Error("A IA retornou uma resposta vazia.");
      }
      log.info('Texto extraído da resposta:', { textResponse });
      
      try {
        parsedData = JSON.parse(textResponse);
      } catch (e) {
        log.warn("Análise direta de JSON falhou, tentando extrair de markdown.", { error: e, textResponse });
        const jsonMatch = textResponse.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          try {
            parsedData = JSON.parse(jsonMatch[1]);
          } catch (e2) {
             log.error("Falha ao analisar JSON mesmo após extrair de markdown.", { error: e2, extractedText: jsonMatch[1] });
             throw new Error("A resposta da IA não continha um JSON válido.");
          }
        } else {
          throw new Error("A resposta da IA não estava no formato JSON esperado.");
        }
      }


      if (!/^\d{4}-\d{2}-\d{2}$/.test(parsedData.date)) {
        log.warn("Formato de data inválido da IA, usando data de hoje.", { date: parsedData.date });
        parsedData.date = new Date().toISOString().split('T')[0];
      }
      
      log.info('Digitalização concluída com sucesso.', parsedData);
      onScanComplete(parsedData);
      handleClose();

    } catch (error) {
      if (error instanceof Error && error.message === 'API_TIMEOUT') {
          log.error("A requisição para a IA expirou (timeout de 30s).");
          setScanError('A comunicação com a IA demorou muito. Verifique sua conexão e tente novamente.');
      } else {
        log.error("Erro ao digitalizar recibo.", { error });
        setScanError('A IA não conseguiu processar a imagem. Verifique o console para mais detalhes.');
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
