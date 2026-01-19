import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-start sm:items-center z-50 p-4 pt-12 sm:pt-4 transition-all duration-500 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[2rem] sm:rounded-[2.5rem] premium-shadow w-full max-w-lg animate-scale-in flex flex-col max-h-[92vh] border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 flex justify-between items-center p-6 sm:p-8 border-b border-slate-50 bg-slate-50/30">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{title}</h2>
            <div className="h-1 w-12 bg-[#c5a059] mt-2 rounded-full"></div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 transition-all p-2 rounded-full hover:bg-white shadow-sm border border-transparent hover:border-slate-100 active:scale-90"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-6 sm:p-8 overflow-y-auto no-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;