import React, { useState, useEffect } from "react";
import "./exercises.css";
import { MdLightMode, MdDarkMode } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const ExercisesPage = () => {
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedSubTopic, setSelectedSubTopic] = useState(null);
  const [theme, setTheme] = useState("light");
  const [learningMaterials, setLearningMaterials] = useState({});
  const [userAnswers, setUserAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const userId = localStorage.getItem("userId") || sessionStorage.getItem("userId");
    if (!userId) {
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    const fetchLearningMaterials = async () => {
      try {
        const response = await axios.get("https://aissistant-three.vercel.app/api/getLearningMaterials");
        setLearningMaterials(response.data);
      } catch (error) {
        console.error("Failed to fetch learning materials:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLearningMaterials();
  }, []);

  useEffect(() => {
    setUserAnswers({});
  }, [selectedSubTopic]);

  const handleSubjectClick = (subject) => {
    setSelectedSubject(subject);
    setSelectedSubTopic(null);
  };

  const handleSubTopicClick = (subTopic) => {
    setSelectedSubTopic(subTopic);
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
    if (!selectedSubTopic || !selectedSubject) return;

    const correctAnswers = learningMaterials[selectedSubject][selectedSubTopic].answers;
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

  if (isLoading) {
    return <div className={`loading-container ${theme}`}>Loading...</div>;
  }

  return (
    <div className={`exercises-page ${theme}`}>
      <div className={`sidebar ${theme}`}>
        <h2>Subjects</h2>
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
        <button className={`exercises-logout-button ${theme}`} onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className={`content ${theme}`}>
        {selectedSubject && <h1 className={theme}>{selectedSubject}</h1>}

        {selectedSubject && !selectedSubTopic && (
          <div className="subtopics">
            <h2 className={theme}>Subtopics for {selectedSubject}</h2>
            <ul>
              {sortSubtopics(learningMaterials[selectedSubject]).map((subTopic) => (
                <li
                  key={subTopic}
                  className={`${theme}`}
                  onClick={() => handleSubTopicClick(subTopic)}
                >
                  <span className="subtopic-icon">📘</span>
                  <span className="subtopic-text">
                    {subTopic} - {learningMaterials[selectedSubject][subTopic].subtopicTitle}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {selectedSubTopic && (
          <div className={`subtopic-content ${theme}`}>
            <h1 className={theme}>
              {selectedSubTopic} - {learningMaterials[selectedSubject][selectedSubTopic].subtopicTitle}
            </h1>
            <p className={`line ${theme}`}></p>
            <pre>{learningMaterials[selectedSubject][selectedSubTopic].content}</pre>
            <h3>Exercises</h3>
            {renderExercises(learningMaterials[selectedSubject][selectedSubTopic]?.questions)}
            <div className="button-container">
              <button className={`back-button ${theme}`} onClick={() => setSelectedSubTopic(null)}>
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