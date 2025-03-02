import './App.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import AdminPage from './components/admin/admin_page';
import StudentPage from './components/student/student';
import StudentLanding from './components/student_landing/student_landing';
import ExercisesPage from './components/exercises/exercises';
import InstructorPage from './components/instructor/instructor_page';
import ProtectedRoute from "./ProtectedRoute";
import AIssistant from './components/aissistant/aissistant';
import UserType from './components/user_type/user_type';
import LoginGoogle from './components/loginGoogle/loginGoogle';

function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<AIssistant />} />
        <Route path='/user-type' element={<UserType />}/>
        <Route path='/student-landing' element={
          <ProtectedRoute>
            <StudentLanding/>
          </ProtectedRoute>
          }/>
        <Route path='/admin' element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
          } />
        <Route path='/student' element={
          <ProtectedRoute>
            <StudentPage />
          </ProtectedRoute>
          } />
        <Route path='/exercises' element={<ExercisesPage />} />
        <Route path='/instructor' element={
          <ProtectedRoute>
            <InstructorPage/>
          </ProtectedRoute>
        } />
        <Route path="/googleLogin" element={<LoginGoogle />} />
      </Routes>
    </Router>
  );
}

export default App;