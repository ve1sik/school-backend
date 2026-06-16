import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import PageSpinner from './components/PageSpinner';

const Login = lazy(() => import('./pages/Login'));
const Layout = lazy(() => import('./pages/Layout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const StudentCourses = lazy(() => import('./pages/StudentCourses'));
const CourseThemes = lazy(() => import('./pages/CourseThemes'));
const CourseView = lazy(() => import('./pages/CourseView'));
const Mistakes = lazy(() => import('./pages/Mistakes'));
const AdminCourses = lazy(() => import('./pages/AdminCourses'));
const Profile = lazy(() => import('./pages/Profile'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Homework = lazy(() => import('./pages/Homework'));
const HomeworkView = lazy(() => import('./pages/HomeworkView'));
const Cards = lazy(() => import('./pages/Cards'));
const Messages = lazy(() => import('./pages/Messages'));
const Settings = lazy(() => import('./pages/Settings'));
const ParentDashboard = lazy(() => import('./pages/ParentDashboard'));
const CuratorDashboard = lazy(() => import('./pages/CuratorDashboard'));
const CuratorMessages = lazy(() => import('./pages/CuratorMessages'));
const Shop = lazy(() => import('./pages/Shop'));
const AdminGroups = lazy(() => import('./pages/AdminGroups'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminDecks = lazy(() => import('./pages/AdminDecks'));
const FlashcardStudy = lazy(() => import('./pages/FlashcardStudy'));
const Achievements = lazy(() => import('./pages/Achievements'));

const NON_PARENT: any = ['ADMIN', 'CURATOR', 'TEACHER', 'STUDENT'];

export default function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
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
            <ProtectedRoute permissions={['CURATOR_DASHBOARD']}>
              <CuratorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/curator/messages"
          element={
            <ProtectedRoute permissions={['CURATOR_DASHBOARD']}>
              <CuratorMessages />
            </ProtectedRoute>
          }
        />

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
          <Route path="course/:courseId/theme/:themeId" element={<CourseView />} />
          <Route path="mistakes/:themeId" element={<Mistakes />} />
          <Route path="profile" element={<Profile />} />
          <Route path="admin" element={<ProtectedRoute permissions={['MANAGE_COURSES']}><AdminCourses /></ProtectedRoute>} />
          <Route path="admin/groups" element={<ProtectedRoute permissions={['MANAGE_GROUPS']}><AdminGroups /></ProtectedRoute>} />
          <Route path="admin/users" element={<ProtectedRoute permissions={['MANAGE_USERS']}><AdminUsers /></ProtectedRoute>} />
          <Route path="admin/decks" element={<ProtectedRoute permissions={['MANAGE_DECKS']}><AdminDecks /></ProtectedRoute>} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="homework" element={<Homework />} />
          <Route path="homework/:courseId/theme/:themeId/lesson/:lessonId" element={<HomeworkView />} />
          <Route path="cards" element={<Cards />} />
          <Route path="achievements" element={<Achievements />} />
          <Route path="messages" element={<Messages />} />
          <Route path="settings" element={<Settings />} />
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
    </Suspense>
  );
}
