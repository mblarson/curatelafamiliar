import React, { useState } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { Category, CategoryType } from '../../types';
import Modal from '../ui/Modal';
import CategoryImportModal from '../ui/CategoryImportModal';
import { Plus, Edit, Trash2, List, Upload } from 'lucide-react';

const CategoryForm: React.FC<{
  onSubmit: (category: Omit<Category, 'id'>) => Promise<void>;
  onClose: () => void;
  categoryToEdit?: Category | null;
}> = ({ onSubmit, onClose, categoryToEdit }) => {
  const [type, setType] = useState<CategoryType>(categoryToEdit?.type || CategoryType.DESPESA);
  const [name, setName] = useState(categoryToEdit?.name || '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome da categoria é obrigatório.');
      return;
    }
    setIsSubmitting(true);
    await onSubmit({ name, type });
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-3">Tipo da Categoria</label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setType(CategoryType.RECEITA)}
            className={`p-4 rounded-2xl text-center font-bold uppercase tracking-widest text-[11px] transition-all duration-300 ${
              type === CategoryType.RECEITA ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-emerald-50'
            }`}
          >
            Receita
          </button>
          <button
            type="button"
            onClick={() => setType(CategoryType.DESPESA)}
            className={`p-4 rounded-2xl text-center font-bold uppercase tracking-widest text-[11px] transition-all duration-300 ${
              type === CategoryType.DESPESA ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-slate-100 text-slate-500 hover:bg-rose-50'
            }`}
          >
            Despesa
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="categoryName" className="block text-xs font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-2">Nome da Categoria</label>
        <input
          id="categoryName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#c5a059] transition-all gold-focus font-medium"
          placeholder="Ex: Supermercado"
        />
        {error && <p className="text-[10px] font-extrabold text-rose-500 mt-2 uppercase tracking-wide">{error}</p>}
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <button type="button" onClick={onClose} className="px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-2xl hover:bg-slate-50 font-bold uppercase tracking-widest text-[10px] transition-all">Cancelar</button>
        <button type="submit" disabled={isSubmitting} className="btn-premium-gold px-8 py-3 text-white rounded-2xl font-extrabold uppercase tracking-widest text-[10px] shadow-lg disabled:opacity-50">
          {isSubmitting ? 'SALVANDO...' : 'CONFIRMAR'}
        </button>
      </div>
    </form>
  );
};


const Categories: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory } = useAppData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

  const handleOpenModal = (category?: Category) => {
    setCategoryToEdit(category || null);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCategoryToEdit(null);
  };

  const handleSubmit = async (data: Omit<Category, 'id'>) => {
    if (categoryToEdit) {
      await updateCategory({ ...categoryToEdit, ...data });
    } else {
      await addCategory(data);
    }
    handleCloseModal();
  };
  
  const handleDelete = async (id: string) => {
    if(window.confirm('Tem certeza que deseja remover esta categoria? Esta ação não pode ser desfeita.')) {
      try {
        await deleteCategory(id);
      } catch (error: any) {
        if (error.code === '23503') { // PostgreSQL foreign key violation
          alert('Não é possível remover esta categoria, pois ela já está sendo utilizada em um ou mais lançamentos.');
        } else {
          alert(`Ocorreu um erro ao remover a categoria: ${error.message}`);
        }
      }
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-[800] text-slate-900 tracking-tight">Categorias</h1>
          <p className="text-slate-500 mt-2 font-medium tracking-wide">Estrutura organizacional de receitas e despesas.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-slate-700 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all font-bold uppercase tracking-widest text-[10px] shadow-sm"
            >
              <Upload size={18} className="text-[#c5a059]" />
              Importar XLS
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="btn-premium-navy flex items-center justify-center gap-2 px-8 py-3.5 text-white rounded-2xl font-extrabold uppercase tracking-widest text-[10px] shadow-lg"
            >
              <Plus size={20} className="text-[#c5a059]" />
              CRIAR CATEGORIA
            </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] premium-shadow border border-slate-50 overflow-hidden">
        {categories.length === 0 ? (
          <div className="text-center py-24">
            <List className="mx-auto h-16 w-16 text-slate-200" />
            <p className="text-slate-400 mt-6 font-extrabold uppercase tracking-widest text-[11px]">Nenhuma categoria cadastrada ainda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="p-6 text-[10px] font-[800] text-slate-400 uppercase tracking-[0.25em]">Nome da Categoria</th>
                  <th className="p-6 text-[10px] font-[800] text-slate-400 uppercase tracking-[0.25em]">Natureza</th>
                  <th className="p-6 text-[10px] font-[800] text-slate-400 uppercase tracking-[0.25em] text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {categories.sort((a, b) => a.name.localeCompare(b.name)).map(cat => (
                  <tr key={cat.id} className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50/30 transition-colors">
                    <td className="p-6 font-bold text-slate-900 tracking-tight">{cat.name}</td>
                    <td className="p-6">
                      <span className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-full ${
                        cat.type === CategoryType.RECEITA ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {cat.type}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-1">
                         <button onClick={() => handleOpenModal(cat)} className="p-3 text-slate-300 hover:text-[#c5a059] rounded-xl transition-all"><Edit size={18} /></button>
                         <button onClick={() => handleDelete(cat.id)} className="p-3 text-slate-300 hover:text-rose-600 rounded-xl transition-all"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={categoryToEdit ? 'Editar Categoria' : 'Criar Nova Categoria'}>
        <CategoryForm onSubmit={handleSubmit} onClose={handleCloseModal} categoryToEdit={categoryToEdit} />
      </Modal>

      <CategoryImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};

export default Categories;