import React, { useState, useEffect } from "react";
import "./exercises.css";
import "./exercises_android.css";
import { MdLightMode, MdDarkMode, MdChevronLeft, MdChevronRight, MdMoreVert } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { IoIosChatboxes } from "react-icons/io";

const ExercisesPage = () => {
  const base_url = `https://aissistant-backend.vercel.app`;
  //const base_url = `http://localhost:5000`;
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [tutorial, setTutorial] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState(null);
  const [theme, setTheme] = useState("light");
  const [learningMaterials, setLearningMaterials] = useState({});
  const [userAnswers, setUserAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [subjectId, setSubjectId] = useState("");
  const [studentId, setStudentId] = useState(localStorage.getItem("userId")||"");
  const [hasSubjectCode, setHasSubjectCode] = useState(false);
  const [userRole, setUserRole] = useState(localStorage.getItem("userRole") || "");
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [showOptions, setShowOptions] = useState(null); // State to manage the visibility of the three-dot menu
  const navigate = useNavigate();

  const isAuthenticated = localStorage.getItem("isAuthenticated");
  const userName = localStorage.getItem("userName");
  const userEmail = localStorage.getItem("userEmail");
  const userPicture = localStorage.getItem("profileImage");

  useEffect(() => {
    const fetchUserRole = async () => {
      if (userEmail) {
        try {
          const response = await axios.get(`${base_url}/api/getUserRole`, {
            params: { email: userEmail }
          });
          const role = response.data.role;

          setUserRole(role);
          localStorage.setItem("userRole", role);

          if (role === "student") {
            return
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const fetchLearningMaterials = async () => {
    try {
      const accessResponse = await axios.get(`${base_url}/api/getAccessLearningMaterials`, {
        params: { studentId },
      });
      const subjectIds = accessResponse.data.subjectIds;
  
      if (subjectIds.length > 0) {
        setHasSubjectCode(true);
        const materialsResponse = await axios.get(`${base_url}/api/getLearningMaterials`, {
          params: { subjectIds },
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

  const handleTutorial = () => {
    if (hasSubjectCode) {
      setTutorial(false);
    } else {
      setTutorial(false);
    }
  };

  const handleSubjectClick = (subject) => {
    setSelectedSubject(subject);
    setSelectedLesson(null);
    setSelectedSubtopic(null);
  };

  const handleLessonClick = (lesson) => {
    setSelectedLesson(lesson);
    setSelectedSubtopic(null);
  };

  const handleSubtopicClick = (subtopic) => {
    setSelectedSubtopic(subtopic);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const toggleSidebar = () => {
    setIsSidebarVisible(prev => !prev);
  };

  const handleAnswerChange = (questionIndex, value) => {
    setUserAnswers((prevAnswers) => ({
      ...prevAnswers,
      [questionIndex]: value,
    }));
  };

  const checkAnswers = () => {
    if (!selectedSubtopic || !selectedSubject || !selectedLesson) return;

    const correctAnswers = learningMaterials[selectedSubject][selectedLesson][selectedSubtopic].answers;
    const correctAnswersArray = correctAnswers.split(/\d+\.\s*/).filter(answer => answer.trim() !== "");

    const results = {};
    const totalQuestions = correctAnswersArray.length;
    let correctCount = 0;

    for (let i = 0; i < totalQuestions; i++) {
      const correctAnswer = correctAnswersArray[i].trim().toLowerCase();
      const studentAnswer = userAnswers[i] ? userAnswers[i].trim().toLowerCase() : "";

      results[i] = studentAnswer === correctAnswer;
      if (results[i]) correctCount++;
    }

    alert(
      `You got ${correctCount} out of ${totalQuestions} correct.\n\n` +
      Object.keys(results)
        .map((key) => `Question ${parseInt(key) + 1}: ${results[key] ? "Correct" : "Incorrect"}`)
        .join("\n")
    );
  };

  const sortSubtopics = (subtopics) => {
    return Object.keys(subtopics).sort((a, b) => {
      const [majorA, minorA] = a.split('.').map(Number);
      const [majorB, minorB] = b.split('.').map(Number);

      if (majorA === majorB) {
        return minorA - minorB;
      }
      return majorA - majorB;
    });
  };

  const renderExercises = (exercises) => {
    if (!exercises) return null;

    const lines = exercises.split("\n").filter((line) => line.trim() !== "");

    return (
      <div className={`exercise-container ${theme}`}>
        {lines.map((line, index) => {
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
    );
  };

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    sessionStorage.removeItem("userId");
    sessionStorage.removeItem("userName");
    navigate("/");
  };

  const handleSubjectCodeSubmit = async () => {
    if (!subjectId || !studentId) {
      alert("Please enter a valid subject ID and ensure you are logged in.");
      return;
    }
  
    try {
      const response = await axios.post(`${base_url}/api/addAccessLearningMaterial`, {
        studentId,
        subjectId,
      });
  
      if (response.status === 200) {
        alert("Subject ID added successfully!");
        setHasSubjectCode(true);
        fetchLearningMaterials();
      } else {
        alert("Failed to add subject ID. Please try again.");
      }
    } catch (error) {
      console.error("Failed to add subject ID:", error);
      alert(`Failed to add subject ID: ${error.response?.data?.error || error.message}`);
    } finally {
      setSubjectId("");
    }
  };

  const handleRemoveAccess = async (subjectId) => {
    try {
      const response = await axios.delete(`${base_url}/api/removeAccessLearningMaterial`, {
        data: { studentId, subjectId },
      });
  
      if (response.status === 200) {
        alert("Access removed successfully!");
  
        // Update the learningMaterials state to remove the subject
        const updatedLearningMaterials = { ...learningMaterials };
        for (const subject in updatedLearningMaterials) {
          if (updatedLearningMaterials[subject][Object.keys(updatedLearningMaterials[subject])[0]][Object.keys(updatedLearningMaterials[subject][Object.keys(updatedLearningMaterials[subject])[0]])[0]].subjectId === subjectId) {
            delete updatedLearningMaterials[subject];
            break;
          }
        }
  
        setLearningMaterials(updatedLearningMaterials); // Update the state to reflect the changes
        setSelectedSubject(null); // Deselect the subject if it was selected
      } else {
        alert("Failed to remove access. Please try again.");
      }
    } catch (error) {
      console.error("Failed to remove access:", error);
      alert(`Failed to remove access: ${error.response?.data?.error || error.message}`);
    }
  };

  const SubjectBox = ({ subject, instructorEmail, instructorName, subjectId }) => {
    const [showOptions, setShowOptions] = useState(null);
  
    // Add a click event listener to the document to detect clicks outside the menu
    useEffect(() => {
      const handleClickOutside = (event) => {
        // Check if the click is outside the options menu
        if (showOptions && !event.target.closest(".subject-box-options-menu")) {
          setShowOptions(null); // Hide the menu
        }
      };
  
      // Attach the event listener
      document.addEventListener("click", handleClickOutside);
  
      // Clean up the event listener on component unmount
      return () => {
        document.removeEventListener("click", handleClickOutside);
      };
    }, [showOptions]);
  
    return (
      <div className={`subject-box ${theme}`} onClick={() => handleSubjectClick(subject)}>
        <div className="subject-box-header">
          <h3>{subject}</h3>
          <div
            className="subject-box-options"
            onClick={(e) => {
              e.stopPropagation(); // Prevent the click from bubbling up to the document
              setShowOptions(showOptions === subjectId ? null : subjectId); // Toggle the menu
            }}
          >
            <MdMoreVert />
          </div>
          {showOptions === subjectId && (
            <div className="subject-box-options-menu">
              <button onClick={() => handleRemoveAccess(subjectId)}>Remove Access</button>
            </div>
          )}
        </div>
        <p>{instructorEmail}</p>
        <p>{instructorName}</p>
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
      <div className={`exercises-overlay ${isSidebarVisible ? 'visible' : 'hidden'}`} onClick={toggleSidebar} />
      <div className={`exercises-sidebar ${theme} ${isSidebarVisible ? 'visible' : 'hidden'}`}>
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
            placeholder="Enter subject ID"
          />
        </div>
        <button onClick={handleSubjectCodeSubmit} className={`submit-button ${theme}`}>
          Submit
        </button>
        {hasSubjectCode ? (
          <ul>
            {Object.keys(learningMaterials).map((subject) => (
              <li
                key={subject}
                className={`${theme} ${selectedSubject === subject ? 'active' : ''}`}
                onClick={() => handleSubjectClick(subject)}
              >
                {subject}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ paddingTop: '10px' }}>No subject IDs added yet. Please add a subject ID to view learning materials.</p>
        )}
        <button className={`exercises-logout-button ${theme}`} onClick={handleLogout}>
          Logout
        </button>
      </div>

      <button
        className={`exercises-sidebar-toggle ${theme} ${isSidebarVisible ? 'sidebar-visible' : 'sidebar-hidden'}`}
        onClick={toggleSidebar}
      >
        {isSidebarVisible ? <MdChevronLeft /> : <MdChevronRight />}
      </button>
      <button
        className={`exercises-sidebar-toggle2 ${theme} ${isSidebarVisible ? 'sidebar-visible' : 'sidebar-hidden'}`}
        onClick={toggleSidebar}
      >
        {isSidebarVisible ? <MdChevronRight /> : <MdChevronLeft />}
      </button>

      <div className={`exercises-content ${theme} ${isSidebarVisible ? 'sidebar-visible' : 'sidebar-hidden'}`}>
        <div className='exercises-header-container'>
          <div className="exercises-header">
            {hasSubjectCode && selectedSubject && <h1 className={theme}>{selectedSubject}</h1>}
          </div>
          <div className="exercises-header-buttons">
            <div className='userName' style={{ paddingLeft: '10px' }}>{userName}</div>
            <img src={userPicture} className='userPicture' alt="" />
            <button className={`exercises-theme-toggle ${theme}`} onClick={toggleTheme}>
              {theme === "dark" ? <MdLightMode /> : <MdDarkMode />}
            </button>
            <button className={`exercises-chat-button ${theme}`} onClick={() => navigate('/student')}>
              <IoIosChatboxes />
            </button>
          </div>
        </div>
        {hasSubjectCode && selectedSubject && !selectedLesson && (
          <div className="lessons">
            <h2 className={theme}>Lessons</h2>
            <button className={`back-button ${theme}`} onClick={() => setSelectedSubject(null)}>
              Back to Subjects
            </button>
            <ul>
              {Object.keys(learningMaterials[selectedSubject]).map((lesson) => (
                <li
                  key={lesson}
                  className={`${theme}`}
                  onClick={() => handleLessonClick(lesson)}
                >
                  {`${lesson}`}
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasSubjectCode && selectedLesson && !selectedSubtopic && (
          <div className="subtopics">
            <h2 className={theme}>Subtopics for {selectedLesson}</h2>
            <button className={`back-button ${theme}`} onClick={() => setSelectedLesson(null)}>
              Back to Lessons
            </button>
            <ul>
              {sortSubtopics(learningMaterials[selectedSubject][selectedLesson]).map((subtopic) => (
                <li
                  key={subtopic}
                  className={`${theme}`}
                  onClick={() => handleSubtopicClick(subtopic)}
                >
                  {`${subtopic} - ${learningMaterials[selectedSubject][selectedLesson][subtopic].subtopicTitle}`}
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasSubjectCode && selectedSubtopic && (
          <div className={`subtopic-content ${theme}`}>
            <h1 className={theme}>
              {selectedSubtopic} - {learningMaterials[selectedSubject][selectedLesson][selectedSubtopic].subtopicTitle}
            </h1>
            <p className={`line ${theme}`}></p>
            <span>{learningMaterials[selectedSubject][selectedLesson][selectedSubtopic].content}</span>
            <h3>Exercises</h3>
            {renderExercises(learningMaterials[selectedSubject][selectedLesson][selectedSubtopic]?.questions)}
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
            {Object.keys(learningMaterials).map((subject) => {
              const firstLesson = Object.keys(learningMaterials[subject])[0];
              const firstSubtopic = Object.keys(learningMaterials[subject][firstLesson])[0];
              const instructorEmail = learningMaterials[subject][firstLesson][firstSubtopic].instructorEmail;
              const instructorName = learningMaterials[subject][firstLesson][firstSubtopic].instructorName;
              const subjectId = learningMaterials[subject][firstLesson][firstSubtopic].subjectId;

              return (
                <SubjectBox
                  key={subject}
                  subject={subject}
                  instructorEmail={instructorEmail}
                  instructorName={instructorName}
                  subjectId={subjectId}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExercisesPage;