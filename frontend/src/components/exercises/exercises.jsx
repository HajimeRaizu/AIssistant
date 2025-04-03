import React, { useState, useEffect } from "react";
import "./exercises.css";
import "./exercises_android.css";
import { MdLightMode, MdDarkMode, MdChevronLeft, MdChevronRight, MdMoreVert } from "react-icons/md";
import { BsVolumeUp, BsVolumeUpFill } from "react-icons/bs";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from 'sweetalert2'
import { IoIosChatboxes } from "react-icons/io";
import book from '../assets/book-removebg-preview.png';

const ExercisesPage = () => {
  const base_url = `https://aissistant-backend.vercel.app`;
  //const base_url = `http://localhost:5000`;
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [tutorial, setTutorial] = useState(false);
  const [tutorial2, setTutorial2] = useState(false);
  const [tutorial3, setTutorial3] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [learningMaterials, setLearningMaterials] = useState({});
  const [userAnswers, setUserAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [subjectId, setSubjectId] = useState("");
  const [studentId, setStudentId] = useState(localStorage.getItem("userId") || "");
  const [hasSubjectCode, setHasSubjectCode] = useState(false);
  const [userRole, setUserRole] = useState(localStorage.getItem("userRole") || "");
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [showOptions, setShowOptions] = useState(null);
  const [isReading, setIsReading] = useState(false);
  const navigate = useNavigate();

  const isAuthenticated = localStorage.getItem("isAuthenticated");
  const userName = localStorage.getItem("userName");
  const userEmail = localStorage.getItem("userEmail");
  const userPicture = localStorage.getItem("profileImage");

  const [currentCSS, setCurrentCSS] = useState("");
  const [androidCSS, setAndroidCSS] = useState("");

  useEffect(() => {
    // 1. Place your text file in the public folder
    //    (e.g., public/exercises.txt)
    fetch('/offline_exercises.css')
      .then(response => {
        if (!response.ok) {
          throw new Error('File not found');
        }
        return response.text();
      })
      .then(text => {
        // 2. This will contain the raw file content
        setCurrentCSS(text);
      })
      .catch(error => {
        console.error('Error loading text file:', error);
      });

    fetch('/offline_exercises_android.css')
      .then(response => {
        if (!response.ok) {
          throw new Error('File not found');
        }
        return response.text();
      })
      .then(text => {
        // 2. This will contain the raw file content
        setAndroidCSS(text);
      })
      .catch(error => {
        console.error('Error loading text file:', error);
      });
  }, []);

  useEffect(() => {
    console.log(currentCSS)
    window.speechSynthesis.cancel();
    const fetchUserRole = async () => {
      if (userEmail) {
        try {
          const response = await axios.get(`${base_url}/api/getUserRole`, {
            params: { email: userEmail },
          });
          const role = response.data.role;

          setUserRole(role);
          localStorage.setItem("userRole", role);

          if (role === "student") {
            return;
          } else if (role === "admin") {
            navigate("/admin");
          } else if (role === "instructor") {
            navigate("/instructor");
          } else {
            navigate("/user-type");
          }
        } catch (error) {
          console.error("Failed to fetch user role:", error);
          navigate("/user-type");
        } finally {
          setIsLoading(false);
        }
      } else {
        navigate("/user-type");
      }
    };

    fetchUserRole();
  }, [studentId, userEmail, navigate]);

  useEffect(() => {
    if (studentId) {
      fetchLearningMaterials();
    }
  }, [studentId]);

  const fetchLearningMaterials = async () => {
    try {
      const accessResponse = await axios.get(`${base_url}/api/getAccessLearningMaterials`, {
        params: { studentId },
      });
      const subjectCodes = accessResponse.data.subjectCodes;

      if (subjectCodes.length > 0) {
        setHasSubjectCode(true);
        const materialsResponse = await axios.get(`${base_url}/api/getLearningMaterials`, {
          params: { subjectCodes },
        });
        setLearningMaterials(materialsResponse.data);
      } else {
        setHasSubjectCode(false);
        setLearningMaterials({});
        setTutorial(true);
      }
    } catch (error) {
      console.error("Failed to fetch learning materials:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatText = (text, sender) => {
    if (!text) return null;
  
    if (sender === "bot") {
      const boldTextRegex = /\*\*(.*?)\*\*/g || /\`(.*?)\`/g; // Matches **bold** text
      const codeBlockRegex = /'''([\s\S]*?)'''/g; // Matches ```code blocks```
      const headingRegex = /###\s*(.*?)\n/g; // Matches ### headings
  
      // Split the text by code blocks first
      const parts = text.split(codeBlockRegex);
  
      return parts.map((part, index) => {
        if (index % 2 === 1) {
          // This is a code block
          return (
            <pre key={index} className={`student-code-block ${theme}`}>
              <code>{part}</code>
            </pre>
          );
        }
  
        // Process headings and bold text in non-code parts
        const headingParts = part.split(headingRegex);
        return (
          <span key={index}>
            {headingParts.map((headingPart, headingIndex) => {
              if (headingIndex % 2 === 1) {
                // This is a heading (###)
                return <h3 key={headingIndex}>{headingPart}</h3>;
              }
  
              // Process bold text in non-heading parts
              const boldParts = headingPart.split(boldTextRegex);
              return (
                <span key={headingIndex}>
                  {boldParts.map((boldPart, boldIndex) => {
                    if (boldIndex % 2 === 1) {
                      // This is bold text (**)
                      return <strong key={boldIndex}>{boldPart}</strong>;
                    }
                    return boldPart;
                  })}
                </span>
              );
            })}
          </span>
        );
      });
    } else {
      // For user messages, just render the text as is
      return (
        <span className="student-message-text" style={{ whiteSpace: 'pre-wrap' }}>
          {text}
        </span>
      );
    }
  };

  const readOutLoud = () => {
    if ('speechSynthesis' in window) {
        // Clean text by removing markdown-like formatting
        const text = cleanText(learningMaterials[selectedSubject].lessons[selectedLesson].subtopics[selectedSubtopic].content);
        const speech = new SpeechSynthesisUtterance(text);

        speech.lang = 'en-US'; // Set language
        speech.rate = 1; // Adjust speed if needed
        speech.pitch = 1; // Adjust pitch if needed
        speech.volume = 1; // Adjust volume if needed

        // Stop any ongoing speech before starting a new one
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(speech);
        setIsReading(true);
    } else {
        alert("Sorry, your browser doesn't support text-to-speech!");
    }
};

// Function to clean markdown-like formatting
const cleanText = (text) => {
    if (!text) return '';

    return text
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove **bold** formatting
        .replace(/`(.*?)`/g, '$1') // Remove inline `code` formatting
        .replace(/'''([\s\S]*?)'''/g, '$1') // Remove triple backticks (```code```)
        .replace(/###\s*(.*?)\n/g, '$1\n'); // Remove headings (### Heading)
};


const stopSpeech = () => {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setIsReading(false);
    }
};

  const handleTutorial = () => {
    if (tutorial) {
      setTutorial(false);
      setTutorial2(true);
    } else if (!tutorial && tutorial2) {
      setTutorial2(false);
      setTutorial3(true);
    } else if (!tutorial && !tutorial2) {
      setTutorial3(false);
    }
  };

  const handleSubjectClick = (subject) => {
    setSelectedSubject(subject);
    setSelectedLesson(null);
    setSelectedSubtopic(null);
  };

  const handleLessonClick = (lessonIndex) => {
    setSelectedLesson(lessonIndex);
    setSelectedSubtopic(null);
  };

  const handleSubtopicClick = (subtopicIndex) => {
    setSelectedSubtopic(subtopicIndex);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
    localStorage.setItem("theme", theme === "dark" ? "light" : "dark");
  };

  const toggleSidebar = () => {
    setIsSidebarVisible((prev) => !prev);
  };

  const handleAnswerChange = (questionIndex, value) => {
    setUserAnswers((prevAnswers) => ({
      ...prevAnswers,
      [questionIndex]: value,
    }));
  };

  const checkAnswers = () => {
    const subtopic =
      learningMaterials[selectedSubject]?.lessons[selectedLesson]?.subtopics[selectedSubtopic];
  
    const correctAnswersArray = subtopic.answers
      .split(/\d+\.\s*/) // Split by numbers (e.g., "1. Answer")
      .filter((answer) => answer.trim() !== ""); // Remove empty values
  
    const results = {};
    let correctCount = 0;
    const totalQuestions = correctAnswersArray.length;
  
    for (let i = 0; i < totalQuestions; i++) {
      const correctAnswer = correctAnswersArray[i].trim().toLowerCase();
      const studentAnswer = userAnswers[i]?.trim()?.toLowerCase() || "";
  
      results[i] = studentAnswer === correctAnswer;
      if (results[i]) correctCount++;
    }

    Swal.fire({
      title: `You got ${correctCount} out of ${totalQuestions} questions.`,
      html: Object.keys(results)
          .map(
            (key) =>
              `Question ${parseInt(key) + 1}: ${results[key] ? "✅ Correct" : "❌ Incorrect"}`
          )
          .join("<br>"),
      icon: "info"
    });
  };  

  const handleSubjectCodeSubmit = async () => {
    if (!subjectId || !studentId) {
      Swal.fire({
        title: "Error!",
        text: "Please enter a valid subject ID.",
        icon: "error"
      });
      return;
    }

    try {
      const response = await axios.post(`${base_url}/api/addAccessLearningMaterial`, {
        studentId,
        subjectCode: subjectId,
      });

      if (response.status === 200) {
        Swal.fire({
          text: "Learning material added successfully!",
          icon: "success"
        });
        setHasSubjectCode(true);
        fetchLearningMaterials();
      } else {
        Swal.fire({
          text: "Invalid learning material code!",
          icon: "error"
        });
      }
    } catch (error) {
      console.error("Failed to add subject ID:", error);
      Swal.fire({
        title: "Failed to add subject ID",
        text: error.response?.data?.error,
        icon: "error"
      });
    } finally {
      setSubjectId("");
    }
  };

  const handleRemoveAccess = async (studentId, subjectCode) => {
    try {
      const response = await axios.delete(`${base_url}/api/removeAccessLearningMaterial`, {
        headers: { "Content-Type": "application/json" },
        data: { studentId, subjectCode }, // DELETE needs 'data' object
      });
  
      if (response.status === 200) {
        Swal.fire({
          text: "Subject removed successfully!",
          icon: "success"
        });
        // Update state to reflect the removed subject
        const updatedLearningMaterials = { ...learningMaterials };
        delete updatedLearningMaterials[subjectCode]; // Remove the subject from the state
        setLearningMaterials(updatedLearningMaterials); // Update the state
        fetchLearningMaterials();
        setSelectedSubject(null); // Reset the selected subject
      } else {
        Swal.fire({
          text: "Failed to remove Subject. Please try again.",
          icon: "error",
        })
      }
    } catch (error) {
      Swal.fire({
        title: "Failed to remove learning material",
        text: error.response?.data?.error || error.message,
        icon: "error",
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    sessionStorage.removeItem("userId");
    sessionStorage.removeItem("userName");
    navigate("/googleLogin");
  };

  const downloadOfflineVersion = async () => {
    try {
      // Get all necessary data
      const offlineData = {
        learningMaterials,
        theme: "light",
        selectedSubject,
        selectedLesson,
        selectedSubtopic,
        userAnswers,
        studentId,
        userRole,
        userName,
        userEmail,
        userPicture,
        hasSubjectCode,
        isReading
      };
  
      // Create the HTML content
      const htmlContent = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AIssistant - Exercises (Offline)</title>
    <style>
      ${currentCSS}
      ${androidCSS}
      
      /* Additional styles for offline version */
    </style>
  </head>
  <body>
    <div class="offline-exercises-page" id="app">
      <!-- Content will be rendered here by JavaScript -->
    </div>
  
    <script>
      // Store the offline data
      const appData = ${JSON.stringify(offlineData)};
      
      // Format text function (similar to React component)
      function formatText(text, sender) {
        if (!text) return '';
        
        if (sender === "bot") {
          // Clean text for display (simplified version)
          return text
            .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
            .replace(/\\'\\'\\'([\\s\\S]*?)\\'\\'\\'/g, '<pre><code>$1</code></pre>')
            .replace(/###\\s*(.*?)\\n/g, '<h3>$1</h3>')
            .replace(/\\n/g, '<br>');
        } else {
          return text;
        }
      }
      
      // Initialize the app
      document.addEventListener('DOMContentLoaded', function() {
        // Set theme from saved data
        document.body.className = 'offline-exercises-page ' + appData.theme;
        document.getElementById('app').className = 'offline-exercises-page ' + appData.theme;
        
        // Render the app
        renderApp();
      });
      
      // Main rendering function
      function renderApp() {
        const app = document.getElementById('app');
        app.innerHTML = '';
        
        // Render sidebar
        const sidebar = document.createElement('div');
        sidebar.className = \`offline-exercises-sidebar \${appData.theme} visible\`;
        sidebar.innerHTML = \`
          <h2>Subjects</h2>
          \${appData.hasSubjectCode ? \`
            <ul>
              \${Object.keys(appData.learningMaterials).map(subjectCode => \`
                <li class="offline-\${appData.theme} \${appData.selectedSubject === subjectCode ? 'active' : ''}" 
                    onclick="handleSubjectClick('\${subjectCode}')">
                  \${appData.learningMaterials[subjectCode].subjectName}
                </li>
              \`).join('')}
            </ul>
          \` : \`
            <p style="padding-top: 10px;">No subject IDs added yet.</p>
          \`}
        \`;
        app.appendChild(sidebar);
        
        // Render main content
        const content = document.createElement('div');
        content.className = \`offline-exercises-content \${appData.theme} sidebar-visible\`;
        
        // Render content based on current view
        if (!appData.selectedSubject && appData.hasSubjectCode) {
          // Subjects view
          const subjectsContainer = document.createElement('div');
          subjectsContainer.className = 'offline-subject-boxes';
          subjectsContainer.innerHTML = \`
            \${Object.keys(appData.learningMaterials).map(subjectCode => \`
              <div class="offline-subject-box \${appData.theme}" onclick="handleSubjectClick('\${subjectCode}')">
                <div class="offline-subject-box-header">
                  <h3>\${appData.learningMaterials[subjectCode].subjectName}</h3>
                </div>
                <p>\${appData.learningMaterials[subjectCode].ownerEmail}</p>
                <p>\${appData.learningMaterials[subjectCode].ownerName}</p>
              </div>
            \`).join('')}
          \`;
          content.appendChild(subjectsContainer);
        } else if (appData.selectedSubject !== null && appData.selectedLesson === null) {
          // Lessons view
          const lessonsContainer = document.createElement('div');
          lessonsContainer.className = 'offline-lessons';
          lessonsContainer.innerHTML = \`
            <h2 class="offline-\${appData.theme}">Lessons</h2>
            <button class="offline-back-button" onclick="handleBackToSubjects()">
              Back to Subjects
            </button>
            <ul>
              \${appData.learningMaterials[appData.selectedSubject].lessons.map((lesson, index) => \`
                <li class="offline-\${appData.theme}" onclick="handleLessonClick(\${index})">
                  \${lesson.lessonName}
                </li>
              \`).join('')}
            </ul>
          \`;
          content.appendChild(lessonsContainer);
        } else if (appData.selectedLesson !== null && appData.selectedSubtopic === null) {
          // Subtopics view
          const subtopicsContainer = document.createElement('div');
          subtopicsContainer.className = 'offline-subtopics';
          subtopicsContainer.innerHTML = \`
            <h2 class="offline-\${appData.theme}">Subtopics for \${appData.learningMaterials[appData.selectedSubject].lessons[appData.selectedLesson].lessonName}</h2>
            <button class="offline-back-button" onclick="handleBackToLessons()">
              Back to Lessons
            </button>
            <ul>
              \${appData.learningMaterials[appData.selectedSubject].lessons[appData.selectedLesson].subtopics.map((subtopic, index) => \`
                <li class="offline-\${appData.theme}" onclick="handleSubtopicClick(\${index})">
                  \${subtopic.subtopicCode} - \${subtopic.subtopicTitle}
                </li>
              \`).join('')}
            </ul>
          \`;
          content.appendChild(subtopicsContainer);
        } else if (appData.selectedSubtopic !== null) {
          // Subtopic content view
          const subtopic = appData.learningMaterials[appData.selectedSubject].lessons[appData.selectedLesson].subtopics[appData.selectedSubtopic];
          const subtopicContent = document.createElement('div');
          subtopicContent.className = \`offline-subtopic-content \${appData.theme}\`;
          subtopicContent.innerHTML = \`
            <h1 class="offline-\${appData.theme}">
              \${subtopic.subtopicCode} - \${subtopic.subtopicTitle}
              <button class="offline-read-button" onclick="alert('Text-to-speech not available offline')">
                \${appData.isReading ? '🔊' : '🔈'}
              </button>
            </h1>
            <p class="offline-line \${appData.theme}"></p>
            <span>
              \${formatText(subtopic.content, "bot")}
            </span>
            <div class="offline-button-container">
              <button class="offline-back-button" onclick="handleBackToSubtopics()">
                Back to Subtopics
              </button>
            </div>
          \`;
          content.appendChild(subtopicContent);
        } else if (!appData.selectedSubject && !appData.hasSubjectCode) {
          // No materials view
          const noMaterials = document.createElement('div');
          noMaterials.className = 'offline-no-learning-materials';
          noMaterials.innerHTML = \`
            <img class="offline-book" src="\${appData.bookImage || ''}" alt="Book">
            <p>Ask your instructors</p>
            <p>for available learning materials</p>
          \`;
          content.appendChild(noMaterials);
        }
        
        app.appendChild(content);
      }
      
      // Navigation functions
      function handleSubjectClick(subjectCode) {
        appData.selectedSubject = subjectCode;
        appData.selectedLesson = null;
        appData.selectedSubtopic = null;
        renderApp();
      }
      
      function handleLessonClick(lessonIndex) {
        appData.selectedLesson = lessonIndex;
        appData.selectedSubtopic = null;
        renderApp();
      }
      
      function handleSubtopicClick(subtopicIndex) {
        appData.selectedSubtopic = subtopicIndex;
        renderApp();
      }
      
      function handleBackToSubjects() {
        appData.selectedSubject = null;
        renderApp();
      }
      
      function handleBackToLessons() {
        appData.selectedLesson = null;
        renderApp();
      }
      
      function handleBackToSubtopics() {
        appData.selectedSubtopic = null;
        renderApp();
      }
      
      function toggleTheme() {
        appData.theme = appData.theme === 'dark' ? 'light' : 'dark';
        document.body.className = 'offline-exercises-page ' + appData.theme;
        document.getElementById('app').className = 'offline-exercises-page ' + appData.theme;
        localStorage.setItem('theme', appData.theme);
        renderApp();
      }
      
      // Make functions available globally
      window.handleSubjectClick = handleSubjectClick;
      window.handleLessonClick = handleLessonClick;
      window.handleSubtopicClick = handleSubtopicClick;
      window.handleBackToSubjects = handleBackToSubjects;
      window.handleBackToLessons = handleBackToLessons;
      window.handleBackToSubtopics = handleBackToSubtopics;
      window.toggleTheme = toggleTheme;
    </script>
  </body>
  </html>`;
  
      // Create blob with HTML type
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AIssistant-Exercises-Offline.html';
    
    // Append to body (required for Firefox)
    document.body.appendChild(a);
    
    // Trigger the download
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    // Optional: Show success message
    Swal.fire({
      title: 'Download Started',
      text: 'The offline version is being downloaded.',
      icon: 'success'
    });
      
    } catch (error) {
      console.error('Error generating offline version:', error);
      Swal.fire({
        title: 'Download Failed',
        text: 'An error occurred while generating the offline version.',
        icon: 'error'
      });
    }
  };

  const SubjectBox = ({ subject, subjectCode, ownerEmail, ownerName }) => {
    const [showOptions, setShowOptions] = useState(null);
  
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (showOptions && !event.target.closest(".subject-box-options-menu")) {
          setShowOptions(null);
        }
      };
  
      document.addEventListener("click", handleClickOutside);
      return () => {
        document.removeEventListener("click", handleClickOutside);
      };
    }, [showOptions]);
  
    return (
      <div className={`subject-box ${theme}`} onClick={() => handleSubjectClick(subjectCode)}>
        <div className="subject-box-header">
          <h3>{subject.subjectName}</h3>
          <div
            className="subject-box-options"
            onClick={(e) => {
              e.stopPropagation(); // Stop propagation here
              setShowOptions(showOptions === subjectCode ? null : subjectCode);
            }}
            title="Options"
          >
            <MdMoreVert />
          </div>
          {showOptions === subjectCode && (
            <div className="subject-box-options-menu">
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Stop propagation here
                  handleRemoveAccess(studentId, subject.subjectCode);
                }}
              >
                Remove
              </button>
            </div>
          )}
        </div>
        <p>{ownerEmail}</p>
        <p>{ownerName}</p>
      </div>
    );
  };

  if (isLoading) {
    return <div className={`loading-container ${theme}`}>Loading...</div>;
  }

  return (
    <div className={`exercises-page ${theme}`}>
      <div className={`exercise-tutorial-highlight ${tutorial}`} onClick={handleTutorial}></div>
      <div className={`exercise-tutorial ${tutorial}`} onClick={handleTutorial}>
        <span>
          <p>click here to add</p>
          <p>a subject using a</p>
          <p>subject code</p>
        </span>
      </div>
      <div className={`exercise-tutorial-highlight2 ${tutorial2}`} onClick={handleTutorial}></div>
      <div className={`exercise-tutorial2 ${tutorial2}`} onClick={handleTutorial}>
        <span>
          <p>click here to navigate</p>
          <p>to AIssistant chat</p>
        </span>
      </div>
      <div className={`exercise-tutorial-highlight3 ${tutorial3}`} onClick={handleTutorial}></div>
      <div className={`exercise-tutorial3 ${tutorial3}`} onClick={handleTutorial}>
        <span>
          <p>click here to toggle</p>
          <p>light mode and</p>
          <p>dark mode</p>
        </span>
      </div>
      <div className={`exercises-overlay ${isSidebarVisible ? "visible" : "hidden"}`} onClick={toggleSidebar} />
      <div className={`exercises-sidebar ${theme} ${isSidebarVisible ? "visible" : "hidden"}`}>
        <div className="student-profile">
          <img src={`${userPicture}`} alt={`${userName}.jpg`} />
          <p>{userName}</p>
        </div>
        <h2>Subjects</h2>
        <div className={`subject-code-input ${theme}`}>
          <input
            type="text"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            placeholder="Enter learning material code"
          />
        </div>
        <button onClick={handleSubjectCodeSubmit} className={`submit-button ${theme}`}>
          Submit
        </button>
        <button className={`download-button ${theme}`} onClick={downloadOfflineVersion} style={{marginTop: '10px'}}>Download Offline</button>
        {hasSubjectCode ? (
          <ul>
            {Object.keys(learningMaterials).map((subjectCode) => (
              <li
                key={subjectCode}
                className={`${theme} ${selectedSubject === subjectCode ? "active" : ""}`}
                onClick={() => handleSubjectClick(subjectCode)}
              >
                {learningMaterials[subjectCode].subjectName}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ paddingTop: "10px" }}>No subject IDs added yet. Please add a subject ID to view learning materials.</p>
        )}
        <button className={`exercises-logout-button ${theme}`} onClick={handleLogout}>
          Logout
        </button>
      </div>

      <button
        className={`exercises-sidebar-toggle ${theme} ${isSidebarVisible ? "sidebar-visible" : "sidebar-hidden"}`}
        onClick={toggleSidebar}
      >
        {isSidebarVisible ? <MdChevronLeft /> : <MdChevronRight />}
      </button>
      <button
        className={`exercises-sidebar-toggle2 ${theme} ${isSidebarVisible ? "sidebar-visible" : "sidebar-hidden"}`}
        onClick={toggleSidebar}
      >
        {isSidebarVisible ? <MdChevronRight /> : <MdChevronLeft />}
      </button>

      <div className={`exercises-content ${theme} ${isSidebarVisible ? "sidebar-visible" : "sidebar-hidden"}`}>
        <div className="exercises-header-container">
          <div className="exercises-header">
            {hasSubjectCode && selectedSubject && (
              <h1 className={theme}>{learningMaterials[selectedSubject].subjectName}</h1>
            )}
          </div>
          <div className="exercises-header-buttons">
            <div className="userName" style={{ paddingLeft: "10px" }}>
              {userName}
            </div>
            <img src={userPicture} className="userPicture" alt="" />
            <button title="Toggle theme" className={`exercises-theme-toggle ${theme} ${tutorial3}`} onClick={toggleTheme}>
              {theme === "dark" ? <MdLightMode /> : <MdDarkMode />}
            </button>
            <button title="Move to chat" className={`exercises-chat-button ${theme} ${tutorial2}`} onClick={() => navigate("/student")}>
              <IoIosChatboxes />
            </button>
          </div>
        </div>
        {hasSubjectCode && selectedSubject && selectedLesson === null && (
          <div className="lessons">
            <h2 className={theme}>Lessons</h2>
            <button className={`back-button ${theme}`} onClick={() => setSelectedSubject(null)}>
              Back to Subjects
            </button>
            <ul>
              {learningMaterials[selectedSubject].lessons.map((lesson, index) => (
                <li
                  key={index}
                  className={`${theme}`}
                  onClick={() => handleLessonClick(index)}
                >
                  {lesson.lessonName}
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasSubjectCode && selectedLesson !== null && selectedSubtopic === null && (
          <div className="subtopics">
            <h2 className={theme}>Subtopics for {learningMaterials[selectedSubject].lessons[selectedLesson].lessonName}</h2>
            <button className={`back-button ${theme}`} onClick={() => setSelectedLesson(null)}>
              Back to Lessons
            </button>
            <ul>
            {learningMaterials[selectedSubject]?.lessons[selectedLesson]?.subtopics &&
              learningMaterials[selectedSubject].lessons[selectedLesson].subtopics.map((subtopic, index) => (
                <li
                  key={index}
                  className={`${theme}`}
                  onClick={() => handleSubtopicClick(index)}
                >
                  {`${subtopic.subtopicCode} - ${subtopic.subtopicTitle}`}
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasSubjectCode && selectedSubtopic !== null && (
          <div className={`subtopic-content ${theme}`}>
            <h1 className={theme}>
              {learningMaterials[selectedSubject].lessons[selectedLesson].subtopics[selectedSubtopic].subtopicCode} -{" "}
              {learningMaterials[selectedSubject].lessons[selectedLesson].subtopics[selectedSubtopic].subtopicTitle}
              {isReading ? <button className="read-button" onClick={stopSpeech}><BsVolumeUpFill /></button> : <button className="read-button" onClick={readOutLoud}><BsVolumeUp /></button>}
            </h1>
            <p className={`line ${theme}`}></p>
            <span>
              <p>{formatText(learningMaterials[selectedSubject].lessons[selectedLesson].subtopics[selectedSubtopic].content, "bot")}</p>
            </span>
            <h3>Exercises</h3>
            <div className={`exercise-container ${theme}`}>
              {learningMaterials[selectedSubject].lessons[selectedLesson].subtopics[selectedSubtopic].questions
                .split("\n")
                .filter((line) => line.trim() !== "")
                .map((line, index) => {
                  const isNumberedQuestion = /^\d+\./.test(line);

                  return (
                    <React.Fragment key={index}>
                      <div className={`exercise-text ${theme}`}>{line}</div>
                      {isNumberedQuestion && (
                        <input
                          type="text"
                          value={userAnswers[index] || ""}
                          onChange={(e) => handleAnswerChange(index, e.target.value)}
                          className={`exercise-input ${theme}`}
                          placeholder="Your answer"
                        />
                      )}
                    </React.Fragment>
                  );
                })}
            </div>
            <div className="button-container">
              <button className={`back-button ${theme}`} onClick={() => setSelectedSubtopic(null)}>
                Back to Subtopics
              </button>
              <button className={`check-answers-button ${theme}`} onClick={checkAnswers}>
                Check Answers
              </button>
            </div>
          </div>
        )}

        {!selectedSubject && hasSubjectCode && (
          <div className="subject-boxes">
            {Object.keys(learningMaterials).map((subjectCode) => (
              <SubjectBox
                key={subjectCode}
                subject={learningMaterials[subjectCode]}
                subjectCode={subjectCode}
                ownerEmail={learningMaterials[subjectCode].ownerEmail}
                ownerName={learningMaterials[subjectCode].ownerName}
              />
            ))}
          </div>
        )}

        {!selectedSubject && !hasSubjectCode &&(
          <div className="no-learning-materials">
            <img className="book" src={book} alt={`Book.jpg`} />
            <p>Ask your instructors</p>
            <p>for available learning materials</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExercisesPage;