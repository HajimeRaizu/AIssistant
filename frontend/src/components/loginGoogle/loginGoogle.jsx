import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./loginGoogle.css";
import "./loginGoogle_android.css";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import Swal from 'sweetalert2';
import logo from '../assets/AIssistant.png';

const LoginButton = ({ onSuccess, onError }) => {
  const base_url = `https://aissistant-backend.vercel.app`;
  //const base_url = `http://localhost:5000`;
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleGoogleCallback = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const error = params.get('error');

      if (error) {
        Swal.fire({
          title: "Error",
          text: `Google login failed: ${error}`,
          icon: "error",
        });
        navigate("/");
        return;
      }

      if (code) {
        try {
          // Exchange the authorization code for tokens
          const tokenResponse = await axios.post(`${base_url}/api/exchange-google-code`, {
            code: code,
            redirect_uri: window.location.origin + "/googleLogin"
          });
  
          // OPTIONAL CLEANUP: Remove 'code' from the URL after it's used
          const cleanURL = new URL(window.location.href);
          cleanURL.searchParams.delete('code');
          cleanURL.searchParams.delete('error');
          window.history.replaceState({}, document.title, cleanURL.pathname); // replace URL without reloading
  
          const credential = tokenResponse.data.credential;
          const decodedToken = jwtDecode(credential);
  
          // Register or login the user
          const response = await axios.post(`${base_url}/api/googleLogin`, {
            email: decodedToken.email,
            name: decodedToken.name,
            profileImage: decodedToken.picture,
          });
  
          const userData = response.data;
  
          localStorage.setItem("userId", userData.id);
          localStorage.setItem("userName", userData.name);
          localStorage.setItem("userEmail", userData.email);
          localStorage.setItem("userRole", userData.role);
          localStorage.setItem("isAuthenticated", "true");
          localStorage.setItem("profileImage", userData.profileImage);
  
          // Navigate based on role
          if (userData.role === "instructor") {
            navigate("/instructor");
          } else if (userData.role === "admin") {
            navigate("/admin");
          } else if (userData.role === "student") {
            navigate("/student-landing");
          }
        } catch (error) {
          console.error("Error during Google login:", error);
          Swal.fire({
            title: "Failed",
            text: "Failed to login with Google",
            icon: "error",
          });
          navigate("/");
        }
      }

    };

    handleGoogleCallback();
  }, [location, navigate]);

  const login = useGoogleLogin({
    flow: "auth-code",
    ux_mode: "redirect",
    redirect_uri: `${window.location.origin}/googleLogin`,
    scope: "email profile",
    onSuccess: onSuccess,
    onError: onError,
  });

  
  return (
    <div className="wrapper">
      <button 
        onClick={() => login()} 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'white',
          color: '#5F6368',
          border: '1px solid #dadce0',
          borderRadius: '4px',
          padding: '10px 16px',
          fontSize: '14px',
          fontWeight: 500,
          fontFamily: 'Roboto, sans-serif',
          cursor: 'pointer',
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.08)',
          transition: 'background-color 0.2s, box-shadow 0.2s',
          minWidth: '240px',
          ':hover': {
            boxShadow: '0 1px 3px 0 rgba(0,0,0,0.2)',
            backgroundColor: '#f8f9fa'
          },
          ':active': {
            backgroundColor: '#f1f3f4'
          }
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          style={{ marginRight: '12px' }}
        >
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Sign in with Google
      </button>
    </div>
  );
};

const LoginGoogle = () => {
  const base_url = `https://aissistant-backend.vercel.app`;
  //const base_url = `http://localhost:5000`;
  const navigate = useNavigate();
  const isAuthenticated = localStorage.getItem("isAuthenticated") || null;
  const userId = localStorage.getItem("userId") || null;
  const userName = localStorage.getItem("userName") || null;
  const userRole = localStorage.getItem("userRole") || null;
  const userEmail = localStorage.getItem("userEmail") || null;
  const userPicture = localStorage.getItem("profileImage") || null;
  const CLIENT_ID = "792236607213-gt12gkp3eqkttq68f0gtvfivhfvcjdih.apps.googleusercontent.com";

  useEffect(() => {
    if (isAuthenticated&&userId&&userName&&userEmail&&userPicture&&userRole === 'student') {
      navigate("/student-landing");
    } else if(isAuthenticated&&userId&&userName&&userEmail&&userPicture&&userRole === 'instructor'){
      navigate("/instructor");
    } else if(isAuthenticated&&userId&&userName&&userEmail&&userPicture&&userRole === 'admin'){
      navigate("/admin");
    }
  }, [userId, navigate]);

  const handleGoogleLoginSuccess = async (credentialResponse) => {
    const decodedToken = jwtDecode(credentialResponse.credential);
  
    try {  
      // Send the user data to the server to check or create the user
      const response = await axios.post(`${base_url}/api/googleLogin`, {
        email: decodedToken.email,
        name: decodedToken.name,
        profileImage: decodedToken.picture,
      });
  
      const userData = response.data;
  
      // Store the user info in localStorage or sessionStorage
      localStorage.setItem("userId", userData.id); // Store the user ID
      localStorage.setItem("userName", userData.name); // Store the user's name
      localStorage.setItem("userEmail", userData.email); // Store the user's email
      localStorage.setItem("userRole", userData.role); // Store the user's role
      localStorage.setItem("isAuthenticated", "true"); // Mark the user as authenticated
      localStorage.setItem("profileImage", userData.profileImage); // Store the profile image URL
  
      // Redirect based on the user's role
      if (userData.role === "instructor") {
        navigate("/instructor");
      } else if (userData.role === "admin") {
        navigate("/admin");
      } else if (userData.role === "student"){
        navigate("/student-landing"); // Redirect to the student page
      }
    } catch (error) {
      console.error("Error during Google login:", error);
      Swal.fire({
        title: "Failed",
        text: "Failed to login with Google",
        icon: "error",
      })
    }
  };

  const handleGoogleLoginError = () => {
    Swal.fire({
      title: "Failed",
      text: "Failed to login with Google",
      icon: "error",
    })
  };

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <div className="login-container">
        <div className="login-box">
          <div className="welcome">
            <div style={{display: 'flex', flexDirection: 'row'}}><h1 style={{marginRight:'11px'}}>Welcome to</h1><h1 style={{color: 'rgb(216, 198, 250)'}}>AI</h1><h1 style={{color: 'white'}}>ssistant</h1></div>
          </div>

          <h4 className="companion" style={{color: 'white', marginBottom: '10px'}}>Login with NEMSU email</h4>

          <LoginButton 
            onSuccess={handleGoogleLoginSuccess} 
            onError={handleGoogleLoginError} 
          />
        </div>
        <div className='login-logo'>
          <img src={logo} alt="AIssistant Icon" className='login-icon' />
        </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default LoginGoogle;