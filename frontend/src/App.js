import './App.css';
import LoginForm from './components/login_form/login_form';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import AdminPage from './components/admin/admin_page';
import UserPage from './components/user/user';
import LandingPage from './components/user_landing/landing_page';
import ExercisesPage from './components/exercises/exercises';
import InstructorPage from './components/instructor/instructor_page';
import InstructorLogin from './components/instructor_login/instructor_login';
import ProtectedRoute from "./ProtectedRoute";
import AIssistant from './components/aissistant/aissistant';
import UserType from './components/user_type/user_type';

function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<LandingPage />} />
        <Route path='/user-type' element={<UserType />}/>
        <Route path='/student-landing' element={<LandingPage/>}/>
        <Route path='/login' element={<LoginForm />} />
        <Route path='/admin' element={<AdminPage />} />
        <Route path='/user' element={<UserPage />} />
        <Route path='/exercises' element={<ExercisesPage />} />
        <Route path='/instructor' element={
          <ProtectedRoute>
            <InstructorPage/>
          </ProtectedRoute>
        } />
        <Route path="/instructor-login" element={<InstructorLogin />} />
      </Routes>
    </Router>
  );
}

export default App;