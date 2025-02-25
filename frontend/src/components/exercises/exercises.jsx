import React, { useState, useEffect } from "react";
import "./exercises.css";
import { MdLightMode, MdDarkMode } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const ExercisesPage = () => {
  const base_url = `https://aissistant-backend.vercel.app`;
  //const base_url = `http://localhost:5000`;
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState(null);
  const [theme, setTheme] = useState("light");
  const [learningMaterials, setLearningMaterials] = useState({});
  const [userAnswers, setUserAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [subjectId, setSubjectId] = useState(""); // Change from subjectCode to subjectId
  const [studentId, setStudentId] = useState("");
  const [hasSubjectCode, setHasSubjectCode] = useState(false); // Add this line
  const navigate = useNavigate();

  useEffect(() => {
    const userId = localStorage.getItem("userId") || sessionStorage.getItem("userId");
    if (!userId) {
      navigate("/");
    } else {
      setStudentId(userId);
    }
  }, [navigate]);

  useEffect(() => {
    if (studentId) {
      fetchLearningMaterials();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const fetchLearningMaterials = async () => {
    try {
      // Fetch the subject IDs associated with the student's ID
      const accessResponse = await axios.get(`${base_url}/api/getAccessLearningMaterials`, {
        params: { studentId },
      });
      const subjectIds = accessResponse.data.subjectIds; // Change from subjectCodes to subjectIds

      if (subjectIds.length > 0) {
        setHasSubjectCode(true); // Set hasSubjectCode to true if subject IDs exist
        // Fetch the learning materials for the subject IDs
        const materialsResponse = await axios.get(`${base_url}/api/getLearningMaterials`, {
          params: { subjectIds }, // Change from subjectCodes to subjectIds
        });
        setLearningMaterials(materialsResponse.data);
      } else {
        setHasSubjectCode(false); // Set hasSubjectCode to false if no subject IDs exist
        setLearningMaterials({});
      }
    } catch (error) {
      console.error("Failed to fetch learning materials:", error);
    } finally {
      setIsLoading(false);
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
    }
  };
  if (isLoading) {
    return <div className={`loading-container ${theme}`}>Loading...</div>;
  }

  return (
    <div className={`exercises-page ${theme}`}>
      <div className={`sidebar ${theme}`}>
        <h2>Subjects</h2>
        <div className={`subject-code-input ${theme}`}>
          <input
            type="text"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            placeholder="Enter subject ID" // Update the placeholder
          />
        </div>
        <button onClick={handleSubjectCodeSubmit} className={`submit-button ${theme}`}>
          Submit
        </button>
        {hasSubjectCode ? ( // Conditionally render based on hasSubjectCode
          <ul>
            {Object.keys(learningMaterials).map((subject) => (
              <li
                key={subject}
                className={`${theme}`}
                onClick={() => handleSubjectClick(subject)}
              >
                {subject}
              </li>
            ))}
          </ul>
        ) : (
          <p>No subject IDs added yet. Please add a subject ID to view learning materials.</p> // Update the message
        )}
        <button className={`exercises-logout-button ${theme}`} onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className={`content ${theme}`}>
        {hasSubjectCode && selectedSubject && <h1 className={theme}>{selectedSubject}</h1>}

        {hasSubjectCode && selectedSubject && !selectedLesson && (
          <div className="lessons">
            <h2 className={theme}>Lessons</h2>
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
            <pre>{learningMaterials[selectedSubject][selectedLesson][selectedSubtopic].content}</pre>
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
      </div>

      <button className={`theme-toggle ${theme}`} onClick={toggleTheme}>
        {theme === "dark" ? <MdLightMode /> : <MdDarkMode />}
      </button>

      <button className={`exercises-user-button ${theme}`} onClick={() => navigate('/user')}>
        User
      </button>
    </div>
  );
};

export default ExercisesPage;