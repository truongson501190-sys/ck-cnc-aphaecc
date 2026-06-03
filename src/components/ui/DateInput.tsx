import React, { useState, useEffect } from 'react';
import { Input } from './input';

interface DateInputProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  [key: string]: any;
}

export function DateInput({ value, onChange, ...props }: DateInputProps) {
  // Convert YYYY-MM-DD to DD/MM/YYYY for display
  const [displayValue, setDisplayValue] = useState(() => {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return value;
  });

  useEffect(() => {
    if (!value) {
      setDisplayValue('');
      return;
    }
    const parts = value.split('-');
    if (parts.length === 3) {
      setDisplayValue(`${parts[2]}/${parts[1]}/${parts[0]}`);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDisplayValue(val);

    // Convert DD/MM/YYYY to YYYY-MM-DD
    const parts = val.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2].padStart(4, '0');
      onChange(`${year}-${month}-${day}`);
    }
  };

  return (
    <Input
      {...props}
      type="text"
      value={displayValue}
      onChange={handleChange}
      placeholder="dd/mm/yyyy"
    />
  );
}
