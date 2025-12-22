import React, { useState, useEffect } from 'react';
import { useAppData } from '../../hooks/useAppData';
import Modal from './Modal';
import { KeyRound, ShieldAlert } from 'lucide-react';

const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
  const { apiKey, setApiKey } = useAppData();
  const [localKey, setLocalKey] = useState(apiKey || '');

  useEffect(() => {
    if (isOpen) {
      setLocalKey(apiKey || '');
    }
  }, [apiKey, isOpen]);

  const handleSave = () => {
    setApiKey(localKey.trim() || null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configurar Chave de API">
      <div className="space-y-4">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <ShieldAlert className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Sua chave de API é salva <strong>apenas no seu navegador</strong> e não é enviada para nenhum servidor. Esta opção é para facilitar o uso em ambiente de desenvolvimento.
              </p>
            </div>
          </div>
        </div>
        <div>
          <label htmlFor="apiKeyInput" className="block text-sm font-medium text-gray-700">Chave de API do Google Gemini</label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <KeyRound className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              id="apiKeyInput"
              className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              placeholder="Cole sua chave aqui"
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
            />
          </div>
           <p className="text-xs text-gray-500 mt-1">Deixe em branco para desativar as funcionalidades de IA.</p>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors">Cancelar</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold shadow">Salvar Chave</button>
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;