'use client';

interface DateInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

export default function DateInput({ value, onChange, className = '' }: DateInputProps) {
  return (
    <input
      type="date"
      value={value}
      onChange={onChange}
      className={className}
    />
  );
}
