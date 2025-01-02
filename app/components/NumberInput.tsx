import { ChangeEvent } from 'react';

interface NumberInputProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  allowUndefined?: boolean;
}

export default function NumberInput({
  value,
  onChange,
  disabled = false,
  placeholder,
  className = '',
  allowUndefined = false,
}: NumberInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/^0+/, '');
    if (value === '') {
      onChange(allowUndefined ? undefined : 0);
    } else {
      const num = Number(value);
      if (!isNaN(num)) {
        onChange(num);
      }
    }
  };

  return (
    <input
      type="text"
      value={value === undefined ? '' : value}
      onChange={handleChange}
      disabled={disabled}
      placeholder={placeholder}
      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary ${
        disabled ? 'bg-gray-100 cursor-not-allowed' : ''
      } ${className}`}
    />
  );
}