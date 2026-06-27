import { useRef } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  minRows?: number;
  className?: string;
};

/** Поле сочинения без T9/автокоррекции браузера */
export default function EssayPlainEditor({
  value,
  onChange,
  readOnly = false,
  placeholder = 'Напишите сочинение здесь…',
  minRows = 16,
  className = '',
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      readOnly={readOnly}
      placeholder={placeholder}
      rows={minRows}
      spellCheck={false}
      autoCorrect="off"
      autoCapitalize="off"
      autoComplete="off"
      inputMode="text"
      data-gramm="false"
      data-gramm_editor="false"
      data-enable-grammarly="false"
      className={`w-full p-4 md:p-5 rounded-2xl border-2 font-medium text-gray-900 leading-relaxed resize-y outline-none transition-all font-serif text-base md:text-lg ${
        readOnly
          ? 'border-gray-100 bg-gray-50/80 opacity-90 cursor-default'
          : 'border-gray-200 bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
      } ${className}`}
      style={{ WebkitTextSizeAdjust: '100%' }}
    />
  );
}
