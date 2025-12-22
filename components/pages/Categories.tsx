import React, { useState } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { Category, CategoryType } from '../../types';
import Modal from '../ui/Modal';
import { Plus, Edit, Trash2, List } from 'lucide-react';

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
        <label className="block text-sm font-medium text-gray-600 mb-2">Tipo da Categoria</label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setType(CategoryType.RECEITA)}
            className={`p-4 rounded-lg text-center font-semibold transition-all duration-200 ${
              type === CategoryType.RECEITA ? 'bg-green-500 text-white ring-2 ring-green-600 ring-offset-2' : 'bg-gray-100 hover:bg-green-100'
            }`}
          >
            Receita
          </button>
          <button
            type="button"
            onClick={() => setType(CategoryType.DESPESA)}
            className={`p-4 rounded-lg text-center font-semibold transition-all duration-200 ${
              type === CategoryType.DESPESA ? 'bg-red-500 text-white ring-2 ring-red-600 ring-offset-2' : 'bg-gray-100 hover:bg-red-100'
            }`}
          >
            Despesa
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="categoryName" className="block text-sm font-medium text-gray-600">Nome da Categoria</label>
        <input
          id="categoryName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          placeholder="Ex: Supermercado"
        />
        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors">Cancelar</button>
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold shadow disabled:bg-blue-300">
          {isSubmitting ? 'Salvando...' : 'Confirmar'}
        </button>
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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Categorias</h1>
          <p className="text-gray-500 mt-1">Crie e organize suas categorias de receitas e despesas.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow w-full sm:w-auto"
        >
          <Plus size={20} />
          Criar Categoria
        </button>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm">
        {categories.length === 0 ? (
          <div className="text-center py-16">
            <List className="mx-auto h-12 w-12 text-gray-300" />
            <p className="text-gray-500 mt-4">Nenhuma categoria cadastrada ainda.</p>
            <p className="text-gray-400 text-sm mt-1">Clique em "Criar Categoria" para começar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b-2 border-gray-100">
                <tr>
                  <th className="p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Nome da Categoria</th>
                  <th className="p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(cat => (
                  <tr key={cat.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-medium text-gray-700">{cat.name}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        cat.type === CategoryType.RECEITA ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {cat.type}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                         <button onClick={() => handleOpenModal(cat)} className="p-2 text-gray-400 hover:text-blue-600 rounded-full transition-colors"><Edit size={18} /></button>
                         <button onClick={() => handleDelete(cat.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-full transition-colors"><Trash2 size={18} /></button>
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