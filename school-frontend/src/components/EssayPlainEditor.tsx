import { useRef, useState } from 'react';
import { FileUp, Loader2 } from 'lucide-react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  minRows?: number;
  className?: string;
};

/** Поле сочинения без T9/автокоррекции + вставка из Word (.docx) */
export default function EssayPlainEditor({
  value,
  onChange,
  readOnly = false,
  placeholder = 'Напишите сочинение здесь…',
  minRows = 16,
  className = '',
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleDocx = async (file: File) => {
    setImporting(true);
    try {
      const mammoth = await import('mammoth');
      const buffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      const text = (result.value || '').trim();
      if (text) onChange(text);
    } catch (err) {
      console.error('Ошибка чтения Word', err);
      alert('Не удалось прочитать файл. Загрузите .docx');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {!readOnly && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Можно вставить текст или загрузить Word
          </p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wide bg-gray-100 hover:bg-purple-50 text-gray-600 hover:text-purple-700 border border-gray-200 transition-colors disabled:opacity-50"
          >
            {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
            Word (.docx)
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleDocx(file);
            }}
          />
        </div>
      )}
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
        className={`w-full min-h-[180px] p-4 md:p-5 rounded-2xl border-2 font-medium text-gray-900 leading-relaxed resize-y outline-none transition-all font-serif text-base md:text-lg ${
          readOnly
            ? 'border-gray-100 bg-gray-50/80 opacity-90 cursor-default'
            : 'border-gray-200 bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
        } ${className}`}
        style={{ WebkitTextSizeAdjust: '100%' }}
      />
    </div>
  );
}
