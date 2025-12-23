import React, { useState, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import Modal from '../ui/Modal';
import { fileToBase64 } from '../../utils/imageUtils';
import { useLogger } from '../../hooks/useLogger';
import { UploadCloud, ScanLine, AlertCircle, Loader2 } from 'lucide-react';
// FIX: Removed GEMINI_API_KEY import to use environment variable as per guidelines.

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

    // FIX: Removed check for placeholder API key. As per guidelines, the API key is assumed to be configured via environment variables.

    setIsLoading(true);
    setScanError('');

    try {
      const { mimeType, data: base64Image } = await fileToBase64(selectedFile);
      // FIX: Use process.env.API_KEY for Gemini API initialization as per guidelines.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const cleaningPrompt = `Aja como um scanner de documentos profissional. Melhore a nitidez, brilho e contraste deste documento para arquivamento digital.`;

      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: cleaningPrompt }, { inlineData: { mimeType, data: base64Image } }] }
      });

      const imagePartResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
      const scannedImage = imagePartResponse?.inlineData?.data || base64Image;

      onScanComplete(scannedImage);
      handleClose();

    } catch (error) {
      log.error("Erro na digitalização:", error);
      let userMessage = 'Não foi possível processar o documento. Tente novamente.';
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes('api key not valid') || message.includes('api key is missing')) {
            userMessage = "A chave de API do Gemini é inválida ou não foi configurada. Verifique as configurações.";
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Digitalizar Documento">
      <div className="space-y-4">
        {previewUrl ? (
          <div className="text-center">
            <img src={previewUrl} alt="Pré-visualização" className="max-h-60 w-auto inline-block rounded-md border" />
          </div>
        ) : (
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
            onClick={() => document.getElementById('doc-file-upload')?.click()}
          >
            <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">Arraste ou selecione o documento</p>
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
            <button onClick={handleClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md">Cancelar</button>
            <button
                onClick={handleScan}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold shadow disabled:bg-blue-300"
                disabled={!selectedFile || isLoading}
            >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <ScanLine size={20} />}
                {isLoading ? 'Digitalizando...' : 'Digitalizar'}
            </button>
        </div>
      </div>
    </Modal>
  );
};

export default DocumentScannerModal;