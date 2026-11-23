import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';
import { formatDate, toIsoDate, parseFlexibleDate } from '../utils/dateUtils';

export interface DateInputProps {
  value?: string | null;
  onChange?: (e: { target: { value: string; name?: string } }) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  min?: string;
  max?: string;
  showCalendarIcon?: boolean;
  style?: React.CSSProperties;
}

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'dd/mm/yyyy',
  required = false,
  disabled = false,
  id,
  name,
  min,
  max,
  showCalendarIcon = true,
  style = {}
}) => {
  const [displayText, setDisplayText] = useState<string>(() => formatDate(value));
  const pickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayText(formatDate(value));
  }, [value]);

  const triggerOnChange = (isoVal: string) => {
    if (onChange) {
      onChange({
        target: {
          value: isoVal,
          name: name || ''
        }
      });
    }
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoVal = e.target.value;
    if (isoVal) {
      setDisplayText(formatDate(isoVal));
      triggerOnChange(isoVal);
    } else {
      setDisplayText('');
      triggerOnChange('');
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;

    // Auto-format digits: if user types digits like 26102026, format as 26/10/2026
    const digitsOnly = raw.replace(/\D/g, '');
    if (digitsOnly.length === 8 && !raw.includes('/') && !raw.includes('-')) {
      raw = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`;
    }

    setDisplayText(raw);

    // If matches complete DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (dmyMatch) {
      const parsed = parseFlexibleDate(raw);
      if (parsed) {
        const iso = toIsoDate(parsed);
        triggerOnChange(iso);
        return;
      }
    }

    if (!raw.trim()) {
      triggerOnChange('');
    }
  };

  const handleBlur = () => {
    if (!displayText.trim()) {
      setDisplayText('');
      triggerOnChange('');
      return;
    }

    const parsed = parseFlexibleDate(displayText);
    if (parsed) {
      const formatted = formatDate(parsed);
      setDisplayText(formatted);
      triggerOnChange(toIsoDate(parsed));
    } else {
      // If invalid, revert back to previous valid prop value
      setDisplayText(formatDate(value));
    }
  };

  const handleIconClick = () => {
    if (disabled) return;
    try {
      if (pickerRef.current && typeof pickerRef.current.showPicker === 'function') {
        pickerRef.current.showPicker();
      } else {
        pickerRef.current?.focus();
      }
    } catch {
      // Fallback: the overlay transparent input handles the click
    }
  };

  return (
    <div className="relative w-full flex items-center" style={{ position: 'relative', display: 'inline-flex', width: '100%', alignItems: 'center' }}>
      <input
        type="text"
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        value={displayText}
        onChange={handleTextChange}
        onBlur={handleBlur}
        className={className}
        style={{
          ...style,
          paddingRight: showCalendarIcon ? '2.2rem' : style.paddingRight
        }}
      />

      {showCalendarIcon && (
        <div
          onClick={handleIconClick}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"
          style={{
            position: 'absolute',
            right: '0.45rem',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 2,
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Select date"
        >
          <Calendar className="w-3.5 h-3.5 pointer-events-none" size={14} />
          <input
            type="date"
            ref={pickerRef}
            value={toIsoDate(value)}
            min={min ? toIsoDate(min) : undefined}
            max={max ? toIsoDate(max) : undefined}
            disabled={disabled}
            onChange={handlePickerChange}
            tabIndex={-1}
            aria-hidden="true"
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            style={{ fontSize: 0, border: 'none', background: 'transparent' }}
          />
        </div>
      )}
    </div>
  );
};
