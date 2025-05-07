import './App.css';
import {
  createBrowserRouter,
  RouterProvider,
} from 'react-router-dom';
import AdminPage from './components/admin/admin_page';
import StudentPage from './components/student/student';
import StudentLanding from './components/student_landing/student_landing';
import ExercisesPage from './components/exercises/exercises';
import InstructorPage from './components/instructor/instructor_page';
import ProtectedRoute from "./ProtectedRoute";
import AIssistant from './components/aissistant/aissistant';
import LoginGoogle from './components/loginGoogle/loginGoogle';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AIssistant />,
  },
  {
    path: '/student-landing',
    element: (
      <ProtectedRoute>
        <StudentLanding />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <AdminPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/student',
    element: (
      <ProtectedRoute>
        <StudentPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/exercises',
    element: (
      <ProtectedRoute>
        <ExercisesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/instructor',
    element: (
      <ProtectedRoute>
        <InstructorPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/googleLogin',
    element: <LoginGoogle />,
  },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});

function App() {
  return <RouterProvider
    router={router}
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  />;
}

export default App;
