import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./loginGoogle.css";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

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

  useEffect(() => {
    if (isAuthenticated&&userId&&userName&&userEmail&&userPicture&&userRole === 'student') {
      navigate("/student");
    } else if(isAuthenticated&&userId&&userName&&userEmail&&userPicture&&userRole === 'instructor'){
      navigate("/instructor");
    } else if(isAuthenticated&&userId&&userName&&userEmail&&userPicture&&userRole === 'admin'){
      navigate("/admin");
    }
  }, [userId, navigate]);

  const handleGoogleLoginSuccess = async (credentialResponse) => {
    const decodedToken = jwtDecode(credentialResponse.credential);
  
    try {
      // Check if the email ends with @nemsu.edu.ph
      if (!decodedToken.email.endsWith("@nemsu.edu.ph")) {
        alert("Invalid email.");
        return;
      }
  
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
      } else {
        navigate("/student"); // Redirect to the student page
      }
    } catch (error) {
      console.error("Error during Google login:", error);
      alert("Failed to process Google login.");
    }
  };

  const handleGoogleLoginError = () => {
    console.log("Login failed");
    alert("Failed to login with Google");
  };

  return (
    <GoogleOAuthProvider clientId="792236607213-gt12gkp3eqkttq68f0gtvfivhfvcjdih.apps.googleusercontent.com">
      <div className="centered">
        <div className="welcome">
          <h1>Welcome to AIssistant</h1>
        </div>

        <h4 className="companion">Instructor Login</h4>

        <div className="wrapper">
          <GoogleLogin
            onSuccess={handleGoogleLoginSuccess}
            onError={handleGoogleLoginError}
            scope="email profile"
          />
        </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default LoginGoogle;