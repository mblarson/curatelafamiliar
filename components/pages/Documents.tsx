import React, { useState } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { Document } from '../../types';
import { supabase } from '../../supabase/client';
import { formatDate } from '../../utils/formatters';
import { Plus, Trash2, Eye, FileText, UploadCloud } from 'lucide-react';
import Modal from '../ui/Modal';
import DocumentScannerModal from '../ai/DocumentScannerModal';

const AddDocumentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { addDocument } = useAppData();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle('');
    setFile(null);
    setScannedImage(null);
    setPreviewUrl(null);
    setError('');
    setIsSubmitting(false);
  }

  const handleClose = () => {
    resetForm();
    onClose();
  }

  const handleFileChange = (selectedFile: File) => {
    if (selectedFile) {
      setFile(selectedFile);
      setScannedImage(null);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleScanComplete = (base64Image: string) => {
    setScannedImage(base64Image);
    setFile(null);
    setPreviewUrl(`data:image/jpeg;base64,${base64Image}`);
    setIsScannerOpen(false);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('O título do documento é obrigatório.');
      return;
    }
    if (!file && !scannedImage) {
      setError('Por favor, anexe ou digitalize um documento.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
        if (scannedImage) {
            await addDocument(title, `${title.replace(/\s+/g, '_')}.jpg`, scannedImage);
        } else if (file) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = async () => {
                const base64String = (reader.result as string).split(',')[1];
                await addDocument(title, file.name, base64String);
            };
        }
        handleClose();
    } catch (err) {
        setError('Ocorreu um erro ao salvar o documento.');
        console.error(err);
    } finally {
        setIsSubmitting(false);
    }
  }


  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title="Adicionar Novo Documento">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="doc-title" className="block text-sm font-medium text-gray-600">Título do Documento</label>
            <input 
              type="text"
              id="doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Laudo Médico Oftalmológico"
            />
          </div>
          
          <div>
             <label className="block text-sm font-medium text-gray-600 mb-1">Arquivo</label>
             {previewUrl ? (
                <div className="text-center p-2 border rounded-md">
                    <img src={previewUrl} alt="Pré-visualização" className="max-h-40 w-auto inline-block rounded" />
                </div>
             ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <UploadCloud className="mx-auto h-10 w-10 text-gray-400" />
                    <p className="mt-1 text-sm text-gray-600">Arraste ou selecione um arquivo</p>
                </div>
             )}
             <div className="flex items-center justify-center gap-2 mt-2">
                 <label htmlFor="file-upload" className="cursor-pointer text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-100 hover:bg-blue-200 px-4 py-2 rounded-md transition-colors">
                    Anexar Arquivo
                 </label>
                 <input id="file-upload" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleFileChange(e.target.files[0])} />
                 <span className="text-sm text-gray-500">ou</span>
                 <button type="button" onClick={() => setIsScannerOpen(true)} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-100 hover:bg-indigo-200 px-4 py-2 rounded-md transition-colors">
                    Digitalizar com IA
                 </button>
             </div>
          </div>

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <div className="flex justify-end gap-3 pt-4 border-t mt-6">
            <button type="button" onClick={handleClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold shadow disabled:bg-blue-300">
              {isSubmitting ? 'Salvando...' : 'Salvar Documento'}
            </button>
          </div>
        </form>
      </Modal>

      <DocumentScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanComplete={handleScanComplete}
      />
    </>
  );
};


const Documents: React.FC = () => {
    const { documents, deleteDocument } = useAppData();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const getPublicUrl = (storagePath: string) => {
        const { data } = supabase.storage.from('attachments').getPublicUrl(storagePath);
        return data.publicUrl;
    }

    const handleDelete = async (id: string) => {
        if(window.confirm('Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.')) {
            await deleteDocument(id);
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Gerenciador de Documentos</h1>
                    <p className="text-gray-500 mt-1">Armazene e organize documentos importantes.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow w-full sm:w-auto"
                >
                    <Plus size={20} />
                    Adicionar Documento
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {documents.length === 0 ? (
                    <div className="sm:col-span-2 md:col-span-3 lg:col-span-4 text-center py-20 bg-white rounded-2xl shadow-sm">
                        <FileText className="mx-auto h-12 w-12 text-gray-300" />
                        <p className="text-gray-500 mt-4 font-medium">Nenhum documento encontrado.</p>
                        <p className="text-gray-400 text-sm mt-1">Clique em "Adicionar Documento" para começar.</p>
                    </div>
                ) : (
                    documents.map(doc => (
                        <div key={doc.id} className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col group transition-all hover:shadow-lg hover:-translate-y-1">
                            <a href={getPublicUrl(doc.storage_path)} target="_blank" rel="noopener noreferrer" className="block bg-gray-100 h-40 flex items-center justify-center">
                                <img 
                                  src={getPublicUrl(doc.storage_path)} 
                                  alt={doc.title} 
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                            </a>
                            <div className="p-4 flex flex-col flex-grow">
                                <h3 className="font-semibold text-gray-800 truncate">{doc.title}</h3>
                                <p className="text-xs text-gray-400 mt-1">Adicionado em: {formatDate(doc.created_at)}</p>
                                <div className="mt-4 pt-3 border-t border-gray-100 flex-grow flex items-end justify-end gap-2">
                                     <a href={getPublicUrl(doc.storage_path)} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-blue-600 rounded-full transition-colors"><Eye size={18} /></a>
                                     <button onClick={() => handleDelete(doc.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-full transition-colors"><Trash2 size={18} /></button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <AddDocumentModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />
        </div>
    );
};

export default Documents;