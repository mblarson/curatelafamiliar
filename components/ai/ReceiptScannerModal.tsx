import React, { useState, useCallback } from 'react';
import Modal from '../ui/Modal';
import { fileToBase64 } from '../../utils/imageUtils';
import { useLogger } from '../../hooks/useLogger';
import { supabase } from '../../supabase/client';
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
    log.info('Iniciando digitalização segura via Edge Function...');

    try {
      const { mimeType, data: base64Image } = await fileToBase64(selectedFile);
      log.info('Imagem processada. Invocando a função "scan-receipt"...');

      const { data, error } = await supabase.functions.invoke('scan-receipt', {
        body: { mimeType, image: base64Image },
      });

      if (error) {
        throw new Error(`Function error: ${error.message}`);
      }
      
      if (!data.value || !data.date || !data.description || !data.scannedImage) {
        log.error("Resposta da Edge Function incompleta:", data);
        throw new Error(data.error || 'A IA não conseguiu extrair todos os dados necessários do recibo.');
      }

      onScanComplete(data);
      handleClose();

    } catch (error) {
      log.error("Erro detalhado na digitalização:", error);
      const userMessage = error instanceof Error ? error.message : 'Falha ao processar o recibo. Verifique a qualidade da imagem e tente novamente.';
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