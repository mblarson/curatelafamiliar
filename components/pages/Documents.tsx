import React, { useState } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { supabase } from '../../supabase/client';
import { formatDate } from '../../utils/formatters';
import { Plus, Trash2, Eye, FileText, ShieldCheck } from 'lucide-react';

const Documents: React.FC = () => {
    const { documents, deleteDocument } = useAppData();

    const getPublicUrl = (storagePath: string) => {
        const { data } = supabase.storage.from('attachments').getPublicUrl(storagePath);
        return data.publicUrl;
    }

    const handleDelete = async (id: string) => {
        if(window.confirm('Excluir documento?')) await deleteDocument(id);
    }

    return (
        <div className="space-y-6 sm:space-y-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
                <div>
                    <h1 className="text-2xl sm:text-4xl font-[800] text-slate-900 tracking-tight">Cofre Digital</h1>
                    <p className="text-sm sm:text-base text-slate-500 mt-1 sm:mt-2 font-medium tracking-wide">Arquivamento seguro.</p>
                </div>
                <button className="btn-premium-navy flex items-center justify-center gap-2 px-6 py-3.5 text-white rounded-xl font-extrabold uppercase text-[10px] shadow-lg w-full sm:w-auto active:scale-95 transition-transform">
                    <Plus size={18} className="text-[#c5a059]" /> Novo Arquivo
                </button>
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-8">
                {documents.length === 0 ? (
                    <div className="col-span-full text-center py-20 bg-white rounded-2xl sm:rounded-[2.5rem] premium-shadow border border-dashed border-slate-200">
                        <FileText className="mx-auto h-12 w-12 text-slate-200" />
                        <p className="text-slate-400 mt-4 font-extrabold uppercase tracking-widest text-[9px] sm:text-[11px]">Vazio.</p>
                    </div>
                ) : documents.map(doc => (
                    <div key={doc.id} className="bg-white rounded-2xl sm:rounded-[2.5rem] premium-shadow border border-slate-50 overflow-hidden group active:scale-[0.98] transition-transform">
                        <a href={getPublicUrl(doc.storage_path)} target="_blank" rel="noopener noreferrer" className="block bg-slate-100 h-40 sm:h-52 relative">
                            <img src={getPublicUrl(doc.storage_path)} alt={doc.title} className="h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="text-white w-8 h-8" />
                            </div>
                        </a>
                        <div className="p-4 sm:p-6">
                            <h3 className="font-bold text-slate-900 tracking-tight text-sm sm:text-lg truncate">{doc.title}</h3>
                            <p className="text-[9px] font-black text-[#c5a059] uppercase tracking-widest mt-1">{formatDate(doc.created_at)}</p>
                            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-end">
                                 <button onClick={(e) => { e.preventDefault(); handleDelete(doc.id); }} className="p-2 text-slate-300 hover:text-rose-600 transition-colors"><Trash2 size={18} /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Documents;