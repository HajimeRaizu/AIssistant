import React, { useState, useEffect } from "react";
import './instructor_page.css';
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { MdLightMode, MdDarkMode } from "react-icons/md";
import { Line } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

const InstructorPage = () => {
  const base_url = `https://aissistant-backend.vercel.app`;
  //const base_url = `http://localhost:5000`;
  const [activeTab, setActiveTab] = useState('dashboard');
  const [totalQueries, setTotalQueries] = useState(0);
  const [queryData, setQueryData] = useState([]);
  const [graphFilter, setGraphFilter] = useState('weekly');
  const [theme, setTheme] = useState("light");
  const [faq, setFaq] = useState("");
  const [learningMaterials, setLearningMaterials] = useState({});
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [editingExercise, setEditingExercise] = useState(null);
  const [showSubjectConfirmModal, setShowSubjectConfirmModal] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    console.log(localStorage.getItem("instructorEmail"));
    const fetchTotalQueries = async () => {
      try {
        const response = await axios.get(`${base_url}/api/getChats`);
        const allMessages = response.data.flatMap(chat => 
          chat.messages.filter(message => message.sender === "user")
        );
        setTotalQueries(allMessages.length);

        const queryData = allMessages.map(message => ({
          timestamp: new Date(message.timestamp),
          text: message.text
        }));
        setQueryData(queryData);
      } catch (error) {
        console.error("Failed to fetch total queries:", error);
      }
    };

    const fetchLearningMaterials = async () => {
      try {
        const instructorEmail = localStorage.getItem("instructorEmail"); // Get the instructor's email from localStorage
        const response = await axios.get(`${base_url}/api/getLearningMaterials`, {
          params: { instructorEmail }, // Pass the instructorEmail as a query parameter
        });
        setLearningMaterials(response.data);
      } catch (error) {
        console.error("Failed to fetch learning materials:", error);
      }
    };

    fetchTotalQueries();
    fetchLearningMaterials();
  }, []);

  const handleGenerateFAQ = async () => {
    try {
      const prompts = queryData.map(query => query.text);
      const response = await axios.post(`${base_url}/api/generateFAQ`, { prompts });
      setFaq(response.data.generated_text);
    } catch (error) {
      console.error("Failed to generate FAQ:", error);
    }
  };

  const handleLogout = () => {
    // Clear authentication status from localStorage
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("instructorEmail"); // Remove the instructor's email
    localStorage.removeItem("instructorName");
  
    // Redirect to the login page
    navigate("/instructor-login");
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const getGraphData = () => {
    const allMessages = queryData.map(message => ({
      timestamp: new Date(message.timestamp),
      text: message.text
    }));

    allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const groupedData = {};
    allMessages.forEach(message => {
      const date = new Date(message.timestamp);
      let groupKey;

      if (graphFilter === 'weekly') {
        const firstMonday = new Date(allMessages[0].timestamp);
        firstMonday.setDate(firstMonday.getDate() - firstMonday.getDay() + 1);
        const diff = Math.floor((date - firstMonday) / (7 * 24 * 60 * 60 * 1000));
        groupKey = `Week ${diff + 1}`;
      } else if (graphFilter === 'monthly') {
        groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!groupedData[groupKey]) {
        groupedData[groupKey] = 0;
      }
      groupedData[groupKey]++;
    });

    const sortedLabels = Object.keys(groupedData).sort((a, b) => {
      if (graphFilter === 'weekly') {
        return parseInt(a.split(' ')[1]) - parseInt(b.split(' ')[1]);
      } else {
        return a.localeCompare(b);
      }
    });

    const totalQueriesDataset = sortedLabels.map(label => groupedData[label]);

    return {
      labels: sortedLabels,
      datasets: [
        {
          label: 'Total Queries',
          data: totalQueriesDataset,
          fill: false,
          borderColor: theme === "dark" ? 'rgb(75, 192, 192)' : 'rgb(75, 192, 192)',
          backgroundColor: theme === "dark" ? 'rgba(75, 192, 192, 0.2)' : 'rgba(75, 192, 192, 0.2)',
          tension: 0.1
        }
      ]
    };
  };

  const getGraphOptions = () => ({
    scales: {
      x: {
        ticks: {
          color: theme === "dark" ? 'white' : 'black'
        },
        grid: {
          color: theme === "dark" ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }
      },
      y: {
        ticks: {
          color: theme === "dark" ? 'white' : 'black'
        },
        grid: {
          color: theme === "dark" ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }
      }
    },
    plugins: {
      legend: {
        labels: {
          color: theme === "dark" ? 'white' : 'black'
        }
      }
    }
  });

  const handleDeleteSubject = async (subject) => {
    try {
      const encodedSubject = encodeURIComponent(subject);
      const instructorEmail = localStorage.getItem("instructorEmail"); // Get the instructor's email
      await axios.delete(`${base_url}/api/deleteSubject/${encodedSubject}`, {
        params: { instructorEmail }, // Pass the instructorEmail when deleting
      });
      const updatedLearningMaterials = { ...learningMaterials };
      delete updatedLearningMaterials[subject];
      setLearningMaterials(updatedLearningMaterials);
      alert("Subject deleted successfully!");
    } catch (error) {
      console.error("Failed to delete subject:", error);
      alert("Failed to delete subject.");
    }
  };

  const handleConfirmDeleteSubject = (subject) => {
    setSubjectToDelete(subject);
    setShowSubjectConfirmModal(true);
  };

  const handleUploadLearningMaterials = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
  
      // Get the instructor's email from localStorage
      const instructorEmail = localStorage.getItem("instructorEmail");
      formData.append("instructorEmail", instructorEmail);
  
      try {
        await axios.post(`${base_url}/api/uploadLearningMaterials`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        alert("Learning materials uploaded successfully!");
        const response = await axios.get(`${base_url}/api/getLearningMaterials`, {
          params: { instructorEmail }, // Pass the instructorEmail when fetching learning materials
        });
        setLearningMaterials(response.data);
      } catch (error) {
        console.error("Error uploading learning materials:", error);
        alert("Failed to upload learning materials.");
      }
    }
  };

  const handleBackToSubjects = () => {
    setSelectedSubject(null);
    setSelectedLesson(null);
    setSelectedSubtopic(null);
    setEditingExercise(null);
  };

  const handleBackToLessons = () => {
    setSelectedLesson(null);
    setSelectedSubtopic(null);
    setEditingExercise(null);
  };
  
  const handleBackToSubtopics = () => {
    setSelectedSubtopic(null);
    setEditingExercise(null);
  };

  const handleEditExercise = (exercise) => {
    setEditingExercise({
      docId: exercise.docId, // Pass the document ID
      content: exercise.content,
      questions: exercise.questions,
      answers: exercise.answers,
    });
  };

  const handleSaveExercise = async () => {
    try {
      const updatedExercise = {
        content: editingExercise.content,
        questions: editingExercise.questions,
        answers: editingExercise.answers,
      };
  
      await axios.put(
        `${base_url}/api/updateExercise/${editingExercise.docId}`,
        updatedExercise
      );
  
      // Update local state
      const updatedLearningMaterials = { ...learningMaterials };
      const subtopic = updatedLearningMaterials[selectedSubject][selectedLesson][selectedSubtopic];
      subtopic.content = updatedExercise.content;
      subtopic.questions = updatedExercise.questions;
      subtopic.answers = updatedExercise.answers;
  
      setLearningMaterials(updatedLearningMaterials);
      setEditingExercise(null);
      alert("Exercise updated successfully!");
    } catch (error) {
      console.error("Failed to update exercise:", error);
      alert("Failed to update exercise.");
    }
  };

  const renderExercises = () => {
    if (!selectedSubject) {
      // Render the list of subjects
      return Object.keys(learningMaterials).map((subject) => (
        <div
          key={subject}
          className={`instructor-exercise-subject ${theme}`}
          onClick={() => setSelectedSubject(subject)}
        >
          <div>{subject}</div>
          <button
            className={`instructor-delete-subject-button ${theme}`}
            onClick={(e) => {
              e.stopPropagation();
              handleConfirmDeleteSubject(subject);
            }}
          >
            Delete Subject
          </button>
        </div>
      ));
    } else if (!selectedLesson) {
      // Render the list of lessons for the selected subject
      return (
        <div>
          <button
            className={`instructor-back-to-subjects-button ${theme}`}
            onClick={handleBackToSubjects}
          >
            Back to Subjects
          </button>
          {Object.keys(learningMaterials[selectedSubject]).map((lesson) => (
            <div
              key={lesson}
              className={`instructor-exercise-lesson ${theme}`}
              onClick={() => setSelectedLesson(lesson)}
            >
              {`${lesson}`}
            </div>
          ))}
        </div>
      );
    } else if (!selectedSubtopic) {
      // Render the list of subtopics for the selected lesson
      const subtopics = Object.keys(learningMaterials[selectedSubject][selectedLesson]);
  
      // Sort subtopics numerically
      const sortedSubtopics = subtopics.sort((a, b) => {
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);
        for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
          if (aParts[i] !== bParts[i]) {
            return aParts[i] - bParts[i];
          }
        }
        return aParts.length - bParts.length;
      });
  
      return (
        <div>
          <button
            className={`instructor-back-to-lessons-button ${theme}`}
            onClick={handleBackToLessons}
          >
            Back to Lessons
          </button>
          {sortedSubtopics.map((subtopicCode) => {
            const subtopic = learningMaterials[selectedSubject][selectedLesson][subtopicCode];
            return (
              <div
                key={subtopicCode}
                className={`instructor-exercise-subtopic ${theme}`}
                onClick={() => setSelectedSubtopic(subtopicCode)}
              >
                {`${subtopicCode} - ${subtopic.subtopicTitle}`}
              </div>
            );
          })}
        </div>
      );
    } else {
      // Render the content of the selected subtopic
      const subtopic = learningMaterials[selectedSubject][selectedLesson][selectedSubtopic];
  
      return (
        <div className={`instructor-exercise-content ${theme}`}>
          <h2>{subtopic.subtopicTitle}</h2>
  
          {/* Content Section */}
          {editingExercise ? (
            <textarea
              className={`instructor-content-textarea ${theme}`}
              value={editingExercise.content}
              onChange={(e) =>
                setEditingExercise({ ...editingExercise, content: e.target.value })
              }
            />
          ) : (
            <pre>{subtopic.content}</pre>
          )}
  
          {/* Images Section */}
          {subtopic.images && <img src={subtopic.images} alt="Subtopic" />}
  
          {/* Exercises Section */}
          <h3>Exercises</h3>
          {editingExercise ? (
            <textarea
              className={`instructor-exercise-textarea ${theme}`}
              value={editingExercise.questions}
              onChange={(e) =>
                setEditingExercise({ ...editingExercise, questions: e.target.value })
              }
            />
          ) : (
            <pre>{subtopic.questions}</pre>
          )}
  
          {/* Answers Section */}
          <h3>Answers</h3>
          {editingExercise ? (
            <textarea
              className={`instructor-exercise-textarea ${theme}`}
              value={editingExercise.answers}
              onChange={(e) =>
                setEditingExercise({ ...editingExercise, answers: e.target.value })
              }
            />
          ) : (
            <pre>{subtopic.answers}</pre>
          )}
  
          {/* Edit/Save/Cancel Buttons */}
          {editingExercise ? (
            <div className="instructor-e-buttons">
              <button
                className="instructor-editing-button"
                onClick={handleSaveExercise}
              >
                Save
              </button>
              <button
                className="instructor-editing-button"
                onClick={() => setEditingExercise(null)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                handleEditExercise({
                  docId: subtopic.docId, // Pass the document ID
                  content: subtopic.content,
                  questions: subtopic.questions,
                  answers: subtopic.answers,
                });
              }}
            >
              Edit
            </button>
          )}
  
          {/* Back Buttons */}
          <button onClick={handleBackToSubtopics}>Back to Subtopics</button>
          <button onClick={handleBackToLessons}>Back to Lessons</button>
          <button onClick={handleBackToSubjects}>Back to Subjects</button>
        </div>
      );
    }
  };

  return (
    <div className={`instructor-container ${theme}`}>
      <div className={`instructor-sidebar ${theme}`}>
        <button 
          className={`instructor-tab ${activeTab === 'dashboard' ? 'active' : ''} ${theme}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={`instructor-tab ${activeTab === 'learning-materials' ? 'active' : ''} ${theme}`}
          onClick={() => setActiveTab('learning-materials')}
        >
          Manage Learning Materials
        </button>
        <button 
          className={`instructor-logout-button ${theme}`}
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
      <div className={`instructor-content ${theme}`}>
        {activeTab === 'dashboard' ? (
          <div className={`instructor-dashboard-tab ${theme}`}>
            <h1>Dashboard</h1>
            <div className="instructor-statistics">
              <div className={`instructor-statistics-box queries ${theme}`}>
                <h3>Total Queries</h3>
                <p>{totalQueries}</p>
              </div>
            </div>
            <div className={`instructor-line-graph-container ${theme}`}>
              <div className="instructor-graph-filters">
                <button className={`instructor-${theme}`} onClick={() => setGraphFilter('weekly')}>Weekly</button>
                <button className={`instructor-${theme}`} onClick={() => setGraphFilter('monthly')}>Monthly</button>
              </div>
              <Line data={getGraphData()} options={getGraphOptions()} />
            </div>
            <div className="instructor-faq-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Frequently Asked Questions</h2>
                <button 
                  className={`instructor-generate-faq-button ${theme}`}
                  onClick={handleGenerateFAQ}
                >
                  Generate FAQ
                </button>
              </div>
              <pre className="instructor-faq-box">{faq}</pre>
            </div>
          </div>
        ) : (
          <div className={`instructor-manage-learning-materials-tab ${theme}`}>
            <h1>Manage Learning Materials</h1>
            <input 
              type="file" 
              accept=".xlsx" 
              onChange={handleUploadLearningMaterials} 
            />
            <p>Upload an Excel file to update learning materials.</p>
            <div className="instructor-exercises-container">
              {renderExercises()}
            </div>
          </div>
        )}
      </div>
      <button className={`instructor-theme-toggle ${theme}`} onClick={toggleTheme}>
        {theme === "dark" ? <MdLightMode /> : <MdDarkMode />}
      </button>

      {showSubjectConfirmModal && (
        <div className={`instructor-confirmation-modal ${theme}`}>
          <div className={`instructor-modal-content ${theme}`}>
            <p>Are you sure you want to delete this subject?</p>
            <div className={`instructor-modal-actions ${theme}`}>
              <button onClick={() => {
                handleDeleteSubject(subjectToDelete);
                setShowSubjectConfirmModal(false);
              }}>Yes</button>
              <button onClick={() => setShowSubjectConfirmModal(false)}>No</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorPage;