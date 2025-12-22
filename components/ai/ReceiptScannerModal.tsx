
import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import Modal from '../ui/Modal';
import { fileToBase64 } from '../../utils/imageUtils';
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

    try {
      const base64Image = await fileToBase64(selectedFile);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

      const imagePart = {
        inlineData: {
          mimeType: selectedFile.type,
          data: base64Image,
        },
      };

      // Promise for data extraction
      const dataExtractionPromise = ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: { parts: [{ text: `Analise este recibo. Extraia o valor total, a data da transação (no formato AAAA-MM-DD) e uma breve descrição ou nome do estabelecimento. Se não conseguir encontrar uma data, use a data de hoje. Se não encontrar um valor, use 0.` }, imagePart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    value: { type: Type.NUMBER, description: 'Valor total da compra, use ponto como separador decimal.' },
                    date: { type: Type.STRING, description: 'Data da transação no formato AAAA-MM-DD.' },
                    description: { type: Type.STRING, description: 'Nome do estabelecimento ou descrição da compra.' }
                },
                required: ["value", "date", "description"]
            }
        }
      });

      // Promise for image processing
      const imageProcessingPromise = ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
              parts: [
                  { text: 'Aja como um scanner de documentos. Pegue esta imagem de um recibo, corrija a perspectiva, remova sombras, aumente o contraste e retorne uma imagem limpa com fundo branco e texto nítido. A imagem resultante deve ser o único conteúdo na resposta.' },
                  imagePart
              ]
          }
      });

      const [dataResponse, imageResponse] = await Promise.all([dataExtractionPromise, imageProcessingPromise]);
      
      // Process data response
      const textResponse = dataResponse.text.trim();
      const parsedData = JSON.parse(textResponse);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(parsedData.date)) {
        console.warn("Invalid date format from AI, using today's date.", parsedData.date);
        parsedData.date = new Date().toISOString().split('T')[0];
      }
      
      // Process image response
      let scannedImage = '';
      const imagePartResponse = imageResponse.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
      if (imagePartResponse && imagePartResponse.inlineData) {
          scannedImage = imagePartResponse.inlineData.data;
      } else {
          console.warn("Could not get a scanned image, using original.");
          scannedImage = base64Image;
      }

      onScanComplete({ ...parsedData, scannedImage });
      handleClose();

    } catch (error) {
      console.error("Error scanning receipt:", error);
      setScanError('Não foi possível analisar o recibo. Tente novamente com uma imagem mais nítida.');
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
