import React from 'react';
import Modal from './Modal';

const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configurações">
        <div className="space-y-6">
            <p className="text-sm text-gray-500">
                As funcionalidades de IA são configuradas centralmente.
            </p>
        </div>
    </Modal>
  );
};

export default SettingsModal;