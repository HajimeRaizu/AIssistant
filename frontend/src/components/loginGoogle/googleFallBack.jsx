// src/components/GoogleCallback.js
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import Swal from 'sweetalert2';

const GoogleCallback = () => {
  const navigate = useNavigate();
  const base_url = `http://localhost:5000`;

  useEffect(() => {
    const handleGoogleRedirect = async () => {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const credential = params.get('credential');
      
      if (!credential) {
        Swal.fire('Error', 'No credential received', 'error');
        navigate('/login');
        return;
      }

      try {
        const decodedToken = jwtDecode(credential);
        
        if (!decodedToken.email.endsWith("@nemsu.edu.ph")) {
          Swal.fire("Invalid email", "Only NEMSU emails allowed", "error");
          navigate('/login');
          return;
        }

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
        
      } catch (error) {
        console.error("Google login error:", error);
        Swal.fire("Error", "Login failed", "error");
        navigate('/login');
      }
    };

    handleGoogleRedirect();
  }, [navigate]);

  return <div>Loading...</div>;
};

export default GoogleCallback;