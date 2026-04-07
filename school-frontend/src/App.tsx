import { Routes, Route } from 'react-router-dom';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import AdminCourses from './pages/AdminCourses';
import Home from './pages/Home'; // (оставляем, раз он у тебя есть в папке)

function App() {
  return (
    <Routes>
      {/* ВОТ ОН - НАШ НОВЫЙ ДИЗАЙН */}
      <Route path="/login" element={<Auth />} /> 
      
      <Route path="/" element={<Dashboard />} />
      <Route path="/admin/courses" element={<AdminCourses />} />
      <Route path="/home" element={<Home />} />
    </Routes>
  );
}

export default App;