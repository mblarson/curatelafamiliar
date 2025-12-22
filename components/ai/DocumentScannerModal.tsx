import React, { useState, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import Modal from '../ui/Modal';
import { fileToBase64 } from '../../utils/imageUtils';
import { useLogger } from '../../hooks/useLogger';
import { UploadCloud, ScanLine, AlertCircle, Loader2 } from 'lucide-react';

interface DocumentScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (base64Image: string) => void;
}

const DocumentScannerModal: React.FC<DocumentScannerModalProps> = ({ isOpen, onClose, onScanComplete }) => {
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

    log.info('Iniciando digitalização de documento...');
    try {
      // FIX: Use process.env.API_KEY as per guidelines and fix TS error.
      if (!process.env.API_KEY) {
        log.error("A chave de API do Gemini não foi configurada nas variáveis de ambiente.");
        throw new Error("API_KEY_NOT_CONFIGURED");
      }
      
      log.info('Comprimindo imagem...');
      const { mimeType, data: base64Image } = await fileToBase64(selectedFile);
      log.info('Imagem comprimida.');

      // FIX: Use process.env.API_KEY as per guidelines.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const imagePart = {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      };

      const requestPayload = {
        model: 'gemini-2.5-flash-image',
      };
      log.info('Enviando requisição para a IA (Documento)...', requestPayload);
      
      const cleaningPrompt = `Aja como um scanner de documentos profissional e realize um pós-processamento completo na imagem deste documento. O objetivo é gerar um documento limpo, nítido e perfeitamente legível, ideal para arquivamento e prestação de contas. Execute as seguintes ações:
1. **Detecção e Alinhamento:** Detecte as bordas do documento, corrija a perspectiva e qualquer ângulo torto, e centralize o documento na imagem.
2. **Limpeza de Fundo:** Remova completamente o fundo original, substituindo-o por um fundo perfeitamente branco e uniforme.
3. **Ajuste de Qualidade:** Aumente o contraste e a nitidez para garantir que o texto seja escuro e totalmente legível.
4. **Remoção de Imperfeições:** Elimine quaisquer sombras, reflexos, borrões ou outras distorções visuais.
O resultado final deve ser idêntico a um documento digitalizado por um scanner de alta qualidade.`;

      const apiCallPromise = ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
              parts: [
                  { text: cleaningPrompt },
                  imagePart
              ]
          }
      });
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('API_TIMEOUT')), 90000) // 90 seconds
      );

      const response: any = await Promise.race([apiCallPromise, timeoutPromise]);

      log.info('Resposta da IA (Documento) recebida.', response);
      let scannedImage = '';
      const imagePartResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
      if (imagePartResponse && imagePartResponse.inlineData) {
          scannedImage = imagePartResponse.inlineData.data;
      } else {
          log.warn("Não foi possível obter uma imagem digitalizada, usando a original (já comprimida).", { response });
          scannedImage = base64Image;
      }

      log.info('Digitalização de documento concluída com sucesso.');
      onScanComplete(scannedImage);
      handleClose();

    } catch (error) {
      log.error("Ocorreu um erro detalhado ao digitalizar o documento", { error });

      let userMessage = 'Não foi possível processar o documento. Verifique o console para detalhes técnicos.';
      if (error instanceof Error) {
          // FIX: Update error message to reflect use of environment variable.
          if (error.message === "API_KEY_NOT_CONFIGURED") {
            userMessage = "Atenção: A chave de API do Gemini não foi configurada nas variáveis de ambiente.";
          } else if (error.message === 'API_TIMEOUT') {
              userMessage = 'A análise demorou muito (timeout). Tente novamente com uma imagem menor.';
          } else {
              const specificError = (error as any).cause?.toString() || error.toString();
              userMessage = `Falha na comunicação com a IA. Detalhes: ${specificError}.`;
          }
      }
      setScanError(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Digitalizar Documento">
      <div className="space-y-4">
        {previewUrl ? (
          <div className="text-center">
            <img src={previewUrl} alt="Pré-visualização do documento" className="max-h-60 w-auto inline-block rounded-md border" />
          </div>
        ) : (
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
            onClick={() => document.getElementById('doc-file-upload')?.click()}
          >
            <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">Arraste e solte o documento aqui, ou clique para selecionar</p>
            <p className="text-xs text-gray-500">PNG, JPG ou WEBP</p>
            <p className="text-xs text-gray-400 mt-2">Imagens grandes serão otimizadas para acelerar o processo.</p>
            <input id="doc-file-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
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
                        Digitalizando...
                    </>
                ) : (
                    <>
                        <ScanLine size={20} />
                        Digitalizar
                    </>
                )}
            </button>
        </div>
      </div>
    </Modal>
  );
};

export default DocumentScannerModal;