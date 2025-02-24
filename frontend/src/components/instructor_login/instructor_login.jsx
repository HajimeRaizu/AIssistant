import React from "react";
import { useNavigate } from "react-router-dom";
import "./instructor_login.css";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import axios from "axios"; // Import axios

const InstructorLogin = () => {
  const navigate = useNavigate();

  const handleGoogleLoginSuccess = async (credentialResponse) => {
    const decodedToken = jwtDecode(credentialResponse.credential);
  
    try {
      // Check if the email exists in the instructors collection
      const response = await axios.get("http://localhost:5000/api/checkInstructorEmail", {
        params: { email: decodedToken.email },
      });
  
      if (response.data.exists) {
        // Store the user info in localStorage
        localStorage.setItem("instructorEmail", decodedToken.email); // Store the email
        localStorage.setItem("instructorName", decodedToken.name);
        localStorage.setItem("isAuthenticated", "true");
  
        // Redirect to the instructor dashboard
        navigate("/instructor");
      } else {
        alert("Only authorized instructors are allowed to login.");
      }
    } catch (error) {
      console.error("Error checking instructor email:", error);
      alert("Failed to check instructor email.");
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

export default InstructorLogin;