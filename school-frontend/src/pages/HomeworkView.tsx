import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Loader2, CheckCircle2, Clock, PenTool, CheckSquare, 
  XCircle, Type, PlayCircle, FileDown, Link2, ExternalLink, 
  Image as ImageIcon, BookOpen, X, FileSignature, ListTodo, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const API_URL = 'https://prepodmgy.ru/api';

const getFullUrl = (url: string) => {
  if (!url) return '';
  let finalUrl = url;
  if (finalUrl.startsWith('http://prepodmgy.ru')) {
    finalUrl = finalUrl.replace('http://', 'https://');
  }
  if (finalUrl.startsWith('http')) return finalUrl;
  const cleanPath = finalUrl.startsWith('/') ? finalUrl.slice(1) : finalUrl;
  if (cleanPath.startsWith('uploads/')) {
    return `https://prepodmgy.ru/${cleanPath}`;
  }
  return `${API_URL}/${cleanPath}`;
};

const getEmbedUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('vk.com/video_ext.php')) return url;
  if (url.includes('youtube.com/watch?v=')) return url.replace('watch?v=', 'embed/');
  if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'youtube.com/embed/');
  return url;
};

const safeHtml = (text: any) => {
  if (!text || typeof text !== 'string') return '';
  return text;
};

const getSafeLocal = (key: string, fallback: any) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) || fallback : fallback;
  } catch (e) {
    return fallback;
  }
};

const studentQuillModules = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['clean']
  ],
};

function shuffleArray(array: any[]) {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

function ExpandableImage({ src, alt, className = '' }: { src: string, alt?: string, className?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <div className={`relative ${className} w-full flex justify-start`}>
      <img 
        src={src} 
        alt={alt || "Изображение"} 
        onClick={(e) => { e.preventDefault(); setIsExpanded(!isExpanded); }}
        className={`bg-white cursor-pointer transition-all duration-500 ease-in-out origin-top-left rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:ring-2 hover:ring-purple-300/50 ${
          isExpanded ? 'w-full max-h-[85vh] object-contain object-left' : 'max-w-[280px] sm:max-w-sm max-h-[300px] object-contain object-left'
        }`} 
        title={isExpanded ? "Нажмите, чтобы уменьшить" : "Нажмите, чтобы увеличить"}
      />
    </div>
  );
}

const TaskGroup = ({ group, testAnswers, testResults, attemptsUsed, handleAnswerToggle, handleTextAnswerChange, handleMatchingChange, handleSubmitTest, submissions }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => { if (!isOpen) setActiveStep(0); }, [isOpen]);

  if (!isOpen) {
    return (
      <div className="bg-white border border-gray-100 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-md hover:border-gray-200 mb-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${group.iconColor}`}>
            <group.Icon className="w-6 h-6" />
          </div>
          <div className="min-w-0 pr-4">
            <h4 className="font-black text-gray-900 text-lg leading-tight">{group.title}</h4>
            <p className="text-sm font-medium text-gray-500 mt-1">{group.blocks?.length || 0} заданий внутри</p>
          </div>
        </div>
        <button onClick={() => setIsOpen(true)} className="shrink-0 px-8 py-3.5 rounded-xl font-black text-sm transition-all active:scale-95 bg-gray-900 text-white hover:bg-black shadow-sm tracking-wide">
          Приступить
        </button>
      </div>
    );
  }

  const block = group.blocks[activeStep];
  if (!block) return null;

  const selected = Array.isArray(testAnswers?.[block.id]) ? testAnswers[block.id] : [];
  const serverSubmission = submissions?.find((s: any) => s.blockId === block.id || s.block_id === block.id);
  
  let result = testResults?.[block.id];
  let currentAttempts = attemptsUsed?.[block.id] || 0;
  const maxAttempts = block.maxAttempts || 3;
  const maxScore = block.maxScore || 3;

  if (serverSubmission) {
    if (serverSubmission.status === 'GRADED') {
      if (['test', 'test_short', 'matching'].includes(block.type)) {
        if (Number(serverSubmission.score) > 0) {
          result = 'SUCCESS';
        } else {
          result = 'ERROR';
          currentAttempts = maxAttempts; 
        }
      } else {
        result = 'GRADED';
      }
    } else if (serverSubmission.status === 'REVIEW' || serverSubmission.status === 'PENDING') {
      result = 'PENDING';
    }
  }

  const attemptsLeft = maxAttempts - currentAttempts;
  const isExhausted = attemptsLeft <= 0;
  const isLocked = isExhausted || result === 'SUCCESS' || result === 'PENDING' || result === 'GRADED';

  let isMatchingReady = false;
  if (block.type === 'matching' && block.pairs) {
    isMatchingReady = selected.length === block.pairs.length && selected.every((s: string) => {
      const parts = s.split('|||');
      return parts.length === 2 && parts[1] && parts[1].trim() !== '';
    });
  }

  let inputStateClass = 'bg-white border-gray-100 focus:border-[#A855F7] focus:shadow-sm text-gray-900';
  if (isLocked) {
     if (result === 'SUCCESS' || (result === 'GRADED' && Number(serverSubmission?.score) > 0)) {
         inputStateClass = 'bg-emerald-50 border-emerald-400 text-emerald-700';
     } else if (result === 'ERROR' || (result === 'GRADED' && Number(serverSubmission?.score) === 0)) {
         inputStateClass = 'bg-red-50 border-red-400 text-red-700';
     } else {
         inputStateClass = 'bg-gray-50 border-gray-200 text-gray-500';
     }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-[2rem] p-6 md:p-8 relative shadow-lg shadow-gray-200/50 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h4 className="font-black text-xl text-gray-900 flex items-center gap-3">
          <group.Icon className={`w-6 h-6 ${group.iconColor?.split(' ')[1] || ''}`} />
          {group.title}
        </h4>
        <button onClick={() => setIsOpen(false)} className="p-2.5 text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200/50 shadow-sm">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2.5 mb-8">
        {group.blocks.map((b: any, i: number) => {
          const sSub = submissions?.find((s: any) => s.blockId === b.id || s.block_id === b.id);
          let bRes = testResults?.[b.id];
          let bAttempts = attemptsUsed?.[b.id] || 0;
          
          if (sSub) {
            if (sSub.status === 'GRADED') {
              if (['test', 'test_short', 'matching'].includes(b.type)) {
                if (Number(sSub.score) > 0) bRes = 'SUCCESS';
                else { bRes = 'ERROR'; bAttempts = b.maxAttempts || 3; }
              } else {
                bRes = 'GRADED';
              }
            } else if (sSub.status === 'REVIEW' || sSub.status === 'PENDING') {
              bRes = 'PENDING';
            }
          }

          const isActive = i === activeStep;
          let circleClass = "w-11 h-11 rounded-full flex items-center justify-center font-black text-sm transition-all border-2 ";
          
          if (isActive) {
            circleClass += "bg-[#A855F7] border-[#A855F7] text-white shadow-lg shadow-purple-500/30 scale-110";
          } else if (bRes === 'SUCCESS' || bRes === 'GRADED') {
            circleClass += "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100";
          } else if (bRes === 'ERROR' && bAttempts >= (b.maxAttempts || 3)) {
            circleClass += "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100";
          } else if (bRes === 'PENDING') {
            circleClass += "bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100";
          } else {
            circleClass += "bg-white border-gray-200 text-gray-500 hover:border-[#A855F7] hover:text-[#A855F7]";
          }

          return (
            <button key={b.id} onClick={() => setActiveStep(i)} className={circleClass}>{i + 1}</button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="px-3 py-1.5 rounded-md bg-purple-50 text-purple-600 text-[10px] font-black uppercase tracking-widest">
          Вопрос {activeStep + 1}
        </div>
        {block.type !== 'written' && (
          <div className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest ${isExhausted && result !== 'SUCCESS' ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-500'}`}>
            Попыток: {attemptsLeft} из {maxAttempts}
          </div>
        )}
        <div className="px-3 py-1.5 rounded-md bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest">
          Макс. балл: {maxScore}
        </div>
        {block.source && (
          <div className="px-3 py-1.5 rounded-md bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest border border-amber-100">
            Источник: {block.source}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {result === 'ERROR' && !isExhausted && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-[#FF4A6B]/10 border border-[#FF4A6B]/20 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between font-bold mb-6 gap-2 text-[#FF4A6B]">
            <span className="flex items-center gap-2 text-lg"><XCircle className="w-6 h-6" /> Ошибка!</span>
            <span className="text-sm bg-white/50 px-3 py-1 rounded-lg">Используй вторую попытку ❤️</span>
          </motion.div>
        )}
        {result === 'ERROR' && isExhausted && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between font-bold mb-6 gap-2 text-rose-600">
            <span className="flex items-center gap-2 text-lg"><XCircle className="w-6 h-6" /> Попытки закончились</span>
            <span className="text-sm bg-white px-3 py-1 rounded-lg shadow-sm border border-rose-100 text-rose-700">Балл: 0 / {maxScore} 💔</span>
          </motion.div>
        )}
        {result === 'SUCCESS' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between font-bold mb-6 text-emerald-600 gap-2">
            <span className="flex items-center gap-2 text-lg"><CheckCircle2 className="w-6 h-6" /> Верно!</span>
            <span className="text-sm bg-white px-3 py-1 rounded-lg shadow-sm border border-emerald-50 text-emerald-700">Балл: {maxScore} / {maxScore} 🌟</span>
          </motion.div>
        )}
        {result === 'PENDING' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-purple-50 border border-purple-100 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between font-bold mb-6 text-purple-600 gap-2">
            <span className="flex items-center gap-2 text-lg"><Clock className="w-6 h-6" /> Отправлено</span>
            <span className="text-sm bg-white px-3 py-1 rounded-lg shadow-sm border border-purple-50">Ожидает проверки ⏳</span>
          </motion.div>
        )}
        {result === 'GRADED' && serverSubmission && (
           <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-emerald-50 border-2 border-emerald-200 p-5 rounded-xl mb-6 shadow-sm">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between font-black text-emerald-600 gap-3 mb-4">
               <span className="flex items-center gap-2 text-xl"><CheckCircle2 className="w-7 h-7" /> Работа проверена!</span>
               <span className="text-lg bg-white px-4 py-2 rounded-xl shadow-sm border border-emerald-100 flex items-center gap-2">
                 Оценка: <span className="text-emerald-700 text-2xl font-black">{serverSubmission.score}</span> / <span className="text-emerald-500 text-lg">{serverSubmission.max_score || maxScore}</span>
               </span>
             </div>
             {serverSubmission.comment && (
               <div className="p-4 bg-white rounded-xl text-sm text-gray-800 font-medium border border-emerald-100/50 shadow-inner">
                 <strong className="text-emerald-700 block mb-1 uppercase tracking-wider text-[11px]">Комментарий куратора:</strong>
                 {serverSubmission.comment}
               </div>
             )}
           </motion.div>
        )}
      </AnimatePresence>

      <div className="ql-snow w-full">
        <div 
          className="ql-editor !p-0 text-lg md:text-xl font-bold text-gray-900 mb-6 leading-relaxed break-words" 
          dangerouslySetInnerHTML={{ __html: safeHtml(block.question) }} 
        />
      </div>
      
      {(block.questionImage || block.image) && (
        <ExpandableImage src={getFullUrl(block.questionImage || block.image)} alt="Схема" className="mb-8" />
      )}

      <div className="space-y-3 mb-8">
        {block.type === 'test' && Array.isArray(block.options) && block.options.map((opt: any, idx: number) => {
          const isChecked = selected.includes(opt.text) || (typeof serverSubmission?.answer === 'string' && serverSubmission.answer.includes(opt.text));
          let optClass = "flex items-center gap-4 p-4 md:p-5 rounded-2xl border-2 transition-all cursor-pointer relative ";
          let textClass = "font-bold text-base break-words ";
          
          let showGreenCheck = false;
          let showRedCross = false;

          // 🔥 ИДЕАЛЬНАЯ ПОДСВЕТКА ВАРИАНТОВ (Красный крест/Зеленая галочка)
          if (result === 'SUCCESS' || (result === 'GRADED' && Number(serverSubmission?.score) > 0)) {
            if (isChecked) {
              optClass += "border-emerald-500 bg-emerald-50/30 text-emerald-900";
              showGreenCheck = true;
            } else {
              optClass += "border-gray-100 bg-white opacity-60 text-gray-400";
            }
          } else if (isExhausted) {
             // Лимит исчерпан - показываем правильные и зачеркиваем неправильные
             if (opt.isCorrect) {
               optClass += "border-emerald-500 bg-emerald-50/30 text-emerald-900"; 
               showGreenCheck = true;
             } else if (isChecked && !opt.isCorrect) {
               optClass += "border-[#FF4A6B] bg-[#FF4A6B]/5"; 
               textClass += "text-[#FF4A6B] line-through opacity-70"; 
               showRedCross = true;
             } else {
               optClass += "border-gray-100 bg-white opacity-60 text-gray-400";
             }
          } else if (result === 'ERROR') {
             if (isChecked) {
               optClass += "border-red-400 bg-red-50 text-red-700";
             } else {
               optClass += "border-gray-100 bg-white hover:border-gray-200 text-gray-600";
             }
          } else {
             if (isChecked) {
               optClass += "border-[#A855F7] bg-purple-50/20 shadow-sm text-gray-900";
             } else {
               optClass += "border-gray-100 hover:border-gray-200 bg-white text-gray-600";
             }
          }

          if (isLocked) optClass += " opacity-90 pointer-events-none";

          return (
            <label key={idx} className={optClass}>
              <div className="relative flex items-center justify-center w-6 h-6 shrink-0">
                <input type="checkbox" checked={isChecked} disabled={isLocked} onChange={() => { if (!isLocked) handleAnswerToggle(block.id, opt.text); }} className="peer w-6 h-6 rounded border-2 border-gray-300 appearance-none checked:bg-[#A855F7] checked:border-[#A855F7] transition-all cursor-pointer" />
                <CheckSquare className="w-3.5 h-3.5 text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
              </div>
              <span className={textClass}>{opt.text}</span>
              
              {showGreenCheck && (
                <div className="ml-auto bg-emerald-500 text-white rounded-full p-1 shadow-md shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
              {showRedCross && (
                <div className="ml-auto bg-[#FF4A6B] text-white rounded-full p-1 shadow-md shrink-0">
                  <X className="w-4 h-4" />
                </div>
              )}
            </label>
          );
        })}

        {block.type === 'test_short' && (
          <div className="space-y-3">
            <input 
              type="text" 
              value={serverSubmission?.answer || selected[0] || ''} 
              onChange={(e) => { if (!isLocked) handleTextAnswerChange(block.id, e.target.value); }} 
              disabled={isLocked}
              placeholder="Введите ответ" 
              className={`w-full p-5 text-lg font-bold rounded-2xl border-2 transition-all outline-none ${inputStateClass}`}
            />
            {isExhausted && result !== 'SUCCESS' && (
               <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-2">
                 <CheckCircle2 className="w-5 h-5" /> Правильный ответ: {block.correctAnswers?.join(' / ')}
               </motion.div>
            )}
          </div>
        )}

        {/* 🔥 ИДЕАЛЬНАЯ ТАБЛИЦА В ЛИНЕЙКУ (Стрелочки + Зачеркивание) */}
        {block.type === 'matching' && block.pairs && (
          <div className="space-y-4 w-full overflow-x-auto custom-scrollbar pb-4 pt-2">
            <div className="flex gap-3 min-w-max">
              {block.pairs.map((pair: any, idx: number) => {
                const currentSelectedPair = selected.find((s: string) => s.startsWith(`${pair.left}|||`));
                const currentRightValue = currentSelectedPair ? currentSelectedPair.split('|||')[1] : '';

                let displayRightValue = currentRightValue;
                if (serverSubmission && serverSubmission.answer) {
                   const serverPairs = serverSubmission.answer.split(', ');
                   const serverMatch = serverPairs.find((s: string) => s.startsWith(`${pair.left} - `));
                   if (serverMatch) displayRightValue = serverMatch.split(' - ')[1];
                }

                const isCorrectPair = displayRightValue.toLowerCase().trim() === pair.right.toLowerCase().trim();

                let tBorderClass = 'border-gray-200';
                let tInputClass = 'bg-white focus:border-purple-400 text-purple-700';
                
                if (isLocked) {
                   if (result === 'SUCCESS' || (result === 'GRADED' && Number(serverSubmission?.score) > 0)) {
                       tBorderClass = 'border-emerald-400';
                       tInputClass = 'bg-emerald-50 text-emerald-700 font-bold';
                   } else if (isExhausted) {
                       if (isCorrectPair) {
                         tBorderClass = 'border-emerald-400';
                         tInputClass = 'bg-emerald-50 text-emerald-700 font-bold';
                       } else {
                         tBorderClass = 'border-red-400';
                         tInputClass = 'bg-red-50 text-red-700 font-bold';
                       }
                   } else if (result === 'ERROR' || (result === 'GRADED' && Number(serverSubmission?.score) === 0)) {
                       tBorderClass = 'border-red-400';
                       tInputClass = 'bg-red-50 text-red-700 font-bold';
                   } else {
                       tBorderClass = 'border-gray-200';
                       tInputClass = 'bg-gray-50 text-gray-500';
                   }
                }

                return (
                  <div key={idx} className="flex flex-col gap-2 w-32 shrink-0">
                    <div className={`flex flex-col border-2 rounded-xl overflow-hidden transition-all shadow-sm ${tBorderClass}`}>
                      <div className="bg-gray-100 p-2 text-center font-black text-gray-800 border-b-2 border-inherit flex items-center justify-center min-h-[3rem] break-words px-2">
                        {pair.left}
                      </div>
                      <input
                        id={`matching-${block.id}-${idx}`}
                        type="text"
                        disabled={isLocked}
                        value={displayRightValue}
                        onChange={(e) => {
                          if (!isLocked) handleMatchingChange(block.id, pair.left, e.target.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowRight' && (e.currentTarget.selectionStart === e.currentTarget.value.length || e.currentTarget.value === '')) {
                            e.preventDefault();
                            const nextInput = document.getElementById(`matching-${block.id}-${idx + 1}`);
                            if (nextInput) nextInput.focus();
                          } else if (e.key === 'ArrowLeft' && (e.currentTarget.selectionStart === 0 || e.currentTarget.value === '')) {
                            e.preventDefault();
                            const prevInput = document.getElementById(`matching-${block.id}-${idx - 1}`);
                            if (prevInput) prevInput.focus();
                          }
                        }}
                        placeholder=""
                        className={`w-full p-4 text-center font-bold text-lg outline-none transition-all ${tInputClass} ${isExhausted && !isCorrectPair ? 'line-through opacity-70' : ''}`}
                      />
                    </div>
                    {isExhausted && !isCorrectPair && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center bg-emerald-50 text-emerald-700 font-bold text-[11px] uppercase tracking-wider py-1.5 px-2 rounded-lg border border-emerald-200">
                        Ответ: <span className="text-sm ml-1 text-emerald-900">{pair.right}</span>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {block.type === 'written' && (
          <div className="flex flex-col gap-2 relative">
            {isLocked && serverSubmission && (
               <div className="absolute inset-0 z-10 bg-transparent cursor-not-allowed"></div>
            )}
            <ReactQuill 
              theme="snow"
              modules={studentQuillModules}
              value={serverSubmission?.answer || selected[0] || ''} 
              onChange={(val) => { 
                if (!isLocked && val !== selected[0]) {
                  handleTextAnswerChange(block.id, val);
                }
              }}
              readOnly={isLocked}
              placeholder="Введите развернутый ответ..." 
              className={`bg-white rounded-2xl overflow-hidden border transition-all ${isLocked ? 'border-gray-100 opacity-80' : 'border-gray-200 focus-within:border-[#A855F7] focus-within:ring-2 focus-within:ring-[#A855F7]/20'}`}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 pt-6 border-t border-gray-100">
        <button 
          type="button"
          onClick={(e) => { e.preventDefault(); handleSubmitTest(block); }} 
          disabled={block.type === 'matching' ? (!isMatchingReady || isLocked) : (selected.length === 0 || selected[0] === '' || selected[0] === '<p><br></p>' || isLocked)} 
          className={`w-full sm:w-auto px-10 py-4 rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-50 tracking-wide uppercase ${isExhausted && block.type !== 'written' ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : result === 'ERROR' ? 'bg-[#FF4A6B] hover:bg-red-500 text-white shadow-lg shadow-red-500/30' : result === 'GRADED' ? 'bg-emerald-500 text-white cursor-not-allowed' : 'bg-[#A855F7] hover:bg-[#9333EA] text-white shadow-lg shadow-purple-500/30'}`}
        >
          {result === 'PENDING' ? 'НА ПРОВЕРКЕ' : result === 'GRADED' ? 'ОЦЕНЕНО' : (isExhausted && block.type !== 'written' ? 'ЛИМИТ ИСЧЕРПАН' : result === 'ERROR' ? 'ЕЩЕ РАЗ' : 'ОТВЕТИТЬ')}
        </button>
        
        <div className="flex-1 w-full flex justify-end gap-3">
          {activeStep > 0 && (
            <button onClick={() => setActiveStep(p => p - 1)} className="px-6 py-4 rounded-xl font-bold text-sm bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors">НАЗАД</button>
          )}
          {activeStep < group.blocks.length - 1 && (
            <button onClick={() => setActiveStep(p => p + 1)} className="px-6 py-4 rounded-xl font-bold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
              {isLocked || result === 'SUCCESS' || result === 'GRADED' ? 'ДАЛЕЕ' : 'ПРОПУСТИТЬ'}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {(isLocked || isExhausted) && block.explanation && (
          <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 24 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} className="bg-purple-50/50 border border-purple-100 rounded-2xl p-6 overflow-hidden">
            <h5 className="flex items-center gap-2 text-purple-700 font-black text-sm uppercase tracking-widest mb-4">
              <BookOpen className="w-5 h-5" /> Разбор задания
            </h5>
            <div className="ql-snow w-full">
              <div className="ql-editor !p-0 text-sm text-gray-800" dangerouslySetInnerHTML={{ __html: safeHtml(block.explanation) }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function HomeworkView() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [homework, setHomework] = useState<any>(null);
  
  const [hwBlocks, setHwBlocks] = useState<any[]>([]); 
  const [hwTheoryBlocks, setHwTheoryBlocks] = useState<any[]>([]);
  const [hwGroups, setHwGroups] = useState<any[]>([]);

  const [testAnswers, setTestAnswers] = useState<Record<string, string[]>>(() => getSafeLocal('demo_answers', {}));
  const [testResults, setTestResults] = useState<Record<string, 'SUCCESS' | 'ERROR' | 'PENDING' | 'GRADED'>>(() => getSafeLocal('demo_results', {}));
  const [attemptsUsed, setAttemptsUsed] = useState<Record<string, number>>(() => getSafeLocal('demo_attempts', {}));
  
  const [submissions, setSubmissions] = useState<any[]>([]);

  useEffect(() => {
    const fetchHomework = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return navigate('/login');

        const [coursesRes, subsRes] = await Promise.all([
          axios.get(`${API_URL}/courses`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/submissions/my`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
        ]);

        setSubmissions(Array.isArray(subsRes.data) ? subsRes.data : []);

        let foundLesson = null;
        coursesRes.data.forEach((course: any) => {
          course.themes?.forEach((theme: any) => {
            theme.lessons?.forEach((lesson: any) => {
              if (lesson.id === id) {
                foundLesson = lesson;
                foundLesson.themeTitle = theme.title;
              }
            });
          });
        });

        if (foundLesson) {
          setHomework(foundLesson);
          
          if (foundLesson.content) {
            try {
              const parsed = JSON.parse(foundLesson.content.trim());
              if (Array.isArray(parsed)) {
                const homeworkContent = parsed.filter(b => b.isHomework);
                setHwBlocks(homeworkContent);

                const theory = homeworkContent.filter(b => !['test', 'test_short', 'written', 'matching'].includes(b.type));
                const interactive = homeworkContent.filter(b => ['test', 'test_short', 'written', 'matching'].includes(b.type));

                setHwTheoryBlocks(theory);

                const groups = [
                  { type: 'tests', title: 'Тесты', blocks: [] as any[], Icon: CheckSquare, iconColor: 'bg-indigo-50 text-indigo-600' },
                  { type: 'written', title: 'Развернутый ответ', blocks: [] as any[], Icon: PenTool, iconColor: 'bg-purple-50 text-purple-600' }
                ];

                interactive.forEach(b => {
                  if (['test', 'test_short', 'matching'].includes(b.type)) {
                    groups.find(g => g.type === 'tests')?.blocks.push(b);
                  } else if (b.type === 'written') {
                    groups.find(g => g.type === 'written')?.blocks.push(b);
                  }
                });

                setHwGroups(groups.filter(g => g.blocks.length > 0));
              }
            } catch(e) {}
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки задания:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomework();
  }, [id, navigate]);

  const handleAnswerToggle = (blockId: string, answerText: string) => {
    const current = Array.isArray(testAnswers?.[blockId]) ? testAnswers[blockId] : [];
    const updated = current.includes(answerText) ? current.filter((a: string) => a !== answerText) : [...current, answerText];
    const newAnswers = { ...testAnswers, [blockId]: updated };
    setTestAnswers(newAnswers);
    localStorage.setItem('demo_answers', JSON.stringify(newAnswers));

    if (testResults?.[blockId] === 'ERROR') {
      const newResults = { ...testResults };
      delete newResults[blockId];
      setTestResults(newResults);
      localStorage.setItem('demo_results', JSON.stringify(newResults));
    }
  };

  const handleTextAnswerChange = (blockId: string, text: string) => {
    const newAnswers = { ...testAnswers, [blockId]: [text] };
    setTestAnswers(newAnswers);
    localStorage.setItem('demo_answers', JSON.stringify(newAnswers));

    if (testResults?.[blockId] === 'ERROR') {
      const newResults = { ...testResults };
      delete newResults[blockId];
      setTestResults(newResults);
      localStorage.setItem('demo_results', JSON.stringify(newResults));
    }
  };

  const handleMatchingChange = (blockId: string, leftText: string, rightText: string) => {
    const current = Array.isArray(testAnswers?.[blockId]) ? [...testAnswers[blockId]] : [];
    const filtered = current.filter((ans: string) => !ans.startsWith(`${leftText}|||`));
    filtered.push(`${leftText}|||${rightText}`);
    
    const newAnswers = { ...testAnswers, [blockId]: filtered };
    setTestAnswers(newAnswers);
    localStorage.setItem('demo_answers', JSON.stringify(newAnswers));

    if (testResults?.[blockId] === 'ERROR') {
      const newResults = { ...testResults };
      delete newResults[blockId];
      setTestResults(newResults);
      localStorage.setItem('demo_results', JSON.stringify(newResults));
    }
  };

  const handleSubmitTest = async (block: any) => {
    let currentAttempts = attemptsUsed?.[block.id] || 0;
    const maxAttempts = block.maxAttempts || 3;
    
    if (!['written', 'homework'].includes(block.type) && currentAttempts >= maxAttempts) return; 

    const selected = Array.isArray(testAnswers?.[block.id]) ? testAnswers[block.id] : [];
    let isSuccess = false;
    let isPending = false;
    let finalAnswerString = selected.join(', ');

    const img = block.questionImage || block.image;
    const questionWithImage = img ? `${block.question}|||IMG|||${img}` : block.question;

    if (['written', 'homework'].includes(block.type)) {
      isPending = true;
      finalAnswerString = selected[0] || '';
    } else if (block.type === 'test') {
      const correctOptions = Array.isArray(block.options) ? block.options.filter((opt: any) => opt.isCorrect).map((opt: any) => opt.text) : [];
      // 🔥 ЖЕСТКАЯ ПРОВЕРКА ДЛЯ ТЕСТОВ (Все правильные и ни одного лишнего)
      isSuccess = correctOptions.length > 0 && 
                  selected.length === correctOptions.length && 
                  selected.every((val: string) => correctOptions.includes(val));
    } else if (block.type === 'test_short') {
      const userAnswer = (selected[0] || '').trim();
      finalAnswerString = userAnswer;
      if (block.ignoreTypos !== false) {
        const cleanUser = userAnswer.toLowerCase().replace(/ё/g, 'е');
        isSuccess = (block.correctAnswers || []).some((ans: string) => ans.trim().toLowerCase().replace(/ё/g, 'е') === cleanUser);
      } else {
        isSuccess = (block.correctAnswers || []).some((ans: string) => ans.trim() === userAnswer);
      }
    } else if (block.type === 'matching') {
      const userAnswersMap: Record<string, string> = {};
      selected.forEach((s: string) => {
        const parts = s.split('|||');
        if (parts.length === 2) userAnswersMap[parts[0]] = parts[1].trim();
      });

      isSuccess = block.pairs.every((pair: any) => {
        const studentAns = (userAnswersMap[pair.left] || '').toLowerCase().trim();
        const correctAns = (pair.right || '').toLowerCase().trim();
        return studentAns === correctAns;
      });
      finalAnswerString = Object.entries(userAnswersMap).map(([k, v]) => `${k} - ${v}`).join(', ');
    }
    
    let newResultState = isPending ? 'PENDING' : (isSuccess ? 'SUCCESS' : 'ERROR');

    if (!['written', 'homework'].includes(block.type)) {
      currentAttempts += 1;
      const newAttempts = { ...attemptsUsed, [block.id]: currentAttempts };
      setAttemptsUsed(newAttempts);
      localStorage.setItem('demo_attempts', JSON.stringify(newAttempts));

      const isNowExhausted = currentAttempts >= maxAttempts;

      if (isSuccess || isNowExhausted) {
        try {
          const token = localStorage.getItem('token');
          const res = await axios.post(`${API_URL}/submissions`, {
            lessonId: homework.id,
            blockId: block.id,
            question: questionWithImage,
            answer: finalAnswerString,
            maxScore: block.maxScore || 100
          }, { headers: { Authorization: `Bearer ${token}` } });

          if (res.data && res.data.id) {
            const finalScore = isSuccess ? (block.maxScore || 100) : 0;
            const comment = isSuccess ? '🤖 Автоматическая проверка: Верно!' : '🤖 Автоматическая проверка: Неверно. Попытки исчерпаны.';
            
            await axios.patch(`${API_URL}/submissions/${res.data.id}/grade`, {
              score: finalScore,
              comment: comment
            });

            setSubmissions(prev => [
              ...prev.filter(s => s.blockId !== block.id && s.block_id !== block.id),
              { blockId: block.id, status: 'GRADED', score: finalScore, answer: finalAnswerString, comment }
            ]);
          }
        } catch (error) {}
      }
    } else {
      try {
        await axios.post(`${API_URL}/submissions`, {
          lessonId: homework.id,
          blockId: block.id,
          question: questionWithImage,
          answer: finalAnswerString,
          maxScore: block.maxScore || 10
        }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        
        setSubmissions(prev => [
          ...prev.filter(s => s.blockId !== block.id && s.block_id !== block.id),
          { blockId: block.id, status: newResultState, answer: finalAnswerString }
        ]);
      } catch (err) {}
    }

    const newResults = { ...testResults, [block.id]: newResultState };
    setTestResults(newResults);
    localStorage.setItem('demo_results', JSON.stringify(newResults));
  };

  const renderTheoryBlock = (block: any) => {
    if (block.type === 'video_file' && block.url) {
      return (
        <div key={block.id} className="space-y-3">
          {block.title && <h3 className="text-xl font-black text-gray-900 break-words">{block.title}</h3>}
          <div className="bg-black rounded-[1.5rem] overflow-hidden shadow-lg border border-gray-100 relative w-full flex justify-center">
            <video src={getFullUrl(block.url)} controls playsInline preload="metadata" className="w-full max-h-[70vh] object-contain outline-none" />
          </div>
        </div>
      );
    }

    if (block.type === 'video' && block.url) {
      const isDirect = block.url.toLowerCase().match(/\.(mp4|mov|webm)$/) || block.url.includes('uploads/');
      if (isDirect) {
        return (
          <div key={block.id} className="space-y-3">
            {block.title && <h3 className="text-xl font-black text-gray-900 break-words">{block.title}</h3>}
            <div className="bg-black rounded-[1.5rem] overflow-hidden shadow-lg border border-gray-100 relative w-full flex justify-center">
              <video src={getFullUrl(block.url)} controls playsInline preload="metadata" className="w-full max-h-[70vh] object-contain outline-none" />
            </div>
          </div>
        );
      }
      
      return (
        <div key={block.id} className="space-y-3">
          {block.title && <h3 className="text-xl font-black text-gray-900 break-words">{block.title}</h3>}
          <div className="aspect-video bg-gray-900 rounded-[1.5rem] overflow-hidden shadow-lg relative border border-gray-100">
            <iframe src={getEmbedUrl(block.url)} className="w-full h-full absolute inset-0" allowFullScreen allow="autoplay; fullscreen; picture-in-picture; encrypted-media"></iframe>
          </div>
        </div>
      );
    }

    if (block.type === 'text' || block.type === 'paragraph') return (
      <div key={block.id} className="space-y-3 w-full overflow-hidden">
        {block.title && <h3 className="text-xl font-black text-gray-900 break-words">{block.title}</h3>}
        {(block.image || block.url) && <ExpandableImage src={getFullUrl(block.image || block.url)} alt="Материал" className="my-4" />}
        {/* 🔥 ВЫВОДИМ ЧЕРЕЗ САМ QUILL В РЕЖИМЕ ЧТЕНИЯ ДЛЯ 100% СОВПАДЕНИЯ С АДМИНКОЙ */}
        <div className="text-gray-800 leading-relaxed theory-read-only">
          <ReactQuill 
            theme="snow"
            value={block.content || ''}
            readOnly={true}
            modules={{ toolbar: false }}
          />
        </div>
      </div>
    );

    if (block.type === 'image' || block.type === 'img') return (
      <div key={block.id}>
        {(block.url || block.image) && <ExpandableImage src={getFullUrl(block.url || block.image)} alt="Изображение" className="my-4" />}
      </div>
    );

    if (block.type === 'file' && block.url) return (
      <div key={block.id} className="bg-cyan-50/50 border border-cyan-100 rounded-[1.5rem] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-cyan-50">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center shrink-0"><FileDown className="w-6 h-6 text-cyan-600" /></div>
          <div className="min-w-0">
            <h3 className="text-lg font-black text-gray-900 leading-tight break-words">{block.title || 'Файл для скачивания'}</h3>
            {block.content && (
               <div className="ql-snow w-full mt-1">
                 <div className="ql-editor !p-0 text-sm font-medium text-gray-600 break-words" dangerouslySetInnerHTML={{ __html: safeHtml(block.content) }} />
               </div>
            )}
          </div>
        </div>
        <a href={getFullUrl(block.url)} target="_blank" rel="noopener noreferrer" download className="shrink-0 w-full sm:w-auto px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2">
          <FileDown className="w-4 h-4" /> СКАЧАТЬ
        </a>
      </div>
    );

    if ((block.type === 'link' || block.type === 'button') && block.url) return (
      <div key={block.id} className="bg-pink-50/50 border border-pink-100 rounded-[1.5rem] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-pink-50">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center shrink-0"><Link2 className="w-6 h-6 text-pink-600" /></div>
          <div className="min-w-0">
            <h3 className="text-lg font-black text-gray-900 leading-tight break-words">{block.title || 'Полезная ссылка'}</h3>
            <p className="text-xs text-gray-500 truncate">{block.url}</p>
          </div>
        </div>
        <a href={block.url} target="_blank" rel="noopener noreferrer" className="shrink-0 w-full sm:w-auto px-8 py-4 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95">
          {block.buttonText || 'ОТКРЫТЬ'} <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    );
    return null;
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F4F7FE]">
        <Loader2 className="w-12 h-12 animate-spin text-[#A855F7]" />
      </div>
    );
  }

  if (!homework || hwBlocks.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#F4F7FE]">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">В этом уроке нет домашнего задания</h2>
        <button onClick={() => navigate(-1)} className="text-[#A855F7] font-bold hover:underline">Вернуться назад</button>
      </div>
    );
  }

  // 🔥 ИДЕАЛЬНАЯ СЕТКА: Выровнено с боковой панелью
  return (
    <div className="flex h-screen bg-[#F4F7FE] font-sans text-gray-900 p-4 md:p-6 lg:p-8 gap-4 lg:gap-8 overflow-hidden">
      <style>{`
        .ql-editor { 
          min-height: auto !important; 
          font-family: inherit !important; 
          font-size: 16px !important; 
          word-break: normal !important; 
          overflow-wrap: break-word !important; 
          white-space: normal !important;
          padding: 0 !important;
        }
        .ql-editor p { margin-bottom: 0.75em !important; line-height: 1.6 !important; }
        .ql-editor img { max-width: 100% !important; border-radius: 1rem !important; margin: 1rem 0 !important; }
        .ql-align-center { text-align: center !important; }
        .ql-align-right { text-align: right !important; }
        .ql-align-justify { text-align: justify !important; }
        .ql-editor ol, .ql-editor ul { padding-left: 1.5em !important; margin-bottom: 1em !important; }
        .ql-editor li { margin-bottom: 0.5em !important; }
      `}</style>

      {/* ЛЕВЫЙ САЙДБАР: Формат плашки, как в CourseView */}
      <aside className="w-[300px] lg:w-[340px] bg-white rounded-[2rem] border border-gray-100 flex flex-col h-full shrink-0 z-20 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 border-b border-gray-100 bg-white shrink-0">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-[#A855F7] font-black text-[11px] uppercase tracking-wider transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> К списку заданий
          </button>
          <h2 className="text-xl font-black text-gray-900 leading-tight line-clamp-3">{homework.themeTitle || 'Тема'}</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/30 custom-scrollbar">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 pl-1">Текущее задание</div>
          <div className="bg-[#A855F7] text-white p-4 md:p-5 rounded-2xl flex items-center gap-3 shadow-lg shadow-purple-500/20">
            <FileSignature className="w-6 h-6 shrink-0 text-purple-200" />
            <span className="font-bold text-sm leading-snug">{homework.title}</span>
          </div>
        </div>
      </aside>

      {/* ПРАВАЯ ЧАСТЬ (КОНТЕНТ): Выровнено с боковой панелью */}
      <main className="flex-1 bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-y-auto relative scroll-smooth h-full custom-scrollbar p-6 md:p-8 lg:p-10">
        <div className="max-w-[1100px] mx-auto pb-32">
          
          <div className="pb-6 border-b border-gray-50 mb-8 lg:mb-10">
            <div className="inline-flex items-center gap-2 bg-[#F3E8FF] px-3 py-1.5 rounded-xl mb-6">
              <div className="w-2 h-2 rounded-full bg-[#A855F7] animate-pulse"></div>
              <span className="text-[10px] font-black text-[#A855F7] uppercase tracking-widest">Домашнее задание</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 leading-tight break-words">
              {homework.title}
            </h1>
          </div>

          {/* 🔥 ТЕОРИЯ ДЗ */}
          {hwTheoryBlocks.map(block => (
            <div key={block.id} className="mb-10">
              {renderTheoryBlock(block)}
            </div>
          ))}

          {/* 🔥 ПРАКТИКА ДЗ */}
          {hwGroups.length > 0 && (
            <div className="space-y-6 mt-12 pt-10 border-t border-dashed border-gray-200">
              <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3 mb-8">
                <ListTodo className="w-7 h-7 text-[#A855F7]" /> Практическая часть ДЗ
              </h3>
              {hwGroups.map(group => (
                <TaskGroup 
                  key={`hw-${homework.id}-${group.type}`} 
                  group={group} 
                  testAnswers={testAnswers} testResults={testResults} attemptsUsed={attemptsUsed} 
                  handleAnswerToggle={handleAnswerToggle} handleTextAnswerChange={handleTextAnswerChange}
                  handleMatchingChange={handleMatchingChange} handleSubmitTest={handleSubmitTest} 
                  submissions={submissions}
                />
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

function ChevronDownIcon(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>; }
function ChevronRightIcon(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>; }