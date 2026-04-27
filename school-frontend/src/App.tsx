import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './pages/Layout';
import Dashboard from './pages/Dashboard';
import StudentCourses from './pages/StudentCourses';
import CourseThemes from './pages/CourseThemes';
import CourseView from './pages/CourseView';
import Mistakes from './pages/Mistakes';
import AdminCourses from './pages/AdminCourses';
import Profile from './pages/Profile'; 
import Login from './pages/Login'; 
import Schedule from './pages/Schedule';
import Homework from './pages/Homework';
// 🔥 Импортируем наш новый плеер домашек
import HomeworkView from './pages/HomeworkView';
import Cards from './pages/Cards';
import Messages from './pages/Messages';
import Settings from './pages/Settings';
import ParentDashboard from './pages/ParentDashboard';
import CuratorDashboard from './pages/CuratorDashboard';
import CuratorMessages from './pages/CuratorMessages';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/parent-dashboard" element={<ParentDashboard />} />

      <Route path="/curator" element={<CuratorDashboard />} />
      <Route path="/curator/messages" element={<CuratorMessages />} />

      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="courses" element={<StudentCourses />} />
        <Route path="course/:courseId" element={<CourseThemes />} />
        
        {/* Плеер для ТЕОРИИ */}
        <Route path="course/:courseId/theme/:themeId" element={<CourseView />} />
        
        <Route path="mistakes/:themeId" element={<Mistakes />} />
        <Route path="profile" element={<Profile />} />
        <Route path="admin" element={<AdminCourses />} />
        <Route path="schedule" element={<Schedule />} />
        
        {/* 🔥 Главная страница домашек (Карточки) */}
        <Route path="homework" element={<Homework />} />
        {/* 🔥 Новый Плеер только для ДОМАШЕК */}
        <Route path="homework/:courseId/theme/:themeId/lesson/:lessonId" element={<HomeworkView />} />
        
        <Route path="cards" element={<Cards />} />
        <Route path="messages" element={<Messages />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="homework/:id" element={<HomeworkView />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}