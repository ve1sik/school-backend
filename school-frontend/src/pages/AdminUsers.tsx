import { useState, useEffect } from 'react';
import { Users, GraduationCap, BookOpen, X, Search, Crown, UserCircle, Mail, Calendar, MapPin, Shield, Trash2, Plus, Check, ChevronRight, ChevronDown, Building2, Loader2, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = 'https://prepodmgy.ru/api';

type Role = 'STUDENT' | 'CURATOR' | 'ADMIN' | 'PARENT' | 'TEACHER';

interface User {
  id: string;
  email: string;
  role: Role;
  name?: string;
  surname?: string;
  patronymic?: string;
  birthday?: string;
  city?: string;
  avatar?: string;
  created_at: string;
  enrollments?: { course: { id: string; title: string } }[];
  groups?: { id: string; title: string }[];
  subjects?: { id: string; title: string }[];
}

interface Course {
  id: string;
  title: string;
}

interface Group {
  id: string;
  title: string;
  curator?: { id: string; name?: string; surname?: string; email: string } | null;
  teacher?: { id: string; name?: string; surname?: string; email: string } | null;
}

interface Subject {
  id: string;
  title: string;
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', password: '', name: '', surname: '', role: 'STUDENT' as Role });
  const [isCreating, setIsCreating] = useState(false);
  
  const [selectedRole, setSelectedRole] = useState<Role>('STUDENT');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>('all');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('');
  const [assignCuratorId, setAssignCuratorId] = useState('');
  const [assignTeacherId, setAssignTeacherId] = useState('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getTokenConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, coursesRes, groupsRes, subjectsRes] = await Promise.all([
        axios.get(`${API_URL}/users`, getTokenConfig()),
        axios.get(`${API_URL}/courses`, getTokenConfig()),
        axios.get(`${API_URL}/groups`, getTokenConfig()),
        axios.get(`${API_URL}/subjects`, getTokenConfig()).catch(() => ({ data: [] }))
      ]);
      
      setUsers(usersRes.data);
      setCourses(coursesRes.data);
      setGroups(groupsRes.data);
      setSubjects(subjectsRes.data);
    } catch (err) {
      showToast('Ошибка загрузки данных', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser) return;
    try {
      await axios.patch(`${API_URL}/users/${selectedUser.id}`, { role: selectedRole }, getTokenConfig());
      showToast('Роль изменена!');
      setShowRoleModal(false);
      fetchData();
    } catch (err) {
      showToast('Ошибка изменения роли', 'error');
    }
  };

  const handleAddCourse = async () => {
    if (!selectedUser || !selectedCourseId) return;
    try {
      await axios.post(`${API_URL}/enrollments`, { 
        userId: selectedUser.id, 
        courseId: selectedCourseId 
      }, getTokenConfig());
      showToast('Курс добавлен!');
      setShowCourseModal(false);
      setSelectedCourseId('');
      fetchData();
    } catch (err) {
      showToast('Ошибка добавления курса', 'error');
    }
  };

  const handleRemoveCourse = async (courseId: string) => {
    if (!selectedUser) return;
    try {
      await axios.delete(`${API_URL}/enrollments/${selectedUser.id}/${courseId}`, getTokenConfig());
      showToast('Курс удалён!');
      fetchData();
    } catch (err) {
      showToast('Ошибка удаления курса', 'error');
    }
  };

  const handleAddToGroup = async () => {
    if (!selectedUser || !selectedGroupId) return;
    try {
      await axios.post(`${API_URL}/groups/${selectedGroupId}/students`, { 
        userId: selectedUser.id 
      }, getTokenConfig());
      showToast('Добавлен в группу!');
      setShowGroupModal(false);
      setSelectedGroupId('');
      fetchData();
    } catch (err) {
      showToast('Ошибка добавления в группу', 'error');
    }
  };

  const handleRemoveFromGroup = async (groupId: string) => {
    if (!selectedUser) return;
    try {
      await axios.delete(`${API_URL}/groups/${groupId}/students/${selectedUser.id}`, getTokenConfig());
      showToast('Удалён из группы!');
      fetchData();
    } catch (err) {
      showToast('Ошибка удаления из группы', 'error');
    }
  };

  const handleAssignSubject = async () => {
    if (!selectedUser || !selectedSubjectId) return;
    try {
      await axios.patch(`${API_URL}/subjects/${selectedSubjectId}`, { 
        teacherId: selectedUser.id 
      }, getTokenConfig());
      showToast('Предмет назначен!');
      setShowSubjectModal(false);
      setSelectedSubjectId('');
      fetchData();
    } catch (err) {
      showToast('Ошибка назначения предмета', 'error');
    }
  };

  const handleRemoveSubject = async (subjectId: string) => {
    if (!selectedUser) return;
    try {
      await axios.patch(`${API_URL}/subjects/${subjectId}`, { 
        teacherId: null 
      }, getTokenConfig());
      showToast('Предмет удалён!');
      fetchData();
    } catch (err) {
      showToast('Ошибка удаления предмета', 'error');
    }
  };

  const handleAssignGroupCurator = async (groupId: string, userId: string) => {
    try {
      await axios.patch(`${API_URL}/groups/${groupId}`, { curatorId: userId || null }, getTokenConfig());
      showToast(userId ? 'Куратор группы назначен!' : 'Куратор снят');
      fetchData();
    } catch (err) {
      showToast('Ошибка назначения куратора', 'error');
    }
  };

  const handleAssignGroupTeacher = async (groupId: string, userId: string) => {
    try {
      await axios.patch(`${API_URL}/groups/${groupId}`, { teacherId: userId || null }, getTokenConfig());
      showToast(userId ? 'Преподаватель группы назначен!' : 'Преподаватель снят');
      fetchData();
    } catch (err) {
      showToast('Ошибка назначения преподавателя', 'error');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.email || !createForm.password) return;
    setIsCreating(true);
    try {
      await axios.post(`${API_URL}/users`, createForm, getTokenConfig());
      showToast(`Аккаунт создан: ${createForm.email}`);
      setShowCreateModal(false);
      setCreateForm({ email: '', password: '', name: '', surname: '', role: 'STUDENT' });
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка создания', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Удалить пользователя? Это действие необратимо!')) return;
    try {
      await axios.delete(`${API_URL}/users/${userId}`, getTokenConfig());
      showToast('Пользователь удалён!');
      setSelectedUser(null);
      fetchData();
    } catch (err) {
      showToast('Ошибка удаления пользователя', 'error');
    }
  };

  const filteredUsers = users.filter(u => {
    const fullName = `${u.surname || ''} ${u.name || ''} ${u.patronymic || ''} ${u.email}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase());
    const matchesGroup = !selectedGroupFilter || u.groups?.some(g => g.id === selectedGroupFilter);
    return matchesSearch && matchesGroup;
  });

  const students = filteredUsers.filter(u => u.role === 'STUDENT');
  const teachers = filteredUsers.filter(u => u.role === 'TEACHER');
  const curators = filteredUsers.filter(u => u.role === 'CURATOR');
  const admins = filteredUsers.filter(u => u.role === 'ADMIN');
  const parents = filteredUsers.filter(u => u.role === 'PARENT');

  const getRoleBadge = (role: Role) => {
    const badges: Record<Role, { text: string; class: string }> = {
      STUDENT: { text: 'Ученик', class: 'bg-blue-50 text-blue-600 border-blue-200' },
      CURATOR: { text: 'Куратор', class: 'bg-purple-50 text-purple-600 border-purple-200' },
      ADMIN: { text: 'Админ', class: 'bg-rose-50 text-rose-600 border-rose-200' },
      PARENT: { text: 'Родитель', class: 'bg-amber-50 text-amber-600 border-amber-200' },
      TEACHER: { text: 'Препод', class: 'bg-sky-50 text-sky-600 border-sky-200' },
    };
    return badges[role];
  };

  const toggleCard = (id: string) => {
    setExpandedCard(prev => (prev === id ? null : id));
  };

  const accordionSections = [
    { id: 'all', label: 'Все пользователи', icon: UserCircle, users: filteredUsers, color: 'gray', iconBg: 'bg-gray-100', iconColor: 'text-gray-600', badgeBg: 'bg-gray-100 text-gray-700' },
    { id: 'students', label: 'Ученики', icon: GraduationCap, users: students, color: 'blue', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', badgeBg: 'bg-blue-100 text-blue-700' },
    { id: 'teachers', label: 'Преподаватели', icon: BookOpen, users: teachers, color: 'sky', iconBg: 'bg-sky-100', iconColor: 'text-sky-600', badgeBg: 'bg-sky-100 text-sky-700' },
    { id: 'curators', label: 'Кураторы', icon: Crown, users: curators, color: 'purple', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', badgeBg: 'bg-purple-100 text-purple-700' },
    { id: 'admins', label: 'Администраторы', icon: Shield, users: admins, color: 'rose', iconBg: 'bg-rose-100', iconColor: 'text-rose-600', badgeBg: 'bg-rose-100 text-rose-700' },
  ];

  const activeGroupObj = groups.find(g => g.id === selectedGroupFilter);
  const groupCurators = selectedGroupFilter ? users.filter(u => u.role === 'CURATOR' && u.groups?.some(g => g.id === selectedGroupFilter)) : [];
  const groupTeachers = selectedGroupFilter ? users.filter(u => u.role === 'TEACHER' && u.groups?.some(g => g.id === selectedGroupFilter)) : [];
  const groupStudents = selectedGroupFilter ? users.filter(u => u.role === 'STUDENT' && u.groups?.some(g => g.id === selectedGroupFilter)) : [];

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F4F7FE]">
        <Loader2 className="w-12 h-12 animate-spin text-[#5A4BFF]" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F4F7FE] font-sans text-gray-900 overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r border-gray-100 flex flex-col sticky top-4 z-10 shadow-xl shrink-0 self-start max-h-[calc(100vh-2rem)] overflow-hidden rounded-[2rem] ml-4">
        <div className="p-6 flex items-center gap-3 border-b border-gray-50 shrink-0">
          <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight">Пользователи</span>
        </div>
        
        <div className="flex-1 px-4 py-8 space-y-3 overflow-y-auto custom-scrollbar">
          <h3 className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Управление</h3>
          <button type="button" onClick={() => navigate('/admin')} className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all text-gray-600 hover:bg-gray-50">
            <BookOpen className="w-5 h-5" /> Курсы и Уроки
          </button>
          <button type="button" className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all bg-[#5A4BFF] text-white shadow-lg shadow-indigo-500/20">
            <Users className="w-5 h-5" /> Пользователи
          </button>
          <button type="button" onClick={() => navigate('/admin/groups')} className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all text-gray-600 hover:bg-gray-50">
            <Building2 className="w-5 h-5" /> Группы
          </button>
        </div>
        
        <div className="p-4 border-t border-gray-100 shrink-0">
          <button type="button" onClick={() => navigate('/')} className="flex items-center gap-3 px-5 py-4 w-full text-gray-500 hover:bg-gray-100 rounded-2xl font-bold transition-colors">
            <ChevronRight className="w-5 h-5 rotate-180" /> На портал
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto flex flex-col gap-5 min-w-0">
        
        {/* HEADER */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <h1 className="text-4xl font-black shrink-0">Управление пользователями</h1>
          <div className="flex items-center gap-3 ml-auto">
            <div className="relative w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Поиск по имени или email..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                className="w-full bg-white border border-gray-200 text-sm font-bold text-gray-700 rounded-xl pl-11 pr-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all placeholder:font-medium shadow-sm"
              />
            </div>
            <button onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-3 bg-[#5A4BFF] text-white rounded-xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 shrink-0">
              <Plus className="w-4 h-4" /> Создать аккаунт
            </button>
          </div>
        </div>

        {/* GROUP FILTER */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <label className="text-sm font-black text-gray-500 shrink-0">Показать группу:</label>
          <select
            value={selectedGroupFilter}
            onChange={e => setSelectedGroupFilter(e.target.value)}
            className="flex-1 max-w-xs px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 font-bold text-gray-700 text-sm cursor-pointer transition-all"
          >
            <option value="">Все группы</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
          {selectedGroupFilter && (
            <button onClick={() => setSelectedGroupFilter('')} className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>

        {/* GROUP MINI-TABLE */}
        <AnimatePresence>
          {selectedGroupFilter && activeGroupObj && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-indigo-50 bg-indigo-50/40 flex items-center gap-3">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-indigo-900">Группа: {activeGroupObj.title}</h3>
                <span className="ml-auto text-xs font-bold text-indigo-500">{groupStudents.length} учеников</span>
              </div>

              {/* НАЗНАЧЕНИЕ КУРАТОРА И ПРЕПОДА */}
              <div className="px-6 py-4 border-b border-gray-50 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Куратор */}
                <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Crown className="w-4 h-4 text-purple-500" />
                    <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Куратор группы</p>
                  </div>
                  {activeGroupObj.curator ? (
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-black text-purple-800">
                        {activeGroupObj.curator.surname || activeGroupObj.curator.name
                          ? `${activeGroupObj.curator.surname || ''} ${activeGroupObj.curator.name || ''}`.trim()
                          : activeGroupObj.curator.email}
                      </span>
                      <button
                        onClick={() => handleAssignGroupCurator(activeGroupObj.id, '')}
                        className="text-xs text-red-400 hover:text-red-600 font-bold transition-colors"
                      >
                        Снять
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-purple-400 font-medium mb-3">Не назначен</p>
                  )}
                  <div className="flex gap-2">
                    <select
                      value={assignCuratorId}
                      onChange={e => setAssignCuratorId(e.target.value)}
                      className="flex-1 text-sm px-3 py-2 bg-white border border-purple-200 rounded-xl outline-none focus:border-purple-400 font-medium text-gray-700 cursor-pointer"
                    >
                      <option value="">Выбрать куратора...</option>
                      {users.filter(u => u.role === 'CURATOR' || u.role === 'ADMIN').map(u => (
                        <option key={u.id} value={u.id}>
                          {u.surname || u.name ? `${u.surname || ''} ${u.name || ''}`.trim() : u.email}
                        </option>
                      ))}
                    </select>
                    <button
                      disabled={!assignCuratorId}
                      onClick={() => { handleAssignGroupCurator(activeGroupObj.id, assignCuratorId); setAssignCuratorId(''); }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl font-black text-xs transition-all"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Преподаватель */}
                <div className="bg-sky-50 rounded-2xl p-4 border border-sky-100">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="w-4 h-4 text-sky-500" />
                    <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest">Преподаватель группы</p>
                  </div>
                  {activeGroupObj.teacher ? (
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-black text-sky-800">
                        {activeGroupObj.teacher.surname || activeGroupObj.teacher.name
                          ? `${activeGroupObj.teacher.surname || ''} ${activeGroupObj.teacher.name || ''}`.trim()
                          : activeGroupObj.teacher.email}
                      </span>
                      <button
                        onClick={() => handleAssignGroupTeacher(activeGroupObj.id, '')}
                        className="text-xs text-red-400 hover:text-red-600 font-bold transition-colors"
                      >
                        Снять
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-sky-400 font-medium mb-3">Не назначен</p>
                  )}
                  <div className="flex gap-2">
                    <select
                      value={assignTeacherId}
                      onChange={e => setAssignTeacherId(e.target.value)}
                      className="flex-1 text-sm px-3 py-2 bg-white border border-sky-200 rounded-xl outline-none focus:border-sky-400 font-medium text-gray-700 cursor-pointer"
                    >
                      <option value="">Выбрать препода...</option>
                      {users.filter(u => u.role === 'TEACHER' || u.role === 'ADMIN').map(u => (
                        <option key={u.id} value={u.id}>
                          {u.surname || u.name ? `${u.surname || ''} ${u.name || ''}`.trim() : u.email}
                        </option>
                      ))}
                    </select>
                    <button
                      disabled={!assignTeacherId}
                      onClick={() => { handleAssignGroupTeacher(activeGroupObj.id, assignTeacherId); setAssignTeacherId(''); }}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white rounded-xl font-black text-xs transition-all"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Ученики */}
              <div className="px-6 py-4">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Ученики ({groupStudents.length})</p>
                {groupStudents.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {groupStudents.map(u => (
                      <button key={u.id} onClick={() => setSelectedUser(u)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl transition-colors">
                        <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-sm font-bold text-blue-800">{u.surname || u.name ? `${u.surname || ''} ${u.name || ''}`.trim() : u.email}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 font-medium">Нет учеников в этой группе</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ACCORDION CARDS */}
        <div className="space-y-3 pb-8">
          {accordionSections.map(section => {
            const Icon = section.icon;
            const isOpen = expandedCard === section.id;
            return (
              <div key={section.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Card Header */}
                <button
                  type="button"
                  onClick={() => toggleCard(section.id)}
                  className="w-full flex items-center gap-4 px-6 py-5 hover:bg-gray-50 transition-colors group"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${section.iconBg}`}>
                    <Icon className={`w-5 h-5 ${section.iconColor}`} />
                  </div>
                  <span className="font-black text-gray-900 text-lg">{section.label}</span>
                  <span className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-black ${section.badgeBg}`}>
                    {section.users.length}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 ml-auto transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Card Body */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-gray-100">
                        {section.users.length === 0 ? (
                          <div className="text-center py-12 text-gray-400">
                            <Icon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="font-bold">Нет пользователей</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                  <th className="text-left px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Имя</th>
                                  <th className="text-left px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</th>
                                  <th className="text-left px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Роль</th>
                                  <th className="text-left px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Группы / Курсы</th>
                                  <th className="text-right px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Действия</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {section.users.map(user => {
                                  const badge = getRoleBadge(user.role);
                                  const isActive = selectedUser?.id === user.id;
                                  return (
                                    <tr
                                      key={user.id}
                                      onClick={() => setSelectedUser(user)}
                                      className={`cursor-pointer transition-colors ${isActive ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                                    >
                                      {/* Имя */}
                                      <td className="px-6 py-3.5">
                                        <div className="flex items-center gap-3">
                                          {user.avatar ? (
                                            <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                                          ) : (
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                              <UserCircle className="w-5 h-5 text-gray-400" />
                                            </div>
                                          )}
                                          <span className="font-bold text-gray-900 text-sm whitespace-nowrap">
                                            {user.surname || user.name ? `${user.surname || ''} ${user.name || ''}`.trim() : 'Без имени'}
                                          </span>
                                        </div>
                                      </td>
                                      {/* Email */}
                                      <td className="px-4 py-3.5">
                                        <span className="text-sm text-gray-500 font-medium">{user.email}</span>
                                      </td>
                                      {/* Роль */}
                                      <td className="px-4 py-3.5">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${badge.class}`}>
                                          {badge.text}
                                        </span>
                                      </td>
                                      {/* Группы / Курсы */}
                                      <td className="px-4 py-3.5 max-w-xs">
                                        <div className="flex flex-wrap gap-1">
                                          {user.groups?.slice(0, 3).map(g => (
                                            <span key={g.id} className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-lg text-[10px] font-bold">
                                              {g.title}
                                            </span>
                                          ))}
                                          {user.enrollments?.slice(0, 2).map(e => (
                                            <span key={e.course.id} className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[10px] font-bold">
                                              {e.course.title}
                                            </span>
                                          ))}
                                          {((user.groups?.length ?? 0) > 3 || (user.enrollments?.length ?? 0) > 2) && (
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-bold">…</span>
                                          )}
                                          {!user.groups?.length && !user.enrollments?.length && (
                                            <span className="text-xs text-gray-300 font-medium">—</span>
                                          )}
                                        </div>
                                      </td>
                                      {/* Действия */}
                                      <td className="px-6 py-3.5 text-right">
                                        <button
                                          onClick={e => { e.stopPropagation(); handleDeleteUser(user.id); }}
                                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                          title="Удалить"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </main>

      {/* ПРАВАЯ ПАНЕЛЬ С ДЕТАЛЯМИ */}
      <AnimatePresence>
        {selectedUser && (
          <motion.aside 
            initial={{ x: 400, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }} 
            exit={{ x: 400, opacity: 0 }}
            className="w-96 bg-white border-l border-gray-100 flex flex-col sticky top-4 z-20 shadow-xl shrink-0 self-start max-h-[calc(100vh-2rem)] overflow-hidden rounded-[2rem] mr-4"
          >
            <div className="p-6 border-b border-gray-100 shrink-0">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-black text-gray-900">Детали</h2>
                <button onClick={() => setSelectedUser(null)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="flex items-center gap-4">
                {selectedUser.avatar ? (
                  <img src={selectedUser.avatar} alt="" className="w-16 h-16 rounded-2xl object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <UserCircle className="w-10 h-10 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-black text-lg text-gray-900 leading-tight">
                    {selectedUser.surname || selectedUser.name ? `${selectedUser.surname || ''} ${selectedUser.name || ''}`.trim() : 'Без имени'}
                  </h3>
                  <p className="text-sm text-gray-500 font-medium">{selectedUser.email}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              
              {/* РОЛЬ */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Роль</h4>
                  <button onClick={() => { setSelectedRole(selectedUser.role); setShowRoleModal(true); }} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                    Изменить
                  </button>
                </div>
                <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-black border ${getRoleBadge(selectedUser.role).class}`}>
                  <Shield className="w-4 h-4" /> {getRoleBadge(selectedUser.role).text}
                </div>
              </div>

              {/* КУРСЫ */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Курсы</h4>
                  <button onClick={() => setShowCourseModal(true)} className="p-1.5 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                    <Plus className="w-4 h-4 text-indigo-600" />
                  </button>
                </div>
                <div className="space-y-2">
                  {selectedUser.enrollments?.map(e => (
                    <div key={e.course.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-sm font-bold text-gray-700">{e.course.title}</span>
                      <button onClick={() => handleRemoveCourse(e.course.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {(!selectedUser.enrollments || selectedUser.enrollments.length === 0) && (
                    <p className="text-sm text-gray-400 font-medium py-2">Нет курсов</p>
                  )}
                </div>
              </div>

              {/* ГРУППЫ */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Группы</h4>
                  <button onClick={() => setShowGroupModal(true)} className="p-1.5 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                    <Plus className="w-4 h-4 text-purple-600" />
                  </button>
                </div>
                <div className="space-y-2">
                  {selectedUser.groups?.map(g => (
                    <div key={g.id} className="p-3 bg-purple-50 rounded-xl border border-purple-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-purple-700">{g.title}</span>
                        <button onClick={() => handleRemoveFromGroup(g.id)} className="p-1 text-purple-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {(selectedUser.role === 'CURATOR' || selectedUser.role === 'TEACHER' || selectedUser.role === 'ADMIN') && (
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => handleAssignGroupCurator(g.id, selectedUser.id)}
                            className="text-[10px] font-black px-2.5 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 transition-colors uppercase tracking-wider">
                            👑 Куратор группы
                          </button>
                          <button onClick={() => handleAssignGroupTeacher(g.id, selectedUser.id)}
                            className="text-[10px] font-black px-2.5 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-700 transition-colors uppercase tracking-wider">
                            📚 Препод группы
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {(!selectedUser.groups || selectedUser.groups.length === 0) && (
                    <p className="text-sm text-gray-400 font-medium py-2">Нет групп</p>
                  )}
                </div>
              </div>

              {/* ПРЕДМЕТЫ (для преподавателей, кураторов, админов) */}
              {(selectedUser.role === 'CURATOR' || selectedUser.role === 'ADMIN' || selectedUser.role === 'TEACHER') && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Преподаёт предметы</h4>
                    <button onClick={() => setShowSubjectModal(true)} className="p-1.5 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
                      <Plus className="w-4 h-4 text-emerald-600" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {selectedUser.subjects?.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                        <span className="text-sm font-bold text-emerald-700">{s.title}</span>
                        <button onClick={() => handleRemoveSubject(s.id)} className="p-1 text-emerald-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {(!selectedUser.subjects || selectedUser.subjects.length === 0) && (
                      <p className="text-sm text-gray-400 font-medium py-2">Нет предметов</p>
                    )}
                  </div>
                </div>
              )}

              {/* ДОПОЛНИТЕЛЬНАЯ ИНФО */}
              <div className="pt-6 border-t border-gray-100 space-y-3">
                {selectedUser.birthday && (
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-600">День рождения:</span>
                    <span className="font-bold text-gray-900">{selectedUser.birthday}</span>
                  </div>
                )}
                {selectedUser.city && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-600">Город:</span>
                    <span className="font-bold text-gray-900">{selectedUser.city}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-600">Email:</span>
                  <span className="font-bold text-gray-900 truncate">{selectedUser.email}</span>
                </div>
              </div>

              {/* УДАЛЕНИЕ */}
              <div className="pt-6 border-t border-gray-100">
                <button onClick={() => handleDeleteUser(selectedUser.id)} className="w-full py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                  <Trash2 className="w-5 h-5" /> Удалить пользователя
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* МОДАЛКА СМЕНЫ РОЛИ */}
      <AnimatePresence>
        {showRoleModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-gray-900/60 backdrop-blur-sm flex justify-center items-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
              <button onClick={() => setShowRoleModal(false)} className="absolute top-5 right-5 p-2 bg-gray-50 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                <X className="w-5 h-5"/>
              </button>
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black mb-2 text-gray-900">Изменить роль</h3>
              <p className="text-gray-500 font-medium mb-6 text-sm">Выберите новую роль для пользователя</p>
              
              <div className="space-y-2 mb-6">
                {(['STUDENT', 'TEACHER', 'CURATOR', 'ADMIN', 'PARENT'] as Role[]).map(role => (
                  <label key={role} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedRole === role ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 hover:border-gray-200'}`}>
                    <input type="radio" checked={selectedRole === role} onChange={() => setSelectedRole(role)} className="sr-only" />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedRole === role ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'}`}>
                      {selectedRole === role && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="font-bold text-gray-900">{getRoleBadge(role).text}</span>
                  </label>
                ))}
              </div>
              
              <button onClick={handleChangeRole} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-lg shadow-indigo-500/30 transition-all active:scale-95 text-lg">
                Сохранить
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛКА ДОБАВЛЕНИЯ КУРСА */}
      <AnimatePresence>
        {showCourseModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-gray-900/60 backdrop-blur-sm flex justify-center items-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
              <button onClick={() => setShowCourseModal(false)} className="absolute top-5 right-5 p-2 bg-gray-50 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                <X className="w-5 h-5"/>
              </button>
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black mb-2 text-gray-900">Добавить курс</h3>
              <p className="text-gray-500 font-medium mb-6 text-sm">Выберите курс для добавления</p>
              
              <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="w-full px-5 py-4 bg-gray-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-200 transition-all font-bold text-gray-700 border border-transparent focus:border-blue-500 cursor-pointer mb-6">
                <option value="">-- Выберите курс --</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              
              <button onClick={handleAddCourse} disabled={!selectedCourseId} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-lg shadow-blue-500/30 transition-all active:scale-95 text-lg disabled:opacity-50">
                Добавить
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛКА ДОБАВЛЕНИЯ В ГРУППУ */}
      <AnimatePresence>
        {showGroupModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-gray-900/60 backdrop-blur-sm flex justify-center items-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
              <button onClick={() => setShowGroupModal(false)} className="absolute top-5 right-5 p-2 bg-gray-50 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                <X className="w-5 h-5"/>
              </button>
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black mb-2 text-gray-900">Добавить в группу</h3>
              <p className="text-gray-500 font-medium mb-6 text-sm">Выберите группу для добавления</p>
              
              <select value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)} className="w-full px-5 py-4 bg-gray-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-purple-200 transition-all font-bold text-gray-700 border border-transparent focus:border-purple-500 cursor-pointer mb-6">
                <option value="">-- Выберите группу --</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
              
              <button onClick={handleAddToGroup} disabled={!selectedGroupId} className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black shadow-lg shadow-purple-500/30 transition-all active:scale-95 text-lg disabled:opacity-50">
                Добавить
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛКА НАЗНАЧЕНИЯ ПРЕДМЕТА */}
      <AnimatePresence>
        {showSubjectModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-gray-900/60 backdrop-blur-sm flex justify-center items-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
              <button onClick={() => setShowSubjectModal(false)} className="absolute top-5 right-5 p-2 bg-gray-50 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                <X className="w-5 h-5"/>
              </button>
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black mb-2 text-gray-900">Назначить предмет</h3>
              <p className="text-gray-500 font-medium mb-6 text-sm">Выберите предмет для преподавания</p>
              
              <select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} className="w-full px-5 py-4 bg-gray-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-200 transition-all font-bold text-gray-700 border border-transparent focus:border-emerald-500 cursor-pointer mb-6">
                <option value="">-- Выберите предмет --</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
              
              <button onClick={handleAssignSubject} disabled={!selectedSubjectId} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-lg shadow-emerald-500/30 transition-all active:scale-95 text-lg disabled:opacity-50">
                Назначить
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* СОЗДАНИЕ АККАУНТА */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl relative">
              <button onClick={() => setShowCreateModal(false)} className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-600" />
              </button>
              <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                <Plus className="w-6 h-6 text-[#5A4BFF]" /> Новый аккаунт
              </h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 ml-1">Имя</label>
                    <input value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})}
                      placeholder="Иван" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#5A4BFF] font-bold transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 ml-1">Фамилия</label>
                    <input value={createForm.surname} onChange={e => setCreateForm({...createForm, surname: e.target.value})}
                      placeholder="Иванов" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#5A4BFF] font-bold transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 ml-1">Email *</label>
                  <input type="email" required value={createForm.email} onChange={e => setCreateForm({...createForm, email: e.target.value})}
                    placeholder="ivan@example.com" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#5A4BFF] font-bold transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 ml-1">Пароль *</label>
                  <input type="text" required value={createForm.password} onChange={e => setCreateForm({...createForm, password: e.target.value})}
                    placeholder="Минимум 6 символов" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#5A4BFF] font-bold transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 ml-1">Роль</label>
                  <select value={createForm.role} onChange={e => setCreateForm({...createForm, role: e.target.value as Role})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#5A4BFF] font-bold transition-all appearance-none cursor-pointer">
                    <option value="STUDENT">Ученик</option>
                    <option value="TEACHER">Преподаватель</option>
                    <option value="CURATOR">Куратор</option>
                    <option value="ADMIN">Администратор</option>
                    <option value="PARENT">Родитель</option>
                  </select>
                </div>
                <button type="submit" disabled={isCreating}
                  className="w-full py-4 bg-[#5A4BFF] text-white rounded-2xl font-black text-base hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-70 mt-2">
                  {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5" /> Создать аккаунт</>}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50, scale: 0.3 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.8 }} className={`fixed bottom-10 right-10 z-[9999] px-6 py-4 rounded-2xl shadow-2xl font-black text-white flex items-center gap-3 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
            {toast.type === 'success' ? <Check className="w-6 h-6" /> : <X className="w-6 h-6" />}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
