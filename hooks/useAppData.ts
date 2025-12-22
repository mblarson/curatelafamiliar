
import { useContext } from 'react';
import { AppContext } from '../context/AppContext';

export const useAppData = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppProvider');
  }
  return context;
};
