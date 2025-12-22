import React from 'react';
import Modal from './Modal';
import { Attachment } from '../../types';
import { Download } from 'lucide-react';

interface ViewAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachment: Attachment;
}

const ViewAttachmentModal: React.FC<ViewAttachmentModalProps> = ({ isOpen, onClose, attachment }) => {
  if (!isOpen) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `data:image/jpeg;base64,${attachment.data}`;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Visualizar Anexo">
      <div className="space-y-4">
        <div className="bg-gray-100 p-2 rounded-lg border">
            <img
            src={`data:image/jpeg;base64,${attachment.data}`}
            alt={attachment.name}
            className="max-h-[60vh] w-auto mx-auto rounded"
            />
        </div>
        <div className="flex justify-between items-center pt-4">
          <p className="text-sm text-gray-600 font-medium">{attachment.name}</p>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold shadow"
          >
            <Download size={18} />
            Baixar
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ViewAttachmentModal;