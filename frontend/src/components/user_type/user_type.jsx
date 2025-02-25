import React from 'react';
import './user_type.css';
import logo from '../assets/AIssistant.png';
import { useNavigate } from 'react-router-dom';

const UserType = () => {
    const navigate = useNavigate();

    // Function to handle box clicks
    const handleBoxClick = (path) => {
      // Store the selected path in sessionStorage
      sessionStorage.setItem('redirectPath', path);
      // Redirect to the login page
      navigate(path);
    };
  
    return (
      <div className="user-type-page">
        {/* Action Boxes Section */}
        <section className="user-type-action-boxes">
          <div
            className="user-type-box"
            onClick={() => handleBoxClick('/admin')} // Redirect to AI Chat page
          >
            <h2>Admin</h2>
            <p>Login as an admin and manage the users of AIssistant</p>
          </div>
          <div
            className="user-type-box"
            onClick={() => handleBoxClick('/instructor')} // Redirect to Exercises page
          >
            <h2>Instructor</h2>
            <p>Login as an instructor and upload learning materials for students to use</p>
          </div>

          <div
            className="user-type-box"
            onClick={() => handleBoxClick('/student-landing')} // Redirect to Exercises page
          >
            <h2>Student</h2>
            <p>Login as a student and interact with the AIssistant chat or view learning materials</p>
          </div>
        </section>
      </div>
    );
};

export default UserType;