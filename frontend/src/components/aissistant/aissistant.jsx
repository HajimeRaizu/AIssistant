import React, { useState, useEffect, useRef } from "react";
import './aissistant.css';
import logo from '../assets/AIssistant.png';
import { useNavigate } from 'react-router-dom';

const AIssistant = () => {
  const userRole = localStorage.getItem("userRole");
  const navigate = useNavigate();
  
  useEffect(() => {
    if (userRole === "student"){
      navigate('/student-landing');
    } if (userRole === "instructor"){
      navigate('/instructor');
    } else if (userRole === "admin"){
      navigate('/admin');
    } else{
      navigate('/');
    }
  }, [userRole, navigate]);

  // Function to handle box clicks
  const handleBoxClick = () => {
    navigate('/user-type');
  };

  return (
      <div className='aissistant-container'>
        <div className='aissistant-header'>
          <div className='landing-aissistant'><h1 className='ai' style={{color: '#085f93'}}>AI</h1><h1 className='landing-welcome'>ssistant</h1></div>
        </div>
        <div className="aissistant">
            <div className="aissistant-info">
              <span>
              <h2>Student</h2>
              <p>1. Login using nemsu workspace account</p>
              <p>2. Interact with AIssistant chat</p>
              <p>3. Enter class code</p>
              <p>4. Read and study learning materials</p>
              <p>5. Test your understanding with quizzes</p>
              </span>

              <span>
                <h2>Instructor</h2>
                <p>1. Login using nemsu workspace account</p>
                <p>2. Create learning materials</p>
                <p>3. View students' frequently asked questions</p>
              </span>
            </div>
          <div className='aissistant-logo'>
            <img src={logo} alt="AIssistant-logo" className='aissistant-icon' />
            <div className='aissistant-text'>
              <h1>Enhance Your Programming Skills with AIssistant</h1>
              <p className='single-text'>Master coding with AI-powered guidance and real-time feedback.</p>
              <p className='single-text'>Learn, practice, and improve—whether you're a beginner or an advanced developer.</p>
              <span className="combined-text">Master coding with AI-powered guidance and real-time feedback. Learn, practice, and improve—whether you're a beginner or an advanced developer.</span>
              <button onClick={() => handleBoxClick()} className='aissistant-user-type'>Get Started</button>
            </div>
          </div>
        </div>
      </div>
  );
};

export default AIssistant;