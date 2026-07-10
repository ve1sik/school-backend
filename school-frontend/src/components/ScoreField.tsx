import { useEffect, useState } from 'react';

type Props = {
  value: number;
  max: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
};

/** Числовой ввод без стрелок — можно кликнуть и набрать балл с клавиатуры. */
export default function ScoreField({ value, max, onChange, className = '', placeholder = '0' }: Props) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (raw: string) => {
    if (raw === '') {
      setDraft('0');
      onChange(0);
      return;
    }
    const n = Math.min(max, Math.max(0, parseInt(raw, 10) || 0));
    setDraft(String(n));
    onChange(n);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={draft}
      placeholder={placeholder}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d]/g, '');
        setDraft(raw);
        if (raw !== '') {
          onChange(Math.min(max, Math.max(0, parseInt(raw, 10) || 0)));
        }
      }}
      onBlur={() => commit(draft)}
      onFocus={(e) => e.target.select()}
      className={`score-field-no-spin ${className}`}
    />
  );
}
