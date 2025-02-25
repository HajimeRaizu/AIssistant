import React, { useState, useEffect } from "react";
import "./login_form.css";
import { MdOutlineMailOutline } from "react-icons/md";
import { RiLockPasswordLine } from "react-icons/ri";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

// Import the image
import logo from '../assets/AIssistant.png';  // Adjust the relative path to your image

const LoginForm = () => {
  const [studentId, setStudentId] = useState(''); // Change from email to studentId
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Check if the user is already authenticated
  useEffect(() => {
    const userId = localStorage.getItem("userId") || sessionStorage.getItem("userId");
    if (userId) {
      // Redirect to the stored path if already logged in
      const redirectPath = sessionStorage.getItem('redirectPath') || '/user';
      navigate(redirectPath);
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
  
    // Check for hardcoded admin credentials first
    if (studentId === 'admin' && password === 'admin123') {
      navigate('/admin');
      return;
    }
  
    // If not admin, check credentials against the database
    try {
      const response = await axios.post("https://aissistant-backend.vercel.app/api/login", {
        studentId, // Change from email to studentId
        password,
      });
  
      if (response.status === 200) {
        // Store userId and userName in localStorage or sessionStorage based on "Remember Me"
        localStorage.setItem("userId", response.data.user.id);
        localStorage.setItem("userName", response.data.user.name);
  
        // Get the redirect path from the location state or sessionStorage
        const redirectPath = location.state?.from?.pathname || sessionStorage.getItem('redirectPath') || '/user';
        
        // Clear the redirect path from sessionStorage
        sessionStorage.removeItem('redirectPath');
  
        // Redirect to the original path
        navigate(redirectPath);
      }
    } catch (error) {
      alert('Invalid credentials');
    }
  };

  return (
    <div className="centered">
      <div className='welcome'>
        <h1>Welcome to AIssistant</h1>
      </div>

      <h4 className='companion'>Your personal academia companion</h4>

      <div className="wrapper">
        <form onSubmit={handleLogin}>
          <img src={logo} alt="AIssistant logo" className="aissistant-logo" />
          <div className="input-box">
            <input
              type="text"
              placeholder="Student ID" // Change placeholder from "Email" to "Student ID"
              required
              value={studentId} // Change from email to studentId
              onChange={(e) => setStudentId(e.target.value)} // Change from setEmail to setStudentId
            />
            <MdOutlineMailOutline className="icon" />
          </div>
          <div className="input-box">
            <input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <RiLockPasswordLine className="icon" />
          </div>

          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;