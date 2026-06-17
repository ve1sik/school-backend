import { Suspense, lazy, useEffect, type ComponentType } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import PageSpinner from './components/PageSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import BootGate from './components/BootGate';
import Login from './pages/Login';
import { clearBootOverlay } from './lib/boot';

const lazyPage = (loader: () => Promise<{ default: ComponentType }>) =>
  lazy(() =>
    loader().catch((err) => {
      console.error('Failed to load page chunk', err);
      return { default: () => <PageSpinner message="Не удалось загрузить страницу. Обновите." /> };
    }),
  );

const Layout = lazyPage(() => import('./pages/Layout'));
const Dashboard = lazyPage(() => import('./pages/Dashboard'));
const StudentCourses = lazyPage(() => import('./pages/StudentCourses'));
const CourseThemes = lazyPage(() => import('./pages/CourseThemes'));
const CourseView = lazyPage(() => import('./pages/CourseView'));
const Mistakes = lazyPage(() => import('./pages/Mistakes'));
const AdminCourses = lazyPage(() => import('./pages/AdminCourses'));
const Profile = lazyPage(() => import('./pages/Profile'));
const Schedule = lazyPage(() => import('./pages/Schedule'));
const Homework = lazyPage(() => import('./pages/Homework'));
const HomeworkView = lazyPage(() => import('./pages/HomeworkView'));
const Cards = lazyPage(() => import('./pages/Cards'));
const Messages = lazyPage(() => import('./pages/Messages'));
const Settings = lazyPage(() => import('./pages/Settings'));
const ParentDashboard = lazyPage(() => import('./pages/ParentDashboard'));
const CuratorDashboard = lazyPage(() => import('./pages/CuratorDashboard'));
const CuratorMessages = lazyPage(() => import('./pages/CuratorMessages'));
const Shop = lazyPage(() => import('./pages/Shop'));
const AdminGroups = lazyPage(() => import('./pages/AdminGroups'));
const AdminUsers = lazyPage(() => import('./pages/AdminUsers'));
const AdminDecks = lazyPage(() => import('./pages/AdminDecks'));
const FlashcardStudy = lazyPage(() => import('./pages/FlashcardStudy'));
const Achievements = lazyPage(() => import('./pages/Achievements'));

const NON_PARENT: any = ['ADMIN', 'CURATOR', 'TEACHER', 'STUDENT'];

export default function App() {
  // React уже запущен — убираем HTML-оверлей даже если lazy-чанк ещё грузится (BootGate не смонтирован).
  useEffect(() => {
    clearBootOverlay();
  }, []);

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageSpinner />}>
        <Routes>
        <Route path="/login" element={<BootGate><Login /></BootGate>} />

        <Route
          path="/parent-dashboard"
          element={
            <BootGate>
              <ProtectedRoute roles={['PARENT', 'ADMIN']}>
                <ParentDashboard />
              </ProtectedRoute>
            </BootGate>
          }
        />

        <Route
          path="/curator"
          element={
            <BootGate>
              <ProtectedRoute permissions={['CURATOR_DASHBOARD']}>
                <CuratorDashboard />
              </ProtectedRoute>
            </BootGate>
          }
        />
        <Route
          path="/curator/messages"
          element={
            <BootGate>
              <ProtectedRoute permissions={['CURATOR_DASHBOARD']}>
                <CuratorMessages />
              </ProtectedRoute>
            </BootGate>
          }
        />

        <Route
          path="/"
          element={
            <BootGate>
              <ProtectedRoute roles={NON_PARENT}>
                <Layout />
              </ProtectedRoute>
            </BootGate>
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

        <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
