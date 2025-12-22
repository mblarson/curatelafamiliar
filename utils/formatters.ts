export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatCurrencyInput = (value: string): string => {
  let numericValue = value.replace(/\D/g, '');
  if (!numericValue) return '';

  numericValue = (parseInt(numericValue, 10) / 100).toFixed(2);
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(parseFloat(numericValue));
};

export const unformatCurrency = (value: string): number => {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return 0;
    return parseInt(numericValue, 10) / 100;
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};