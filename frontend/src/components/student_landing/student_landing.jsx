import React from 'react';
import './student_landing.css';
import logo from '../assets/AIssistant.png';
import { useNavigate } from 'react-router-dom';

const StudentLanding = () => {
  const navigate = useNavigate();

  // Function to handle box clicks
  const handleBoxClick = (path) => {
    // Store the selected path in sessionStorage
    sessionStorage.setItem('redirectPath', path);
    // Redirect to the login page
    navigate(path);
  };

  return (
    <div className="landing-page">
      {/* Header Section */}
      <header className="header">
        <img src={logo} alt="AIssistant logo" className="landing-page-logo" />
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className='landing-aissistant'><h1 className='ai'>AI</h1><h1 className='landing-welcome'>ssistant</h1></div>
        <p>Your personal academia companion</p>
      </section>

      {/* Action Boxes Section */}
      <section className="action-boxes">
        <div
          className="box"
          onClick={() => handleBoxClick('/student')} // Redirect to AI Chat page
        >
          <h2>AIssistant Chat</h2>
          <p>Engage in conversations with AIssistant.</p>
        </div>
        <div
          className="box"
          onClick={() => handleBoxClick('/exercises')} // Redirect to Exercises page
        >
          <h2>AIssistant Learn</h2>
          <p>Practice and improve your skills with interactive exercises.</p>
        </div>
      </section>
    </div>
  );
};

export default StudentLanding;