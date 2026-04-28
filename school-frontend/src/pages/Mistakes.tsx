import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BrainCircuit, AlertTriangle, BookOpen } from 'lucide-react';
import axios from 'axios';

const API_URL = 'https://prepodmgy.ru/api';

export default function Mistakes() {
  const { themeId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get(`${API_URL}/dashboard/mistakes/${themeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => setData(res.data))
      .catch(err => console.error('Ошибка загрузки ошибок:', err))
      .finally(() => setIsLoading(false));
    }
  }, [themeId]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F4F7FE] h-full">
        <div className="w-10 h-10 border-4 border-[#5A4BFF] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 bg-[#F4F7FE] min-h-full font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Шапка страницы */}
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-500 hover:text-[#5A4BFF] transition-colors mb-8 font-bold text-sm"
        >
          <ArrowLeft className="w-5 h-5" /> Назад на главную
        </button>

        <div className="bg-white rounded-[2rem] p-8 lg:p-10 shadow-sm border border-gray-100 mb-8 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-red-50 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-black uppercase tracking-widest mb-4">
              <BrainCircuit className="w-4 h-4" /> Разбор полетов
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-3">Твои ошибки в последнем тесте</h1>
            <p className="text-gray-500 font-medium max-w-2xl">
              Нейросеть проанализировала твои ответы. Мы не дадим тебе готовых решений — ты в PRO-группе. Посмотри, в каких вопросах ты ошибся, и возвращайся к теории, чтобы добить эту тему.
            </p>
          </div>
        </div>

        {/* Список ошибок */}
        {data && data.hasMistakes && data.questions.length > 0 ? (
          <div className="space-y-6">
            {data.questions.map((q: any, index: number) => (
              <div key={q.questionId} className="bg-white rounded-[1.5rem] p-6 lg:p-8 shadow-sm border border-red-50 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"></div>
                
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center font-black shrink-0">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Условие задания, где допущена ошибка</p>
                    <p className="text-lg font-bold text-gray-900 leading-relaxed">{q.content}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Кнопка "Учить теорию" */}
            <div className="pt-6">
              <button 
                onClick={() => navigate('/courses')}
                className="flex items-center justify-center gap-2 w-full bg-[#5A4BFF] hover:bg-[#4a3dec] text-white py-4 rounded-xl font-black text-lg transition-all shadow-md shadow-indigo-500/20 active:scale-[0.98]"
              >
                <BookOpen className="w-6 h-6" /> Перейти к списку курсов для повторения
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] p-12 border border-emerald-100 shadow-sm text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Ошибок не найдено!</h2>
            <p className="text-gray-500 font-medium">Похоже, ты уже всё исправил или нейросеть не нашла свежих косяков.</p>
          </div>
        )}

      </div>
    </div>
  );
}