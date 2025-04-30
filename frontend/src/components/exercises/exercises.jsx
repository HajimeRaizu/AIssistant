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
import { FaPaperclip, FaTrash } from "react-icons/fa";
import { RiDownload2Fill } from "react-icons/ri";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

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
  const [viewingAttachment, setViewingAttachment] = useState(null);
  const [attachmentType, setAttachmentType] = useState('');
  const [addNewSubject, setAddNewSubject] = useState(false);
  const [isAdding, setAddingNewSubject] = useState(false);
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

  // Remove all HTML tags
  const cleaned = text.replace(/<[^>]*>/g, '');

  // Decode HTML entities like &nbsp; &amp; etc. (optional)
  const textArea = document.createElement('textarea');
  textArea.innerHTML = cleaned;
  return textArea.value.trim();
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
    setAddingNewSubject(true);
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
      setAddingNewSubject(false);
      setAddNewSubject(false)
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

  const QUILL_MODULES = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'code-block'],
    ],
  };
  
  const QUILL_FORMATS = [
    'header',
    'bold', 'italic', 'underline',
    'list', 'bullet',
    'link', 'code-block'
  ];

  const getFileType = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      return 'image';
    }
    if (extension === 'pdf') {
      return 'pdf';
    }
    if (extension === 'docx') {
      return 'docx';
    }
    if (['ppt', 'pptx'].includes(extension)) {
      return 'ppt';
    }
    return 'other';
  };

  const handlePreviewAttachment = (attachment, e) => {
    e.preventDefault();
    const type = getFileType(attachment.name);
    setAttachmentType(type);
    setViewingAttachment(attachment);
  };

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
        <button onClick={() => {setAddNewSubject(true)}} className={`submit-button ${theme}`}>
          Add Subject
        </button>
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
                  style={{background: 'linear-gradient(190deg, #4d7affc2, #c0d0ffc2)'}}
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
                  style={{background: 'linear-gradient(190deg, #4d7affc2, #c0d0ffc2)'}}
                >
                  {`${subtopic.subtopicTitle}`}
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasSubjectCode && selectedSubtopic !== null && (
          <div className={`subtopic-content ${theme}`}>
            <h1 className={theme}>
              {learningMaterials[selectedSubject].lessons[selectedLesson].subtopics[selectedSubtopic].subtopicTitle}
              {isReading ? <button className={`read-button ${theme}`} onClick={stopSpeech}><BsVolumeUpFill /></button> : <button className="read-button" onClick={readOutLoud}><BsVolumeUp /></button>}
            </h1>
            <p className={`line ${theme}`}></p>
            
            {/* Replace the content display with ReactQuill */}
            <div className={`subtopic-quill-content ${theme}`}>
            <div className={`subtopic-content ${theme}`} dangerouslySetInnerHTML={{ __html: learningMaterials[selectedSubject].lessons[selectedLesson].subtopics[selectedSubtopic].content }} />
            </div>

            {/* Attachments section */}
            {learningMaterials[selectedSubject].lessons[selectedLesson].subtopics[selectedSubtopic].attachments?.length > 0 && (
              <div className={`attachments-section ${theme}`}>
                <h3>Attachments</h3>
                <div className="attachments-list">
                  {learningMaterials[selectedSubject].lessons[selectedLesson].subtopics[selectedSubtopic].attachments?.map((attachment, index) => {
                    // Determine file type and preview availability
                    const fileType = attachment.name.split('.').pop().toLowerCase();
                    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType);
                    const isPDF = fileType === 'pdf';
                    return (
                      <div
                        key={index}
                        className={`attachment-item ${theme}`}
                        onClick={(e) => handlePreviewAttachment(attachment, e)}
                      >
                        <div style={{display: 'flex', flexDirection: 'row', width: '100%'}}>
                          {/* Preview thumbnail */}
                          <div style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                            {isImage ? (
                              <img 
                                src={attachment.url} 
                                alt="Preview" 
                                style={{ 
                                  width: '100%', 
                                  height: '100%', 
                                  objectFit: 'cover',
                                  borderRadius: '3px'
                                }}
                              />
                            ) : isPDF ? (
                              <div style={{
                                width: '100%',
                                height: '100%',
                                background: '#ffebee',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '3px'
                              }}>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#d32f2f' }}>PDF</span>
                              </div>
                            ) : (
                              <div style={{
                                width: '100%',
                                height: '100%',
                                background: '#e3f2fd',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '3px'
                              }}>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1976d2' }}>
                                  {fileType.toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* File name */}
                          <div 
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              flexGrow: 1,
                              paddingLeft: '10px'
                            }}
                          >
                            <span style={{ fontWeight: '500' }}>{attachment.name}</span>
                          </div>
                        </div>
                    
                        <div style={{
                          display: 'flex',
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          width: '100%'
                        }}>
                          {/* File size */}
                          <span className="attachment-size" style={{ fontSize: '12px', color: '#666' }}>
                            {(attachment.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                    
                          {/* Download button */}
                          <a
                            href="#"
                            onClick={async (e) => {
                              e.stopPropagation(); // Stop parent onClick
                              e.preventDefault();  // Stop default <a> behavior

                              try {
                                const response = await fetch(attachment.url);
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);

                                const downloadLink = document.createElement('a');
                                downloadLink.href = url;
                                downloadLink.download = attachment.name;
                                document.body.appendChild(downloadLink);
                                downloadLink.click();
                                document.body.removeChild(downloadLink);

                                window.URL.revokeObjectURL(url); // Clean up blob URL
                              } catch (error) {
                                console.error('Download failed:', error);
                                alert('Failed to download file.');
                              }
                            }}
                            style={{
                              padding: '5px',
                              color: '#1976d2',
                              cursor: 'pointer',
                              fontSize: '24px'
                            }}
                            title="Download"
                          >
                            <RiDownload2Fill />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rest of the existing code... */}
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

      {/* File Viewer Modal */}
        {viewingAttachment && (
          <div className={`file-viewer-modal ${theme}`} onClick={() => setViewingAttachment(null)}>
            <div className="file-viewer-controls">
              <button 
                className={`close-viewer ${theme}`} 
                onClick={() => setViewingAttachment(null)}
              >
                &times;
              </button>
              <button
                className={`download-file-button ${theme}`}
                onClick={async () => {
                  try {
                    const response = await fetch(viewingAttachment.url);
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = viewingAttachment.name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                  } catch (error) {
                    console.error("Download failed:", error);
                    Swal.fire({
                      title: "Download Failed",
                      text: "Failed to download file",
                      icon: "error"
                    });
                  }
                }}
              >
                <RiDownload2Fill />
              </button>
              <h3>{viewingAttachment.name}</h3>
            </div>
            <div className="file-viewer-content">
              {attachmentType === 'pdf' && (
                <iframe 
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(viewingAttachment.url)}&embedded=true`}
                  width="100%" 
                  height="90%"
                  frameBorder="0"
                />
              )}
              
              {attachmentType === 'image' && (
                <img 
                  src={viewingAttachment.url} 
                  alt={viewingAttachment.name} 
                  style={{ maxWidth: '100%', maxHeight: '90%' }} 
                />
              )}
              
              {(attachmentType === 'docx' || attachmentType === 'ppt') && (
                <iframe
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewingAttachment.url)}`}
                  width="100%"
                  height="90%"
                  frameBorder="0"
                />
              )}
              
              {attachmentType === 'other' && (
                <div className={`no-preview ${theme}`}>
                  No preview available for this file type. 
                  <a href="#"
                    onClick={async (e) => {
                      e.preventDefault();
                      try {
                        const response = await fetch(viewingAttachment.url);
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = viewingAttachment.name;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                      } catch (error) {
                        console.error("Download failed:", error);
                        Swal.fire({
                          title: "Download Failed",
                          text: "Failed to download file",
                          icon: "error"
                        });
                      }
                    }}
                  >
                    Download
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {addNewSubject && (<div className="add-subject-modal">
          <div className={`add-subject-form ${theme}`}>
            <h1 style={{marginBottom: '20px'}}>Add Subject</h1>
            <div className={`subject-code-input ${theme}`}>
              <input
                type="text"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                placeholder="Enter learning material code"
              />
            </div>
              <div className="add-subject-buttons">
                <button onClick={handleSubjectCodeSubmit} className={`submit-button ${theme}`}>
                  {isAdding ? "Adding...":"Submit"}
                </button>
                <button onClick={() => {setAddNewSubject(false); setSubjectId("")}} className={`add-subject-cancel-button ${theme}`}>
                  Cancel
                </button>
              </div>
            </div>
          </div>)}
    </div>
  );
};

export default ExercisesPage;