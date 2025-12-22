import React from 'react';
import Modal from './Modal';
import { Attachment } from '../../types';
import { Download, ExternalLink } from 'lucide-react';

interface ViewAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachment: Attachment;
}

const ViewAttachmentModal: React.FC<ViewAttachmentModalProps> = ({ isOpen, onClose, attachment }) => {
  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(attachment.url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Não foi possível baixar o arquivo.");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Visualizar Anexo">
      <div className="space-y-4">
        <div className="bg-gray-100 p-2 rounded-lg border">
            <img
            src={attachment.url}
            alt={attachment.name}
            className="max-h-[60vh] w-auto mx-auto rounded"
            />
        </div>
        <div className="flex justify-between items-center pt-4">
          <p className="text-sm text-gray-600 font-medium truncate pr-4">{attachment.name}</p>
          <div className="flex items-center gap-2">
            <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-500 hover:text-blue-600 transition-colors" title="Abrir em nova aba">
                <ExternalLink size={18} />
            </a>
            <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold shadow"
            >
                <Download size={18} />
                Baixar
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ViewAttachmentModal;