import React, { useState } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { Category, CategoryType } from '../../types';
import Modal from '../ui/Modal';
import CategoryImportModal from '../ui/CategoryImportModal';
import { Plus, Edit, Trash2, List, Upload, X, ChevronRight } from 'lucide-react';

const CategoryForm: React.FC<{
  onSubmit: (category: Omit<Category, 'id'>) => Promise<void>;
  onClose: () => void;
  categoryToEdit?: Category | null;
}> = ({ onSubmit, onClose, categoryToEdit }) => {
  const [type, setType] = useState<CategoryType>(categoryToEdit?.type || CategoryType.DESPESA);
  const [name, setName] = useState(categoryToEdit?.name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    await onSubmit({ name, type });
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Natureza</label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setType(CategoryType.RECEITA)}
            className={`p-4 rounded-xl text-center font-bold uppercase tracking-widest text-[10px] transition-all active:scale-95 ${
              type === CategoryType.RECEITA ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-100 text-slate-500'
            }`}
          >
            Receita
          </button>
          <button
            type="button"
            onClick={() => setType(CategoryType.DESPESA)}
            className={`p-4 rounded-xl text-center font-bold uppercase tracking-widest text-[10px] transition-all active:scale-95 ${
              type === CategoryType.DESPESA ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-100 text-slate-500'
            }`}
          >
            Despesa
          </button>
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Identificação</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#c5a059] outline-none font-medium"
          placeholder="Ex: Alimentação"
        />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <button type="button" onClick={onClose} className="px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold uppercase text-[10px] active:scale-95">Cancelar</button>
        <button type="submit" disabled={isSubmitting} className="btn-premium-gold px-8 py-3 text-white rounded-xl font-extrabold uppercase text-[10px] shadow-lg active:scale-95">Salvar</button>
      </div>
    </form>
  );
};


const Categories: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory } = useAppData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const handleOpenModal = (category?: Category) => {
    setCategoryToEdit(category || null);
    setIsModalOpen(true);
    setActiveActionId(null);
  };

  const handleDelete = async (id: string) => {
    if(window.confirm('Excluir esta categoria?')) {
      try {
        await deleteCategory(id);
        setActiveActionId(null);
      } catch (error) {
        alert('Esta categoria possui lançamentos vinculados e não pode ser removida.');
      }
    }
  }

  return (
    <div className="space-y-6 sm:space-y-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-[800] text-slate-900 tracking-tight">Categorias</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1 sm:mt-2 font-medium tracking-wide">Estrutura organizacional de lançamentos.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 font-bold uppercase text-[9px] sm:text-[10px] active:scale-95 transition-all"
            >
              <Upload size={16} className="text-[#c5a059]" /> XLS
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="btn-premium-navy flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 text-white rounded-xl font-extrabold uppercase text-[9px] sm:text-[10px] active:scale-95 transition-all"
            >
              <Plus size={18} className="text-[#c5a059]" /> NOVA
            </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl sm:rounded-[2.5rem] premium-shadow border border-slate-50 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Identificação</th>
                <th className="p-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Natureza</th>
                <th className="p-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.id} className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50/30 transition-colors">
                  <td className="p-6 font-bold text-slate-900">{cat.name}</td>
                  <td className="p-6">
                    <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full ${cat.type === CategoryType.RECEITA ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{cat.type}</span>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end gap-1">
                       <button onClick={() => handleOpenModal(cat)} className="p-2 text-slate-300 hover:text-[#c5a059] transition-all"><Edit size={16} /></button>
                       <button onClick={() => handleDelete(cat.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-all"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile List com Revelação de Ações */}
        <div className="md:hidden divide-y divide-slate-50">
           {categories.length === 0 ? (
               <div className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhuma categoria registrada.</div>
           ) : categories.map(cat => (
               <div 
                key={cat.id} 
                className={`p-4 transition-colors active:bg-slate-50 ${activeActionId === cat.id ? 'bg-slate-50/50' : ''}`}
                onClick={() => setActiveActionId(activeActionId === cat.id ? null : cat.id)}
               >
                  <div className="flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-slate-900 text-sm">{cat.name}</h3>
                        <span className={`text-[8px] font-black uppercase tracking-widest ${cat.type === CategoryType.RECEITA ? 'text-emerald-500' : 'text-rose-500'}`}>{cat.type}</span>
                    </div>
                    <ChevronRight size={14} className={`transition-transform ${activeActionId === cat.id ? 'rotate-90 text-[#c5a059]' : 'text-slate-200'}`} />
                  </div>

                  {/* Ações Mobile */}
                  {activeActionId === cat.id && (
                    <div className="mt-4 flex gap-2 animate-scale-in">
                        <button onClick={(e) => { e.stopPropagation(); handleOpenModal(cat); }} className="flex-1 bg-slate-900 text-white p-2.5 rounded-xl font-bold uppercase text-[9px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"><Edit size={14} className="text-[#c5a059]" /> Editar</button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(cat.id); }} className="flex-1 bg-rose-50 text-rose-600 p-2.5 rounded-xl font-bold uppercase text-[9px] flex items-center justify-center gap-2 active:scale-95 transition-all"><Trash2 size={14} /> Excluir</button>
                        <button onClick={(e) => { e.stopPropagation(); setActiveActionId(null); }} className="p-2.5 bg-slate-100 text-slate-400 rounded-xl active:scale-95 transition-all"><X size={14} /></button>
                    </div>
                  )}
               </div>
           ))}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={categoryToEdit ? 'Editar Categoria' : 'Nova Categoria'}>
        <CategoryForm onSubmit={async (data) => { if (categoryToEdit) await updateCategory({ ...categoryToEdit, ...data }); else await addCategory(data); setIsModalOpen(false); }} onClose={() => setIsModalOpen(false)} categoryToEdit={categoryToEdit} />
      </Modal>

      <CategoryImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
    </div>
  );
};

export default Categories;