import React, { useState, useEffect } from "react";
import './instructor_page.css';
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { MdOutlineDashboard, MdOutlineQuestionAnswer } from "react-icons/md";
import { LuBookMarked } from "react-icons/lu";
import { BiLogOut } from "react-icons/bi";
import logo from '../assets/AIssistant.png';
import DataTable from 'react-data-table-component';
import {
  LineChart,
  Label,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  PieChart,
  Pie,
  Sector,
  Cell,
} from 'recharts';

const InstructorPage = () => {
  const base_url = `https://aissistant-backend.vercel.app`;
  //const base_url = `http://localhost:5000`;
  const [activeTab, setActiveTab] = useState('dashboard');
  const [totalQueries, setTotalQueries] = useState(0);
  const [queryData, setQueryData] = useState([]);
  const [graphFilter, setGraphFilter] = useState('weekly');
  const [faq, setFaq] = useState("");
  const [learningMaterials, setLearningMaterials] = useState({});
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [editingExercise, setEditingExercise] = useState(null);
  const [showSubjectConfirmModal, setShowSubjectConfirmModal] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);
  const [totalLearningMaterials, setTotalLearningMaterials] = useState(0);
  const [isGeneratingFAQ, setIsGeneratingFAQ] = useState(false);
  const navigate = useNavigate();
  const isAuthenticated = localStorage.getItem("isAuthenticated");
  const userId = localStorage.getItem("userId");
  const userName = localStorage.getItem("userName");
  const userRole = localStorage.getItem("userRole");
  const userEmail = localStorage.getItem("userEmail");
  const userPicture = localStorage.getItem("profileImage");

  useEffect(() => {
    if (!userId || userRole !== 'admin') {
      if (userRole === 'student') {
        navigate("/student");
      } else if (userRole === 'instructor'){
        navigate("instructor");
      } else{
        navigate("/user-type");
      }
    }
  }, [userId, navigate]);
  
  useEffect(() => {
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

        // Calculate the number of unique subjects uploaded by the instructor
        const uniqueSubjects = new Set(Object.keys(response.data));
        setTotalLearningMaterials(uniqueSubjects.size);
      } catch (error) {
        console.error("Failed to fetch learning materials:", error);
      }
    };

    fetchTotalQueries();
    fetchLearningMaterials();
  }, []);

  const handleGenerateFAQ = async () => {
    if (isGeneratingFAQ) return; // Prevent multiple simultaneous requests
    setIsGeneratingFAQ(true);
    setFaq(""); // Clear the FAQ content before starting
  
    try {
      const prompts = queryData.map((query) => query.text);
  
      // Use fetch for streaming
      const response = await fetch(`${base_url}/api/generateFAQ`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompts }),
      });

      console.log("Response Object:", response);
  
      if (!response.ok) {
        throw new Error("Failed to generate FAQ");
      }
  
      // Read the streaming response
      const reader = response.body.getReader();
      let faqContent = "";
  
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
  
        // Decode the chunk and append it to the FAQ content
        const chunk = new TextDecoder().decode(value);
        faqContent += chunk;
  
        // Update the FAQ state with the new content
        // Use a functional update to ensure the state is updated correctly
        setFaq((prevFaq) => prevFaq + chunk);
      }
    } catch (error) {
      console.error("Failed to generate FAQ:", error);
      setFaq("Failed to generate FAQ. Please try again.");
    } finally {
      setIsGeneratingFAQ(false); // Reset the generating state
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    localStorage.removeItem("isAuthenticated");
    sessionStorage.removeItem("userId");
    sessionStorage.removeItem("userName");
    sessionStorage.removeItem("userEmail");
    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("isAuthenticated");
    navigate("/"); // Redirect to the login page
  };

  const getGraphData = () => {
    const allMessages = queryData.map(message => ({
      timestamp: new Date(message.timestamp),
      text: message.text
    }));

    allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (allMessages.length === 0) return [];

    const firstDate = new Date(allMessages[0].timestamp);
    const lastDate = new Date(allMessages[allMessages.length - 1].timestamp);

    let groupedData = {};

    if (graphFilter === 'weekly') {
        const firstMonday = new Date(firstDate);
        if (firstMonday.getDay() !== 1) {
            firstMonday.setDate(firstMonday.getDate() - firstMonday.getDay() + 1);
        }

        let currentDate = new Date(firstMonday);
        let weekNumber = 1;

        while (currentDate <= lastDate) {
            let groupKey = `Week ${weekNumber}`;
            groupedData[groupKey] = 0;
            weekNumber++;
            currentDate.setDate(currentDate.getDate() + 7);
        }

        allMessages.forEach(message => {
            const date = new Date(message.timestamp);
            const diff = Math.floor((date - firstMonday) / (7 * 24 * 60 * 60 * 1000));
            const groupKey = `Week ${Math.max(1, diff + 1)}`;

            if (groupKey in groupedData) {
                groupedData[groupKey]++;
            }
        });
    } else if (graphFilter === 'monthly') {
        let currentDate = new Date(firstDate);
        currentDate.setDate(1);

        while (currentDate <= lastDate) {
            const groupKey = `${currentDate.toLocaleString('default', { month: 'short' })} ${currentDate.getFullYear()}`;
            groupedData[groupKey] = 0;
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        allMessages.forEach(message => {
            const date = new Date(message.timestamp);
            const groupKey = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;

            if (groupKey in groupedData) {
                groupedData[groupKey]++;
            }
        });
    }

    const sortedLabels = Object.keys(groupedData).sort((a, b) => {
        if (graphFilter === 'weekly') {
            return parseInt(a.split(' ')[1]) - parseInt(b.split(' ')[1]);
        } else if (graphFilter === 'monthly') {
            return new Date(a) - new Date(b);
        }
        return 0;
    });

    return sortedLabels.map(label => ({
        name: label,
        queries: groupedData[label]
    }));
  };

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

        // Update the count of learning materials
        const uniqueSubjects = new Set(Object.keys(response.data));
        setTotalLearningMaterials(uniqueSubjects.size);
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
          className="instructor-exercise-subject"
          onClick={() => setSelectedSubject(subject)}
        >
          <div>{subject}</div>
          <button
            className="instructor-delete-subject-button"
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
            className="instructor-back-to-subjects-button"
            onClick={handleBackToSubjects}
          >
            Back to Subjects
          </button>
          {Object.keys(learningMaterials[selectedSubject]).map((lesson) => (
            <div
              key={lesson}
              className="instructor-exercise-lesson"
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
            className="instructor-back-to-lessons-button"
            onClick={handleBackToLessons}
          >
            Back to Lessons
          </button>
          {sortedSubtopics.map((subtopicCode) => {
            const subtopic = learningMaterials[selectedSubject][selectedLesson][subtopicCode];
            return (
              <div
                key={subtopicCode}
                className="instructor-exercise-subtopic"
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
        <div className="instructor-exercise-content">
          <h2>{subtopic.subtopicTitle}</h2>

          {/* Content Section */}
          {editingExercise ? (
            <textarea
              className="instructor-content-textarea"
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
              className="instructor-exercise-textarea"
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
              className="instructor-exercise-textarea"
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

  const pieChartData = [
    { name: 'Queries', value: totalQueries },
  ];

  const COLORS = ['#005f9e'];

  const customStyles = {
    head: {
      style: {
        fontSize: '16px',
        fontWeight: 'bold',
        backgroundColor: '#005f9e',
        color: '#ffffff',
      },
    },
    rows: {
      style: {
        fontSize: '14px',
        color: '#333333',
        backgroundColor: '#f9f9f9',
        '&:hover': {
          backgroundColor: '#e0e0e0',
        },
      },
    },
    cells: {
      style: {
        padding: '12px',
      },
    },
    pagination: {
      style: {
        fontSize: '14px',
        color: '#005f9e',
      },
    },
  };

  return (
    <div className="instructor-container">
      <div className="instructor-sidebar">
        <div className="instructor-aissistant-logo-title">
          <img src={logo} alt="aissistant logo" />
          <div className="instructor-aissistant-title">
            <h1 className="instructor-ai">AI</h1>
            <h1>ssistant</h1>
          </div>
        </div>
        <button 
          className={`instructor-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <MdOutlineDashboard />
          Dashboard
        </button>
        <button 
          className={`instructor-tab ${activeTab === 'learning-materials' ? 'active' : ''}`}
          onClick={() => setActiveTab('learning-materials')}
        >
          <LuBookMarked />
          Learning Materials
        </button>
        <button 
          className="instructor-logout-button"
          onClick={handleLogout}
        >
          <BiLogOut />
          Logout
        </button>
      </div>
      <div className="instructor-content">
        {activeTab === 'dashboard' ? (
          <div className="instructor-dashboard-tab">
            <h1><MdOutlineDashboard />Dashboard</h1>
            <div className="instructor-statistics">
              <div className="instructor-statistics-box queries">
                <h3><MdOutlineQuestionAnswer className='instructor-statistics-box-icon' />Total Queries</h3>
                <p>{totalQueries}</p>
              </div>
              <div className="instructor-statistics-box learning-materials">
                <h3><LuBookMarked className='instructor-statistics-box-icon' />Learning Materials</h3>
                <p>{totalLearningMaterials}</p>
              </div>
            </div>
            <div className="instructor-graph-container">
              <div style={{ display: 'flex', gap: '3%', alignItems: 'center' }}>
                <ResponsiveContainer className='instructor-line-graph' width="75%" height={300} style={{display: 'flex', alignItems: 'center', padding: '20px 0px 20px 0px'}}>
                  <LineChart className='instructor-line'
                    data={getGraphData()}
                    margin={{
                      top: 10,
                      right: 30,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" padding={{ left: 10, right: 10 }}>
                    </XAxis>
                    <YAxis
                      tickFormatter={(value) => (value === 0 ? "" : Math.floor(value))}
                      domain={[0, "dataMax"]}
                      allowDecimals={false}
                    >
                      <Label
                        value="Number of Queries"
                        angle={-90}
                        position="insideLeft"
                        style={{ textAnchor: "middle" }}
                      />
                    </YAxis>
                    <Tooltip />
                    <Line type="monotone" dataKey="queries" stroke="rgb(101, 134, 145)" strokeWidth={3} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="instructor-graph-filters">
                <button 
                  className={graphFilter === 'weekly' ? 'active' : ''} 
                  onClick={() => setGraphFilter('weekly')}
                >
                  Weekly
                </button>
                <button 
                  className={graphFilter === 'monthly' ? 'active' : ''} 
                  onClick={() => setGraphFilter('monthly')}
                >
                  Monthly
                </button>
              </div>
            </div>
            <div className="instructor-faq-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Frequently Asked Questions</h2>
                <button 
                  className="generate-faq-button"
                  onClick={handleGenerateFAQ}
                  disabled={isGeneratingFAQ}
                >
                  {isGeneratingFAQ ? "Generating..." : "Generate FAQ"}
                </button>
              </div>
              <pre className="instructor-faq-box">{faq}</pre>
            </div>
          </div>
        ) : (
          <div className="instructor-manage-learning-materials-tab">
            <h1><LuBookMarked />Manage Learning Materials</h1>
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

      {showSubjectConfirmModal && (
        <div className="instructor-confirmation-modal">
          <div className="instructor-modal-content">
            <p>Are you sure you want to delete this subject?</p>
            <div className="instructor-modal-actions">
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