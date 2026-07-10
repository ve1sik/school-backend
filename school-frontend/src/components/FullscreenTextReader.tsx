import { useEffect } from 'react';
import { Maximize2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

type Props = {
  text: string;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
  fontClassName?: string;
};

export function FullscreenTextReader({ text, title = 'Текст', isOpen, onClose, fontClassName = 'font-serif' }: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[500] bg-[#0f172a]/95 flex flex-col"
        >
          <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
            <p className="text-sm font-black text-white uppercase tracking-widest truncate">{title}</p>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className={`text-white text-base md:text-lg leading-relaxed whitespace-pre-wrap max-w-4xl mx-auto ${fontClassName}`}>
              {text}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type ExpandButtonProps = {
  onClick: () => void;
  label?: string;
};

export function ExpandTextButton({ onClick, label = 'На весь экран' }: ExpandButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200 transition-colors"
    >
      <Maximize2 className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
