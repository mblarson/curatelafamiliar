import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useAppData } from '../../hooks/useAppData';
import { Eye, EyeOff, Save, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
  const { apiKey, saveApiKey, clearApiKey } = useAppData();
  const [inputValue, setInputValue] = useState('');
  const [isKeyVisible, setIsKeyVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInputValue(apiKey || '');
    }
  }, [isOpen, apiKey]);

  const handleSave = () => {
    saveApiKey(inputValue);
    onClose();
  };
  
  const handleClear = () => {
    clearApiKey();
    setInputValue('');
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configurações">
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-800">Chave de API Gemini</h3>
                <p className="text-sm text-gray-500 mt-1">
                    Para usar as funcionalidades de IA, sua chave será salva localmente neste navegador. Ela não será sincronizada com outros dispositivos.
                    Obtenha sua chave em{' '}
                    <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                        ai.google.dev
                    </a>.
                </p>
                {apiKey ? (
                    <div className="mt-3 flex items-center gap-2 text-sm bg-green-50 text-green-700 p-3 rounded-lg border border-green-200">
                        <CheckCircle size={20} />
                        <span>Uma chave de API está salva neste navegador.</span>
                    </div>
                ) : (
                    <div className="mt-3 flex items-center gap-2 text-sm bg-yellow-50 text-yellow-700 p-3 rounded-lg border border-yellow-200">
                        <AlertCircle size={20} />
                        <span>Nenhuma chave de API configurada para este navegador.</span>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <label htmlFor="api-key-input" className="block text-sm font-medium text-gray-600">Sua Chave de API</label>
                <div className="relative">
                    <input
                        id="api-key-input"
                        type={isKeyVisible ? 'text' : 'password'}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Cole sua chave de API aqui"
                        className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        type="button"
                        onClick={() => setIsKeyVisible(!isKeyVisible)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                        title={isKeyVisible ? 'Ocultar chave' : 'Mostrar chave'}
                    >
                        {isKeyVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                    onClick={handleClear} 
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                    <Trash2 size={16} />
                    Limpar Chave
                </button>
                <button
                    onClick={handleSave}
                    disabled={!inputValue}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold shadow disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                    <Save size={16} />
                    Salvar Chave
                </button>
            </div>
        </div>
    </Modal>
  );
};

export default SettingsModal;