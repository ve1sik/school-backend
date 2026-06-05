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
import HomeworkView from './pages/HomeworkView';
import Cards from './pages/Cards';
import Messages from './pages/Messages';
import Settings from './pages/Settings';
import ParentDashboard from './pages/ParentDashboard';
import CuratorDashboard from './pages/CuratorDashboard';
import CuratorMessages from './pages/CuratorMessages';
import Shop from './pages/Shop';

// 🔥 Наша админка Групп и Пользователей
import AdminGroups from './pages/AdminGroups';
import AdminUsers from './pages/AdminUsers';
import AdminDecks from './pages/AdminDecks';
import FlashcardStudy from './pages/FlashcardStudy';
import Achievements from './pages/Achievements';

import ProtectedRoute from './components/ProtectedRoute';

const STAFF: any = ['ADMIN', 'CURATOR', 'TEACHER'];
const NON_PARENT: any = ['ADMIN', 'CURATOR', 'TEACHER', 'STUDENT'];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/parent-dashboard"
        element={
          <ProtectedRoute roles={['PARENT', 'ADMIN']}>
            <ParentDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/curator"
        element={
          <ProtectedRoute roles={STAFF}>
            <CuratorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/curator/messages"
        element={
          <ProtectedRoute roles={STAFF}>
            <CuratorMessages />
          </ProtectedRoute>
        }
      />

      {/* ВСЁ, ЧТО ВНУТРИ ЭТОГО БЛОКА, БУДЕТ С ПАНЕЛЬЮ (LAYOUT) — ТОЛЬКО НЕ PARENT */}
      <Route
        path="/"
        element={
          <ProtectedRoute roles={NON_PARENT}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="courses" element={<StudentCourses />} />
        <Route path="course/:courseId" element={<CourseThemes />} />
        
        {/* Плеер для ТЕОРИИ */}
        <Route path="course/:courseId/theme/:themeId" element={<CourseView />} />
        
        <Route path="mistakes/:themeId" element={<Mistakes />} />
        <Route path="profile" element={<Profile />} />
        
        {/* 🔥 АДМИНКА */}
        <Route path="admin" element={<ProtectedRoute roles={STAFF}><AdminCourses /></ProtectedRoute>} />
        <Route path="admin/groups" element={<ProtectedRoute roles={['ADMIN', 'CURATOR']}><AdminGroups /></ProtectedRoute>} />
        <Route path="admin/users" element={<ProtectedRoute roles={['ADMIN', 'CURATOR']}><AdminUsers /></ProtectedRoute>} />
        <Route path="admin/decks" element={<ProtectedRoute roles={['ADMIN', 'TEACHER']}><AdminDecks /></ProtectedRoute>} />
        
        <Route path="schedule" element={<Schedule />} />
        
        {/* Главная страница домашек (Карточки) */}
        <Route path="homework" element={<Homework />} />
        {/* Новый Плеер только для ДОМАШЕК */}
        <Route path="homework/:courseId/theme/:themeId/lesson/:lessonId" element={<HomeworkView />} />
        
        <Route path="cards" element={<Cards />} />
        <Route path="achievements" element={<Achievements />} />
        <Route path="messages" element={<Messages />} />
        <Route path="settings" element={<Settings />} />

        {/* 🔥 ПЕРЕНЕСЛИ ШОП СЮДА — ТЕПЕРЬ ТУТ БУДЕТ САЙДБАР */}
        <Route path="shop" element={<Shop />} />
      </Route>

      <Route
        path="homework/:id"
        element={
          <ProtectedRoute roles={NON_PARENT}>
            <HomeworkView />
          </ProtectedRoute>
        }
      />
      <Route
        path="flashcards"
        element={
          <ProtectedRoute roles={NON_PARENT}>
            <FlashcardStudy />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}