import React, { useState, useEffect } from 'react';
import { formatCurrencyInput, unformatCurrency } from '../../utils/formatters';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  id?: string;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onChange, placeholder, id }) => {
  const [displayValue, setDisplayValue] = useState(formatCurrencyInput(String(value * 100)));

  useEffect(() => {
    // Update display value if the parent's value changes, e.g., when editing
    if (unformatCurrency(displayValue) !== value) {
      setDisplayValue(formatCurrencyInput(String(value * 100)));
    }
  }, [value, displayValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyInput(e.target.value);
    setDisplayValue(formatted);
    onChange(unformatCurrency(formatted));
  };

  return (
    <input
      type="text"
      id={id}
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder || 'R$ 0,00'}
      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#c5a059] transition-all gold-focus font-semibold tabular-nums"
    />
  );
};

export default CurrencyInput;