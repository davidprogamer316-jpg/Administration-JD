'use client';

interface DateInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}

export default function DateInput({ value, onChange, placeholder = '', className = '' }: DateInputProps) {
  return (
    <div className="relative">
      <input
        type="date"
        value={value}
        onChange={onChange}
        className={className}
      />
      {!value && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-text-muted pointer-events-none">
          {placeholder}
        </span>
      )}
    </div>
  );
}
