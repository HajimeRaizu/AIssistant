import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import Swal from 'sweetalert2';

const GoogleAuthCallback = () => {
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

      if (!code) {
        Swal.fire({
          title: "Error",
          text: "No authorization code found in the callback URL",
          icon: "error",
        });
        navigate("/");
        return;
      }

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
    };

    handleGoogleCallback();
  }, [location, navigate]);

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: '1.2rem',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div style={{
        width: '50px',
        height: '50px',
        border: '5px solid #f3f3f3',
        borderTop: '5px solid #3498db',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>
      <div>Processing Google login...</div>
      
      {/* Add this to your global CSS or style tag */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default GoogleAuthCallback;
