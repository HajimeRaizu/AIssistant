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
import GoogleAuthCallback from './components/loginGoogle/googleAuthCallback';
import { GoogleOAuthProvider } from '@react-oauth/google';

// Suppress DOMNodeInserted mutation warning (for deprecated API used by Quill)
const originalWarn = console.warn;
console.warn = function (...args) {
  const msg = args[0];
  if (
    typeof msg === 'string' &&
    msg.includes("Listener added for a 'DOMNodeInserted' mutation event")
  ) {
    return; // Suppress this specific warning
  }
  originalWarn.apply(console, args);
};

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
  {
    path: '/google-auth-callback',
    element: <GoogleAuthCallback />,
  },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});

function App() {
  const CLIENT_ID = "966546103505-am2u7fu5r31t4g0bq3n1ecp4chg7ji8j.apps.googleusercontent.com";
  return <GoogleOAuthProvider clientId={CLIENT_ID}>
    <RouterProvider
      router={router}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    />
  </GoogleOAuthProvider>
}

export default App;
