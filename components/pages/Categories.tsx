
import React, { useState } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { Category, CategoryType } from '../../types';
import Modal from '../ui/Modal';
import { Plus, Edit, Trash2 } from 'lucide-react';

const CategoryForm: React.FC<{
  onSubmit: (category: Omit<Category, 'id'>) => void;
  onClose: () => void;
  categoryToEdit?: Category | null;
}> = ({ onSubmit, onClose, categoryToEdit }) => {
  const [type, setType] = useState<CategoryType>(categoryToEdit?.type || CategoryType.DESPESA);
  const [name, setName] = useState(categoryToEdit?.name || '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome da categoria é obrigatório.');
      return;
    }
    onSubmit({ name, type });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-2">Tipo da Categoria</label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setType(CategoryType.RECEITA)}
            className={`p-4 rounded-lg text-center font-semibold transition-all duration-200 ${
              type === CategoryType.RECEITA ? 'bg-emerald-500 text-white ring-2 ring-emerald-600 ring-offset-2' : 'bg-slate-100 hover:bg-emerald-100'
            }`}
          >
            Receita
          </button>
          <button
            type="button"
            onClick={() => setType(CategoryType.DESPESA)}
            className={`p-4 rounded-lg text-center font-semibold transition-all duration-200 ${
              type === CategoryType.DESPESA ? 'bg-rose-500 text-white ring-2 ring-rose-600 ring-offset-2' : 'bg-slate-100 hover:bg-rose-100'
            }`}
          >
            Despesa
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="categoryName" className="block text-sm font-medium text-slate-600">Nome da Categoria</label>
        <input
          id="categoryName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
          placeholder="Ex: Supermercado"
        />
        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition-colors">Cancelar</button>
        <button type="submit" className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors font-semibold shadow">Confirmar</button>
      </div>
    </form>
  );
};


const Categories: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory } = useAppData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

  const handleOpenModal = (category?: Category) => {
    setCategoryToEdit(category || null);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCategoryToEdit(null);
  };

  const handleSubmit = (data: Omit<Category, 'id'>) => {
    if (categoryToEdit) {
      updateCategory({ ...categoryToEdit, ...data });
    } else {
      addCategory(data);
    }
    handleCloseModal();
  };
  
  const handleDelete = (id: string) => {
    if(window.confirm('Tem certeza que deseja remover esta categoria? Esta ação não pode ser desfeita.')) {
      deleteCategory(id);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Categorias</h1>
          <p className="text-slate-500 mt-1">Crie e organize suas categorias de receitas e despesas.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors font-semibold shadow-md w-full sm:w-auto"
        >
          <Plus size={20} />
          Criar Categoria
        </button>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">Nenhuma categoria cadastrada ainda.</p>
            <p className="text-slate-400 text-sm mt-1">Clique em "Criar Categoria" para começar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b-2 border-slate-100">
                <tr>
                  <th className="p-3 text-sm font-semibold text-slate-500">Nome da Categoria</th>
                  <th className="p-3 text-sm font-semibold text-slate-500">Tipo</th>
                  <th className="p-3 text-sm font-semibold text-slate-500 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(cat => (
                  <tr key={cat.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="p-4 font-medium text-slate-700">{cat.name}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        cat.type === CategoryType.RECEITA ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {cat.type}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                         <button onClick={() => handleOpenModal(cat)} className="p-2 text-slate-500 hover:text-sky-600 transition-colors"><Edit size={18} /></button>
                         <button onClick={() => handleDelete(cat.id)} className="p-2 text-slate-500 hover:text-rose-600 transition-colors"><Trash2 size={18} /></button>
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
    </div>
  );
};

export default Categories;
