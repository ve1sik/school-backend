import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getToken } from '../lib/auth';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Edit3,
  FileText,
  History,
  Inbox,
  Loader2,
  MessageSquare,
  Mic,
  PenTool,
  Search,
  Send,
  User,
  Users,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { invalidateCache } from '../lib/api';
import EssayGradingPanel from '../components/EssayGradingPanel';
import WrittenGradingPanel from '../components/WrittenGradingPanel';
import { EGE_ESSAY_MAX_SCORE, FINAL_ESSAY_MAX_SCORE, criteriaKindFromBlockType, detectCriteriaKindFromSubmission } from '../utils/essayCriteria';
import { parseSubmissionQuestion } from '../utils/submissionQuestion';

const API_URL = 'https://prepodmgy.ru/api';

type AnswerTab = 'written' | 'tests' | 'history';

const getFullUrl = (url: string) => {
  if (!url) return '';
  let finalUrl = url;
  if (finalUrl.startsWith('http://prepodmgy.ru')) finalUrl = finalUrl.replace('http://', 'https://');
  if (finalUrl.startsWith('http')) return finalUrl;
  const cleanPath = finalUrl.startsWith('/') ? finalUrl.slice(1) : finalUrl;
  if (cleanPath.startsWith('uploads/')) return `https://prepodmgy.ru/${cleanPath}`;
  return `${API_URL}/${cleanPath}`;
};

const getStudentName = (student: any) =>
  `${student?.surname || ''} ${student?.name || student?.email || 'Ученик'}`.trim();

export default function CuratorDashboard() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [answerTab, setAnswerTab] = useState<AnswerTab>('written');
  const [searchQuery, setSearchQuery] = useState('');
  const [scores, setScores] = useState<Record<string, number | ''>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [oralScore, setOralScore] = useState<number | ''>('');
  const [oralComment, setOralComment] = useState('');
  const [recentlyGradedIds, setRecentlyGradedIds] = useState<Set<string>>(new Set());
  const [limitToSelectedLesson, setLimitToSelectedLesson] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const [scopeRes, pendingRes, gradedRes] = await Promise.all([
        axios.get(`${API_URL}/groups/curator-scope`, { headers }),
        axios.get(`${API_URL}/submissions`, { headers, params: { status: 'PENDING' } }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/submissions`, { headers, params: { status: 'GRADED' } }).catch(() => ({ data: [] })),
      ]);

      const uniqueSubmissions = new Map<string, any>();
      [...(pendingRes.data || []), ...(gradedRes.data || [])].forEach((sub: any) => uniqueSubmissions.set(sub.id, sub));
      const loadedGroups = scopeRes.data || [];

      setGroups(loadedGroups);
      setSubmissions([...uniqueSubmissions.values()]);

      const firstGroup = loadedGroups[0];
      if (firstGroup && !selectedGroupId) {
        const firstCourse = firstGroup.courses?.[0];
        const firstTheme = firstCourse?.themes?.[0];
        const firstLesson = firstTheme?.lessons?.[0];
        setSelectedGroupId(firstGroup.id);
        setSelectedCourseId(firstCourse?.id || null);
        setSelectedThemeId(firstTheme?.id || null);
        setSelectedLessonId(firstLesson?.id || null);
      }
    } catch (err) {
      console.error('Ошибка загрузки кабинета куратора:', err);
      showToast('Ошибка загрузки кабинета куратора', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const selectedGroup = groups.find(group => group.id === selectedGroupId) || null;
  const selectedCourse = selectedGroup?.courses?.find((course: any) => course.id === selectedCourseId) || selectedGroup?.courses?.[0] || null;
  const selectedTheme = selectedCourse?.themes?.find((theme: any) => theme.id === selectedThemeId) || selectedCourse?.themes?.[0] || null;
  const selectedLesson = selectedTheme?.lessons?.find((lesson: any) => lesson.id === selectedLessonId) || selectedTheme?.lessons?.[0] || null;
  const activeStudent = selectedGroup?.students?.find((student: any) => student.id === activeStudentId) || null;

  useEffect(() => {
    if (!selectedGroup?.courses?.length) return;
    const courseStillValid = selectedGroup.courses.some((course: any) => course.id === selectedCourseId);
    if (courseStillValid) return;
    const firstCourse = selectedGroup.courses[0];
    const firstTheme = firstCourse?.themes?.[0];
    const firstLesson = firstTheme?.lessons?.[0];
    setSelectedCourseId(firstCourse?.id || null);
    setSelectedThemeId(firstTheme?.id || null);
    setSelectedLessonId(firstLesson?.id || null);
  }, [selectedGroupId, groups, selectedCourseId, selectedGroup]);

  const courseLessonMeta = useMemo(() => {
    const byId = new Map<string, { title: string; themeTitle: string }>();
    selectedCourse?.themes?.forEach((theme: any) => {
      theme.lessons?.forEach((lesson: any) => {
        byId.set(lesson.id, { title: lesson.title, themeTitle: theme.title });
      });
    });
    return byId;
  }, [selectedCourse]);

  const courseLessonIds = useMemo(() => new Set(courseLessonMeta.keys()), [courseLessonMeta]);

  const lessonSubmissions = useMemo(() => {
    if (!activeStudentId || !selectedCourse) return [];
    return submissions.filter((sub: any) => {
      if (sub.studentId !== activeStudentId) return false;
      if (!courseLessonIds.has(sub.lessonId)) return false;
      if (limitToSelectedLesson && selectedLesson && sub.lessonId !== selectedLesson.id) return false;
      return true;
    });
  }, [submissions, activeStudentId, selectedCourse, courseLessonIds, limitToSelectedLesson, selectedLesson?.id]);

  const writtenSubmissions = lessonSubmissions.filter(
    (sub: any) =>
      !sub.isAutoGraded &&
      !String(sub.blockId || '').startsWith('oral-') &&
      (sub.status !== 'GRADED' || recentlyGradedIds.has(sub.id)),
  );
  const testSubmissions = lessonSubmissions.filter((sub: any) => sub.isAutoGraded);
  const historySubmissions = lessonSubmissions.filter((sub: any) => sub.status === 'GRADED');

  const tabSubmissions =
    answerTab === 'written' ? writtenSubmissions : answerTab === 'tests' ? testSubmissions : historySubmissions;

  const pendingCountByStudent = useMemo(() => {
    const map = new Map<string, number>();
    if (!selectedCourse) return map;
    submissions.forEach((sub: any) => {
      if (!courseLessonIds.has(sub.lessonId)) return;
      if (sub.status !== 'PENDING') return;
      if (sub.isAutoGraded) return;
      if (String(sub.blockId || '').startsWith('oral-')) return;
      map.set(sub.studentId, (map.get(sub.studentId) || 0) + 1);
    });
    return map;
  }, [submissions, courseLessonIds, selectedCourse]);

  const pendingByLesson = useMemo(() => {
    const map = new Map<string, number>();
    submissions.forEach((sub: any) => {
      if (!courseLessonIds.has(sub.lessonId)) return;
      if (sub.status !== 'PENDING') return;
      if (sub.isAutoGraded) return;
      if (String(sub.blockId || '').startsWith('oral-')) return;
      map.set(sub.lessonId, (map.get(sub.lessonId) || 0) + 1);
    });
    return map;
  }, [submissions, courseLessonIds]);

  const totalPendingForLesson = useMemo(() => {
    if (!selectedCourse) return 0;
    return submissions.filter(
      (sub: any) =>
        courseLessonIds.has(sub.lessonId) &&
        sub.status === 'PENDING' &&
        !sub.isAutoGraded &&
        !String(sub.blockId || '').startsWith('oral-'),
    ).length;
  }, [submissions, courseLessonIds, selectedCourse]);

  const submittedStudentIds = useMemo(() => {
    if (!selectedCourse) return new Set<string>();
    return new Set(
      submissions
        .filter(
          (sub: any) =>
            courseLessonIds.has(sub.lessonId) &&
            !String(sub.blockId || '').startsWith('oral-') &&
            (!limitToSelectedLesson || !selectedLesson || sub.lessonId === selectedLesson.id),
        )
        .map((sub: any) => sub.studentId),
    );
  }, [submissions, selectedCourse, courseLessonIds, limitToSelectedLesson, selectedLesson?.id]);

  const filteredStudents = (selectedGroup?.students || []).filter((student: any) => {
    const value = `${student.surname || ''} ${student.name || ''} ${student.email || ''}`.toLowerCase();
    return value.includes(searchQuery.toLowerCase());
  });
  const submittedStudents = filteredStudents.filter((student: any) => submittedStudentIds.has(student.id));
  const notSubmittedStudents = filteredStudents.filter((student: any) => !submittedStudentIds.has(student.id));

  useEffect(() => {
    const initialScores: Record<string, number | ''> = {};
    const initialComments: Record<string, string> = {};
    lessonSubmissions.forEach((sub: any) => {
      initialScores[sub.id] = sub.score !== null && sub.score !== undefined ? sub.score : '';
      initialComments[sub.id] = sub.comment || '';
    });
    setScores(initialScores);
    setComments(initialComments);
  }, [activeStudentId, selectedLesson?.id, submissions.length]);

  useEffect(() => {
    setRecentlyGradedIds(new Set());
  }, [activeStudentId]);

  useEffect(() => {
    setOralScore('');
    setOralComment('');
    if (!activeStudentId || !selectedLesson?.id) return;

    const loadOralScore = async () => {
      try {
        const token = getToken();
        const res = await axios.get(`${API_URL}/submissions/oral/${activeStudentId}/${selectedLesson.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data) {
          setOralScore(res.data.score ?? '');
          setOralComment(res.data.comment || '');
        }
      } catch {
        // Устная оценка может ещё не существовать.
      }
    };

    loadOralScore();
  }, [activeStudentId, selectedLesson?.id]);

  const handleGroupChange = (groupId: string) => {
    const nextGroup = groups.find(group => group.id === groupId);
    const firstCourse = nextGroup?.courses?.[0];
    const firstTheme = firstCourse?.themes?.[0];
    const firstLesson = firstTheme?.lessons?.[0];
    setSelectedGroupId(groupId);
    setSelectedCourseId(firstCourse?.id || null);
    setSelectedThemeId(firstTheme?.id || null);
    setSelectedLessonId(firstLesson?.id || null);
    setActiveStudentId(null);
  };

  const handleCourseChange = (courseId: string) => {
    const nextCourse = selectedGroup?.courses?.find((course: any) => course.id === courseId);
    const firstTheme = nextCourse?.themes?.[0];
    const firstLesson = firstTheme?.lessons?.[0];
    setSelectedCourseId(courseId);
    setSelectedThemeId(firstTheme?.id || null);
    setSelectedLessonId(firstLesson?.id || null);
  };

  const handleThemeChange = (themeId: string) => {
    const nextTheme = selectedCourse?.themes?.find((theme: any) => theme.id === themeId);
    setSelectedThemeId(themeId);
    setSelectedLessonId(nextTheme?.lessons?.[0]?.id || null);
  };

  const handleGradeSingle = async (subId: string, maxScore: number) => {
    const currentScore = scores[subId];
    if (currentScore === '' || currentScore < 0 || currentScore > maxScore) {
      showToast(`Балл должен быть от 0 до ${maxScore}`, 'error');
      return;
    }

    try {
      const token = getToken();
      await axios.patch(
        `${API_URL}/submissions/${subId}/grade`,
        { score: Number(currentScore), comment: comments[subId] || '' },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setSubmissions(prev =>
        prev.map(sub => {
          if (sub.id !== subId) return sub;
          const nextComment = comments[subId]?.trim() ? comments[subId] : sub.comment || '';
          return { ...sub, score: Number(currentScore), comment: nextComment, status: 'GRADED' };
        }),
      );
      setRecentlyGradedIds(prev => new Set(prev).add(subId));
      invalidateCache('/submissions');
      showToast('Оценка сохранена');
    } catch {
      showToast('Ошибка при сохранении оценки', 'error');
    }
  };

  const handleReturnForRevision = async (subId: string) => {
    if (!comments[subId]?.trim()) {
      showToast('Напишите, что нужно доработать', 'error');
      return;
    }

    try {
      const token = getToken();
      await axios.patch(
        `${API_URL}/submissions/${subId}/grade`,
        { comment: comments[subId], status: 'REVISION' },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setSubmissions(prev => prev.map(sub => (sub.id === subId ? { ...sub, comment: comments[subId], status: 'REVISION' } : sub)));
      showToast('Работа отправлена на доработку');
    } catch {
      showToast('Ошибка при отправке на доработку', 'error');
    }
  };

  const handleOralGrade = async () => {
    if (!activeStudentId || !selectedLesson) return;
    if (oralScore === '' || oralScore < 0 || oralScore > 100) {
      showToast('Балл за устный ответ должен быть от 0 до 100', 'error');
      return;
    }

    try {
      const token = getToken();
      await axios.post(
        `${API_URL}/submissions/oral`,
        {
          studentId: activeStudentId,
          lessonId: selectedLesson.id,
          score: Number(oralScore),
          maxScore: 100,
          comment: oralComment || 'Устный ответ',
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      invalidateCache('/submissions');
      showToast('Балл за устный ответ сохранён');
      loadDashboard();
    } catch {
      showToast('Ошибка сохранения устного балла', 'error');
    }
  };

  const renderStudentButton = (student: any, submitted: boolean) => {
    const pendingCount = pendingCountByStudent.get(student.id) || 0;
    return (
    <button
      key={student.id}
      onClick={() => setActiveStudentId(student.id)}
      className={`w-full text-left p-4 rounded-2xl border-2 transition-all bg-white ${
        activeStudentId === student.id
          ? 'border-purple-500 shadow-md shadow-purple-100'
          : pendingCount > 0
            ? 'border-rose-200 hover:border-rose-400 bg-rose-50/30'
          : submitted
            ? 'border-emerald-100 hover:border-emerald-300'
            : 'border-gray-100 hover:border-purple-200'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 relative ${pendingCount > 0 ? 'bg-rose-100 text-rose-600' : submitted ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
            <User className="w-5 h-5" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-black text-gray-900 truncate">{getStudentName(student)}</p>
            <p className="text-[11px] font-bold text-gray-400 truncate">{student.email}</p>
            {pendingCount > 0 && (
              <p className="text-[10px] font-black text-rose-600 uppercase tracking-wider mt-0.5">На проверке</p>
            )}
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 shrink-0 ${activeStudentId === student.id ? 'text-purple-600' : 'text-gray-300'}`} />
      </div>
    </button>
  );};

  const isEssaySubmission = (sub: any) => {
    const bt = sub.blockType || sub.block_type;
    if (bt === 'essay' || bt === 'essay_final') return true;
    const max = Number(sub.maxScore ?? sub.max_score);
    return max === EGE_ESSAY_MAX_SCORE || max === FINAL_ESSAY_MAX_SCORE;
  };

  const handleEssaySave = async (
    subId: string,
    payload: {
      score: number;
      comment: string;
      criteriaScores: unknown;
      errorAnnotations: unknown;
    },
  ) => {
    try {
      const token = getToken();
      await axios.patch(
        `${API_URL}/submissions/${subId}/grade`,
        {
          score: payload.score,
          comment: payload.comment,
          criteriaScores: payload.criteriaScores,
          errorAnnotations: payload.errorAnnotations,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setSubmissions(prev =>
        prev.map(sub =>
          sub.id === subId
            ? {
                ...sub,
                score: payload.score,
                comment: payload.comment,
                criteriaScores: payload.criteriaScores,
                errorAnnotations: payload.errorAnnotations,
                status: 'GRADED',
              }
            : sub,
        ),
      );
      setRecentlyGradedIds(prev => new Set(prev).add(subId));
      invalidateCache('/submissions');
      showToast('Оценка сочинения сохранена');
    } catch {
      showToast('Ошибка при сохранении оценки', 'error');
    }
  };

  const handleWrittenSave = async (
    subId: string,
    payload: { score: number; comment: string; errorAnnotations: unknown },
  ) => {
    try {
      const token = getToken();
      await axios.patch(
        `${API_URL}/submissions/${subId}/grade`,
        {
          score: payload.score,
          comment: payload.comment,
          errorAnnotations: payload.errorAnnotations,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setSubmissions(prev =>
        prev.map(sub =>
          sub.id === subId
            ? {
                ...sub,
                score: payload.score,
                comment: payload.comment,
                errorAnnotations: payload.errorAnnotations,
                status: 'GRADED',
              }
            : sub,
        ),
      );
      setRecentlyGradedIds(prev => new Set(prev).add(subId));
      invalidateCache('/submissions');
      showToast('Оценка сохранена');
    } catch {
      showToast('Ошибка при сохранении оценки', 'error');
    }
  };

  const renderSubmissionCard = (sub: any, index: number) => {
    const { questionText, questionImage, sourceText } = parseSubmissionQuestion(sub.question);
    const lessonMeta = courseLessonMeta.get(sub.lessonId);
    const lessonLabel = sub.lessonTitle || lessonMeta?.title || 'Урок';
    const isGraded = sub.status === 'GRADED';
    const isEssay = isEssaySubmission(sub);

    if (isEssay && !sub.isAutoGraded) {
      return (
        <div key={sub.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 md:p-6 bg-gradient-to-br from-purple-50 to-indigo-50 border-b border-gray-100">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <span className="font-black text-xs uppercase tracking-widest text-purple-700 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Сочинение {index + 1}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase bg-white/80 text-indigo-700 border border-indigo-100">
                  {lessonLabel}
                </span>
                <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase ${isGraded ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {isGraded ? 'Оценено' : 'На проверке'}
                </span>
              </div>
            </div>
            <div className="text-gray-900 font-black theory-read-only mb-3">
              <ReactQuill theme="snow" value={questionText || ''} readOnly modules={{ toolbar: false }} />
            </div>
            {sourceText && (
              <div className="rounded-2xl border-2 border-amber-100 bg-amber-50/60 p-4 max-h-[200px] overflow-y-auto custom-scrollbar mb-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-2">Текст для анализа</p>
                <div className="font-serif text-sm leading-relaxed whitespace-pre-wrap text-gray-800">{sourceText}</div>
              </div>
            )}
            {questionImage && (
              <img src={getFullUrl(questionImage)} alt="Задание" className="max-h-60 rounded-2xl border border-gray-200 shadow-sm object-contain" />
            )}
          </div>
          <div className="p-6 md:p-8">
            <EssayGradingPanel
              submissionId={sub.id}
              answer={sub.answer || ''}
              maxScore={sub.maxScore || EGE_ESSAY_MAX_SCORE}
              initialCriteria={sub.criteriaScores}
              initialErrors={sub.errorAnnotations}
              initialComment={comments[sub.id] ?? sub.comment ?? ''}
              initialScore={sub.score}
              isGraded={isGraded}
              criteriaKind={criteriaKindFromBlockType(sub.blockType || sub.block_type) || detectCriteriaKindFromSubmission(sub)}
              onSave={(payload) => handleEssaySave(sub.id, payload)}
              onRevision={async (c) => {
                setComments(prev => ({ ...prev, [sub.id]: c }));
                await handleReturnForRevision(sub.id);
              }}
            />
          </div>
        </div>
      );
    }

    if (!sub.isAutoGraded) {
      return (
        <div key={sub.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 md:p-6 bg-gray-50/70 border-b border-gray-100">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <span className="font-black text-xs uppercase tracking-widest text-gray-500 flex items-center gap-2">
                <PenTool className="w-4 h-4" /> Письменный ответ {index + 1}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase bg-white text-gray-600 border border-gray-200">
                  {lessonLabel}
                </span>
                <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase ${isGraded ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {isGraded ? 'Оценено' : 'На проверке'}
                </span>
              </div>
            </div>
            <div className="text-gray-900 font-black theory-read-only">
              <ReactQuill theme="snow" value={questionText || ''} readOnly modules={{ toolbar: false }} />
            </div>
            {questionImage && <img src={getFullUrl(questionImage)} alt="Задание" className="max-h-80 rounded-3xl border border-gray-200 shadow-sm mt-4 object-contain" />}
          </div>
          <div className="p-6 md:p-8">
            <WrittenGradingPanel
              answer={sub.answer || ''}
              maxScore={sub.maxScore || 100}
              initialErrors={sub.errorAnnotations}
              initialComment={comments[sub.id] ?? sub.comment ?? ''}
              initialScore={sub.score}
              isGraded={isGraded}
              onSave={(payload) => handleWrittenSave(sub.id, payload)}
              onRevision={async (c) => {
                setComments(prev => ({ ...prev, [sub.id]: c }));
                await handleReturnForRevision(sub.id);
              }}
            />
          </div>
        </div>
      );
    }

    return (
      <div key={sub.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 bg-gray-50/70 border-b border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-xs uppercase tracking-widest text-gray-500 flex items-center gap-2">
                {sub.isAutoGraded ? <CheckSquare className="w-4 h-4" /> : <PenTool className="w-4 h-4" />}
                {sub.isAutoGraded ? 'Тест' : 'Письменный ответ'} {index + 1}
              </span>
              <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase ${isGraded ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {isGraded ? 'Оценено' : 'На проверке'}
              </span>
            </div>
            <div className="bg-white px-4 py-2 rounded-xl text-xs font-black text-gray-400 border border-gray-100">
              Макс: <span className="text-purple-600 text-base">{sub.maxScore}</span>
            </div>
          </div>

          <div className="text-gray-900 font-black theory-read-only">
            <ReactQuill theme="snow" value={questionText || ''} readOnly modules={{ toolbar: false }} />
          </div>
          {questionImage && <img src={getFullUrl(questionImage)} alt="Задание" className="max-h-80 rounded-3xl border border-gray-200 shadow-sm mt-4 object-contain" />}

          <div className="mt-6 p-5 bg-white rounded-3xl border border-gray-100">
            <div className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <User className="w-3 h-3" /> Ответ ученика
            </div>
            <div className="text-gray-800 font-medium theory-read-only">
              <ReactQuill theme="snow" value={sub.answer || ''} readOnly modules={{ toolbar: false }} />
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 bg-gray-900 text-white">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Балл</label>
              <input
                type="number"
                min="0"
                max={sub.maxScore}
                value={scores[sub.id] ?? ''}
                onChange={event => setScores(prev => ({ ...prev, [sub.id]: event.target.value === '' ? '' : Number(event.target.value) }))}
                className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-4 text-2xl font-black outline-none focus:border-purple-500 text-center text-white"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Комментарий</label>
              <textarea
                value={comments[sub.id] || ''}
                onChange={event => setComments(prev => ({ ...prev, [sub.id]: event.target.value }))}
                placeholder="Напишите фидбек..."
                className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-purple-500 text-white font-medium resize-none min-h-[70px]"
              />
            </div>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
            {!sub.isAutoGraded && (
              <button
                onClick={() => handleReturnForRevision(sub.id)}
                className="px-6 py-4 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2"
              >
                <AlertCircle className="w-4 h-4" /> На доработку
              </button>
            )}
            <button
              onClick={() => handleGradeSingle(sub.id, sub.maxScore || 100)}
              disabled={scores[sub.id] === ''}
              className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGraded ? <Edit3 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              {isGraded ? 'Изменить оценку' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F4F7FE]">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#F4F7FE] font-sans text-gray-900 overflow-hidden flex flex-col">
      <style>{`
        .theory-read-only .ql-container.ql-snow { border: none !important; font-family: inherit !important; font-size: inherit !important; }
        .theory-read-only .ql-editor { padding: 0 !important; color: inherit !important; }
        .ql-editor { min-height: auto !important; font-family: inherit !important; font-size: inherit !important; white-space: normal !important; word-wrap: break-word !important; overflow-wrap: break-word !important; word-break: normal !important; }
        .ql-editor p { margin-bottom: 0.75em !important; line-height: 1.6 !important; }
        .ql-editor img { max-width: 100% !important; border-radius: 1rem !important; margin: 1rem 0 !important; }
      `}</style>

      <header className="bg-white border-b border-gray-100 px-6 md:px-8 py-5 flex flex-col xl:flex-row xl:items-center justify-between gap-5 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-xl flex items-center justify-center text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Кабинет куратора</h1>
            <p className="text-xs font-bold text-purple-500 uppercase tracking-widest mt-1 flex items-center gap-2 flex-wrap">
              Группы, ученики и проверка ответов
              {totalPendingForLesson > 0 && selectedLesson && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-500 text-white text-[10px] font-black normal-case tracking-normal">
                  {totalPendingForLesson} на проверке
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedGroupId || ''}
            onChange={event => handleGroupChange(event.target.value)}
            className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:border-purple-400"
          >
            {groups.map(group => (
              <option key={group.id} value={group.id}>{group.title}</option>
            ))}
          </select>
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск ученика..."
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 pl-10 pr-4 outline-none focus:bg-white focus:border-purple-400 font-bold text-sm"
            />
          </div>
        </div>
      </header>

      {groups.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center bg-white rounded-[3rem] border border-gray-100 shadow-sm p-12 max-w-xl">
            <Inbox className="w-20 h-20 mx-auto mb-6 text-gray-200" />
            <h2 className="text-2xl font-black mb-3">Нет доступных групп</h2>
            <p className="text-gray-500 font-medium">Проверьте, что этому аккаунту назначили группу как куратору.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-[430px_1fr] overflow-hidden">
          <aside className="bg-white border-r border-gray-100 overflow-y-auto p-5 space-y-5">
            <div className="bg-purple-50 rounded-3xl p-5 border border-purple-100">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-purple-600" />
                <h2 className="font-black text-lg">{selectedGroup?.title || 'Группа'}</h2>
              </div>
              <p className="text-sm text-purple-700 font-bold">Всего участников: {selectedGroup?.students?.length || 0}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Есть ответы по курсу</h3>
                <span className="text-xs font-black text-emerald-600">{submittedStudents.length}</span>
              </div>
              {submittedStudents.length === 0 ? (
                <div className="text-sm font-bold text-gray-400 bg-gray-50 rounded-2xl p-4">Пока никто не сдал</div>
              ) : (
                submittedStudents.map(student => renderStudentButton(student, true))
              )}
            </div>

            <div className="flex items-center gap-3 py-2">
              <div className="h-px bg-gray-200 flex-1" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Не прошли / не ответили</span>
              <div className="h-px bg-gray-200 flex-1" />
            </div>

            <div className="space-y-3">
              {notSubmittedStudents.length === 0 ? (
                <div className="text-sm font-bold text-gray-400 bg-gray-50 rounded-2xl p-4">Все ученики уже есть в списке сдавших</div>
              ) : (
                notSubmittedStudents.map(student => renderStudentButton(student, false))
              )}
            </div>
          </aside>

          <main className="overflow-y-auto p-6 md:p-10">
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 md:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="space-y-2 p-4 rounded-3xl bg-indigo-50/60 border border-indigo-100">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                      <BookOpen className="w-4 h-4" /> 1. Курс
                    </span>
                    <select value={selectedCourse?.id || ''} onChange={event => handleCourseChange(event.target.value)} className="w-full bg-white border border-indigo-100 rounded-2xl px-4 py-3 font-black outline-none focus:border-purple-400 text-indigo-950">
                      {(selectedGroup?.courses || []).map((course: any) => <option key={course.id} value={course.id}>{course.title}</option>)}
                    </select>
                  </label>
                  <label className="space-y-2 p-4 rounded-3xl bg-purple-50/60 border border-purple-100">
                    <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest flex items-center gap-2">
                      <FileText className="w-4 h-4" /> 2. Модуль
                    </span>
                    <select value={selectedTheme?.id || ''} onChange={event => handleThemeChange(event.target.value)} className="w-full bg-white border border-purple-100 rounded-2xl px-4 py-3 font-black outline-none focus:border-purple-400 text-purple-950">
                      {(selectedCourse?.themes || []).map((theme: any) => <option key={theme.id} value={theme.id}>{theme.title}</option>)}
                    </select>
                  </label>
                  <label className="space-y-2 p-4 rounded-3xl bg-emerald-50/60 border border-emerald-100">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                      <CheckSquare className="w-4 h-4" /> 3. Урок для проверки
                    </span>
                    <select value={selectedLesson?.id || ''} onChange={event => setSelectedLessonId(event.target.value)} className="w-full bg-white border border-emerald-100 rounded-2xl px-4 py-3 font-black outline-none focus:border-purple-400 text-emerald-950">
                      {(selectedTheme?.lessons || []).map((lesson: any) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
                    </select>
                  </label>
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Уроки выбранного модуля</h3>
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={limitToSelectedLesson}
                        onChange={(e) => setLimitToSelectedLesson(e.target.checked)}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-400"
                      />
                      Только выбранный урок
                    </label>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {(selectedTheme?.lessons || []).map((lesson: any, index: number) => {
                      const active = selectedLesson?.id === lesson.id;
                      const pendingHere = pendingByLesson.get(lesson.id) || 0;
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => setSelectedLessonId(lesson.id)}
                          className={`shrink-0 px-4 py-3 rounded-2xl border-2 text-left transition-all min-w-[190px] relative ${
                            active ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-100' : 'bg-gray-50 border-gray-100 hover:border-purple-200 text-gray-700'
                          }`}
                        >
                          {pendingHere > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                              {pendingHere}
                            </span>
                          )}
                          <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${active ? 'text-purple-100' : 'text-gray-400'}`}>Урок {index + 1}</p>
                          <p className="text-sm font-black truncate">{lesson.title}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {!activeStudent ? (
                <div className="text-center bg-white rounded-[3rem] border border-gray-100 shadow-sm p-14">
                  <User className="w-20 h-20 mx-auto mb-6 text-gray-200" />
                  <h2 className="text-2xl font-black mb-3">Выберите ученика слева</h2>
                  <p className="text-gray-500 font-medium">Сначала отображаются все участники группы. После выбора ученика можно смотреть ответы и ставить устный балл.</p>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div key={`${activeStudent.id}-${selectedLesson?.id}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                            <User className="w-6 h-6" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-black">{getStudentName(activeStudent)}</h2>
                            <p className="text-sm font-bold text-gray-400">
                              {selectedCourse?.title || 'Курс'}
                              {limitToSelectedLesson && selectedLesson ? ` / ${selectedLesson.title}` : ' — все уроки курса'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => navigate(`/curator/messages?student=${activeStudent.id}`)} className="px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2">
                        <MessageSquare className="w-4 h-4" /> Написать в чат
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { id: 'written', label: 'Письменные и сочинения', icon: FileText, count: writtenSubmissions.length },
                        { id: 'tests', label: 'Тесты', icon: CheckSquare, count: testSubmissions.length },
                        { id: 'history', label: 'История', icon: History, count: historySubmissions.length },
                      ].map(tab => {
                        const Icon = tab.icon;
                        const active = answerTab === tab.id;
                        return (
                          <button key={tab.id} onClick={() => setAnswerTab(tab.id as AnswerTab)} className={`p-5 rounded-3xl border-2 text-left transition-all ${active ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-200' : 'bg-white border-gray-100 hover:border-purple-200 text-gray-700'}`}>
                            <div className="flex items-center justify-between">
                              <Icon className={`w-6 h-6 ${active ? 'text-white' : 'text-purple-500'}`} />
                              <span className={`px-3 py-1 rounded-xl text-xs font-black ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{tab.count}</span>
                            </div>
                            <p className="mt-4 font-black">{tab.label}</p>
                          </button>
                        );
                      })}
                    </div>

                    <div className="space-y-6">
                      {tabSubmissions.length === 0 ? (
                        <div className="bg-white rounded-[2rem] border border-gray-100 p-10 text-center">
                          <BookOpen className="w-14 h-14 mx-auto mb-4 text-gray-200" />
                          <h3 className="text-xl font-black text-gray-900 mb-2">В этой вкладке пока пусто</h3>
                          <p className="text-gray-500 font-bold">
                            {limitToSelectedLesson
                              ? 'Нет ответов по выбранному уроку. Снимите галочку «Только выбранный урок», чтобы увидеть работы по всему курсу.'
                              : 'Нет ответов по этому курсу у выбранного ученика. Проверьте, что выбран верный курс и ученик уже отправил работу.'}
                          </p>
                        </div>
                      ) : (
                        tabSubmissions.map((sub: any, index: number) => renderSubmissionCard(sub, index))
                      )}
                    </div>

                    <div className="pt-2">
                      <div className="bg-gradient-to-br from-purple-100 to-indigo-50 p-6 md:p-8 rounded-[2rem] border border-purple-200 shadow-sm relative overflow-hidden">
                        <Mic className="absolute -right-8 -top-8 w-40 h-40 text-purple-200/60 rotate-12" />
                        <div className="relative z-10">
                          <h3 className="font-black text-2xl text-purple-900 mb-2 flex items-center gap-3">
                            <Mic className="w-7 h-7 text-purple-600" /> Устный ответ
                          </h3>
                          <p className="text-purple-700 font-medium mb-3 text-sm">Доступен всегда для выбранного ученика и урока. Если балл уже был, новое значение заменит старое в статистике.</p>
                          <div className="mb-5 inline-flex flex-wrap items-center gap-2 px-4 py-2 bg-white/80 border border-purple-200 rounded-2xl text-xs font-black text-purple-800">
                            <BookOpen className="w-4 h-4 text-purple-500" />
                            Сохраняется только для урока: {selectedLesson?.title || 'урок не выбран'}
                          </div>
                          {oralScore !== '' && (
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 border border-purple-200 rounded-2xl text-xs font-black text-purple-700 mb-5">
                              <CheckCircle2 className="w-4 h-4" /> Сейчас сохранено: {oralScore}/100
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                            <label>
                              <span className="block text-[10px] font-black text-purple-500 uppercase tracking-widest mb-3">Балл из 100</span>
                              <input type="number" min="0" max="100" value={oralScore} onChange={event => setOralScore(event.target.value === '' ? '' : Number(event.target.value))} className="w-full bg-white border-2 border-purple-200 focus:border-purple-500 rounded-2xl p-4 text-2xl font-black outline-none text-center text-purple-900" />
                            </label>
                            <label className="md:col-span-3">
                              <span className="block text-[10px] font-black text-purple-500 uppercase tracking-widest mb-3">Комментарий</span>
                              <textarea value={oralComment} onChange={event => setOralComment(event.target.value)} placeholder="Например: отлично ответил устно по теме..." className="w-full bg-white border-2 border-purple-200 focus:border-purple-500 rounded-2xl p-4 text-sm outline-none text-gray-800 font-medium resize-none min-h-[70px]" />
                            </label>
                          </div>
                          <div className="mt-5 flex justify-end">
                            <button onClick={handleOralGrade} disabled={oralScore === ''} className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-sm transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-500/30">
                              <CheckCircle2 className="w-5 h-5" /> Сохранить устный балл
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </main>
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            className={`fixed bottom-10 right-10 z-[9999] px-8 py-5 rounded-[2rem] shadow-2xl font-black text-white text-lg flex items-center gap-4 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-7 h-7" /> : <X className="w-7 h-7" />}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
