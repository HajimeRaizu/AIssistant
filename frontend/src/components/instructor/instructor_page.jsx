import React, { useState, useEffect, useRef } from "react";
import './instructor_page.css';
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { MdOutlineDashboard, MdOutlineQuestionAnswer } from "react-icons/md";
import { LuBookMarked } from "react-icons/lu";
import { BiLogOut } from "react-icons/bi";
import logo from '../assets/AIssistant.png';
import { FaEdit } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import { FaFileDownload } from "react-icons/fa";
import { MdCancel } from "react-icons/md";
import { IoIosSave } from "react-icons/io";
import Swal from 'sweetalert2'
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
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [totalQueries, setTotalQueries] = useState(0);
  const [queryData, setQueryData] = useState([]);
  const [graphFilter, setGraphFilter] = useState('weekly');
  const [faq, setFaq] = useState("");
  const [copyButtonText, setCopyButtonText] = useState("Copy");
  const [learningMaterials, setLearningMaterials] = useState({});
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState(null);
  const [editingExercise, setEditingExercise] = useState(null);
  const [showSubjectConfirmModal, setShowSubjectConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [totalLearningMaterials, setTotalLearningMaterials] = useState(0);
  const [isGeneratingFAQ, setIsGeneratingFAQ] = useState(false);
  const [userRole, setUserRole] = useState(localStorage.getItem("userRole") || "");
  const [editingSubject, setEditingSubject] = useState(null);
  const [editingLesson, setEditingLesson] = useState(null);
  const [editingSubtopic, setEditingSubtopic] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [showCreateSubjectModal, setShowCreateSubjectModal] = useState(false);
  const [showCreateLessonModal, setShowCreateLessonModal] = useState(false);
  const [showCreateSubtopicModal, setShowCreateSubtopicModal] = useState(false);
  const programmingLanguages = ["Python", "JavaScript", "Java", "C++", "C#", "HTML", "CSS"];

  const [newSubject, setNewSubject] = useState({
    subjectName: "",
    lessons: [],
  });
  const [newLesson, setNewLesson] = useState({
    lessonName: "",
    subtopics: [],
  });
  const [newSubtopic, setNewSubtopic] = useState({
    subtopicCode: "",
    subtopicTitle: "",
    content: "",
    questions: "",
    answers: "",
  });
  const [selectedLanguage, setSelectedLanguage] = useState("");

  const navigate = useNavigate();
  const isAuthenticated = localStorage.getItem("isAuthenticated");
  const userId = localStorage.getItem("userId");
  const userName = localStorage.getItem("userName");
  const userEmail = localStorage.getItem("userEmail");
  const userPicture = localStorage.getItem("profileImage");
  const [selectedWeek, setSelectedWeek] = useState("");
  const [weeklyPrompts, setWeeklyPrompts] = useState({});

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
            navigate("/student");
          } else if (role === "admin") {
            navigate("/admin");
          } else if (role === "instructor") {
            return;
          } else {
            navigate("/user-type");
          }
        } catch (error) {
          console.error("Failed to fetch user role:", error);
          navigate("/user-type");
        }
      } else {
        navigate("/user-type");
      }
    };
  
    fetchUserRole();
  }, [userId, userEmail, navigate]);
  
  useEffect(() => {
    const fetchTotalQueries = async () => {
      try {
        const instructorEmail = localStorage.getItem("userEmail");
        const response = await axios.get(`${base_url}/api/getStudentPromptsByInstructor`, {
          params: { instructorEmail },
        });
        const allMessages = response.data;
        setTotalQueries(allMessages.length);
        setQueryData(allMessages.map(message => ({
          timestamp: new Date(message.timestamp),
          text: message.text,
        })));
      } catch (error) {
        console.error("Failed to fetch total queries:", error);
      }
    };
  
    const fetchLearningMaterials = async () => {
      try {
        const instructorEmail = localStorage.getItem("userEmail");
        const response = await axios.get(`${base_url}/api/getInstructorLearningMaterials`, {
          params: { instructorEmail },
        });
        setLearningMaterials(response.data);
        setTotalLearningMaterials(Object.keys(response.data).length);
      } catch (error) {
        console.error("Failed to fetch learning materials:", error);
      }
    };
  
    const fetchData = async () => {
      await fetchTotalQueries();
      await fetchLearningMaterials();
      setIsLoading(false); // Set loading to false after fetching data
    };
  
    fetchData();
  }, []);

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
            <pre className="instructor-code" key={index}>
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

  const handleGenerateFAQ = async () => {
    if (isGeneratingFAQ || !selectedLanguage || !selectedWeek) return;
    setIsGeneratingFAQ(true);
    setFaq("");
  
    try {
      const instructorEmail = localStorage.getItem("userEmail");
  
      // Fetch the subjects owned by the instructor
      const subjectsResponse = await axios.get(`${base_url}/api/getInstructorLearningMaterials`, {
        params: { instructorEmail },
      });
      const subjectCodes = Object.keys(subjectsResponse.data);
  
      // Fetch students who have access to these subjects
      const studentsResponse = await axios.get(`${base_url}/api/getStudentsBySubjects`, {
        params: { subjectCodes },
      });
      const students = studentsResponse.data;
  
      // Fetch prompts from these students
      const prompts = [];
      for (const student of students) {
        const studentPromptsResponse = await axios.get(`${base_url}/api/getStudentPrompts`, {
          params: { studentEmail: student.email },
        });
        prompts.push(...studentPromptsResponse.data);
      }
  
      // Filter prompts based on the selected programming language and week
      const filteredPrompts = prompts
        .filter(prompt => 
          prompt.text.toLowerCase().includes(selectedLanguage.toLowerCase()) &&
          weeklyPrompts[selectedWeek].includes(prompt.text)
        )
        .map(prompt => prompt.text); // Extract only the `text` property
  
      // Generate FAQ using the filtered prompts
      const response = await fetch(`${base_url}/api/generateFAQInstructor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompts: filteredPrompts }), // Send only the `text` property
      });
  
      if (!response.ok) {
        throw new Error("Failed to generate FAQ");
      }
  
      const reader = response.body.getReader();
      let faqContent = "";
  
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
  
        const chunk = new TextDecoder().decode(value);
        faqContent += chunk;
  
        setFaq((prevFaq) => prevFaq + chunk);
      }
    } catch (error) {
      console.error("Failed to generate FAQ:", error);
      setFaq("Failed to generate FAQ. Please try again.");
    } finally {
      setIsGeneratingFAQ(false);
    }
  };

  const formatFAQText = (text) => {
    if (!text) return null;
  
    const boldTextRegex = /\*\*(.*?)\*\*/g; // Matches **bold** text
    const codeBlockRegex = /```([\s\S]*?)```/g; // Matches ```code blocks```
    const headingRegex = /###\s*(.*?)\n/g; // Matches ### headings
  
    // Split the text by code blocks first
    const parts = text.split(codeBlockRegex);
  
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // This is a code block
        return (
          <pre key={index} className="faq-code-block">
            <code>{part}</code>
          </pre>
        );
      }
  
      // Process headings and bold text in non-code parts
      const headingParts = part.split(headingRegex);
      return (
        <span key={index} className="faq-text" style={{ whiteSpace: 'pre-wrap' }}>
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
    navigate("/googleLogin");
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

  const groupPromptsByWeek = () => {
    const allMessages = queryData.map(message => ({
      timestamp: new Date(message.timestamp),
      text: message.text
    }));
  
    allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
    if (allMessages.length === 0) return {};
  
    const firstDate = new Date(allMessages[0].timestamp);
    const firstMonday = new Date(firstDate);
    if (firstMonday.getDay() !== 1) {
      firstMonday.setDate(firstMonday.getDate() - firstMonday.getDay() + 1);
    }
  
    let groupedData = {};
  
    let currentDate = new Date(firstMonday);
    let weekNumber = 1;
  
    while (currentDate <= new Date(allMessages[allMessages.length - 1].timestamp)) {
      let groupKey = `Week ${weekNumber}`;
      groupedData[groupKey] = [];
      weekNumber++;
      currentDate.setDate(currentDate.getDate() + 7);
    }
  
    allMessages.forEach(message => {
      const date = new Date(message.timestamp);
      const diff = Math.floor((date - firstMonday) / (7 * 24 * 60 * 60 * 1000));
      const groupKey = `Week ${Math.max(1, diff + 1)}`;
  
      if (groupKey in groupedData) {
        groupedData[groupKey].push(message.text);
      }
    });
  
    return groupedData;
  };
  
  useEffect(() => {
    const groupedPrompts = groupPromptsByWeek();
    setWeeklyPrompts(groupedPrompts);
  }, [queryData]);

  const handleDeleteSubject = async (subjectCode) => {
    try {
      const instructorEmail = localStorage.getItem("userEmail");
      await axios.delete(`${base_url}/api/deleteSubject/${subjectCode}`, {
        params: { instructorEmail },
      });
  
      const updatedLearningMaterials = { ...learningMaterials };
      delete updatedLearningMaterials[subjectCode]; 
      setLearningMaterials(updatedLearningMaterials);
      
      Swal.fire({
        title: "Success",
        text: "Subject deleted successfully!",
        icon: "success",
      });
    } catch (error) {
      console.error("Failed to delete subject:", error);
      Swal.fire({
        title: "Failed",
        text: "Failed to delete subject.",
        icon: "error",
      })
    }
  };
  
  const handleDeleteLesson = async (subjectCode, lessonIndex) => {
    try {
        await axios.delete(`${base_url}/api/deleteLesson/${subjectCode}/${lessonIndex}`);

        setLearningMaterials((prevMaterials) => {
          const updatedMaterials = JSON.parse(JSON.stringify(prevMaterials)); // Deep clone
          updatedMaterials[subjectCode].lessons = updatedMaterials[subjectCode].lessons.filter((_, index) => index !== lessonIndex);
          return updatedMaterials;
      });      

        // Reset selected lesson and subtopic
        setSelectedLesson(null);
        setSelectedSubtopic(null);

        Swal.fire({
          title: "Success",
          text: "Lesson deleted successfully!",
          icon: "success",
        })
    } catch (error) {
        console.error("Failed to delete lesson:", error);
        Swal.fire({
          title: "Failed",
          text: "Failed to delete lesson.",
          icon: "error",
        })
    }
};


const handleDeleteSubtopic = async (subjectCode, lessonIndex, subtopicIndex) => {
  try {
      await axios.delete(`${base_url}/api/deleteSubtopic/${subjectCode}/${lessonIndex}/${subtopicIndex}`);

      setLearningMaterials((prevMaterials) => {
        const updatedMaterials = JSON.parse(JSON.stringify(prevMaterials)); // Deep copy
        updatedMaterials[subjectCode].lessons[lessonIndex].subtopics = 
            updatedMaterials[subjectCode].lessons[lessonIndex].subtopics.filter((_, index) => index !== subtopicIndex);
        return updatedMaterials;
      });

      // Reset selected subtopic
      setSelectedSubtopic(null);

      Swal.fire({
        title: "Success",
        text: "Subtopic deleted successfully!",
        icon: "success",
      })
  } catch (error) {
      console.error("Failed to delete subtopic:", error);
      Swal.fire({
        title: "Failed",
        text: "Failed to delete subtopic.",
        icon: "error",
      })
  }
};


  const handleConfirmDelete = (item) => {
    setItemToDelete(item);
    setShowSubjectConfirmModal(true);
  };

  const handleUploadLearningMaterials = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const jsonContent = e.target.result;
        try {
          const learningMaterials = JSON.parse(jsonContent);
  
          const instructorEmail = localStorage.getItem("userEmail");
          const ownerName = localStorage.getItem("userName");
  
          learningMaterials.ownerEmail = instructorEmail;
          learningMaterials.ownerName = ownerName;
  
          const uploadResponse = await axios.post(`${base_url}/api/uploadLearningMaterials`, {
            learningMaterials,
            instructorEmail,
            ownerName,
          }, {
            headers: {
              "Content-Type": "application/json",
            },
          });
  
          if (uploadResponse.status === 200) {
            Swal.fire({
              title: "Success",
              title: "Uploaded!",
              text: "Learning materials uploaded successfully!",
              icon: "success",
            })
  
            const response = await axios.get(`${base_url}/api/getInstructorLearningMaterials`, {
              params: { instructorEmail },
            });
  
            setLearningMaterials(response.data);
  
            const uniqueSubjects = new Set(Object.keys(response.data));
            setTotalLearningMaterials(uniqueSubjects.size);
  
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
          } else {
            Swal.fire({
              title: "Failed",
              text: "Failed to upload learning materials.",
              icon: "error",
            })
          }
        } catch (error) {
          Swal.fire({
            title: "Failed",
            html: `Failed to upload learning materials:<br>${error}<br>${error.response}`,
            icon: "error",
          })
        }
      };
      reader.readAsText(file);
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
      docId: exercise.docId,
      content: exercise.content,
      questions: exercise.questions,
      answers: exercise.answers,
    });
  };

  const handleEditSubjectName = async (subjectCode, newSubjectName) => {
    try {
      await axios.put(`${base_url}/api/updateSubjectName/${subjectCode}`, {
        subjectName: newSubjectName,
      });
  
      setLearningMaterials((prevMaterials) => {
        const updatedMaterials = { ...prevMaterials };
        updatedMaterials[subjectCode].subjectName = newSubjectName;
        return updatedMaterials;
      });
  
      Swal.fire({
        title: "Success",
        text: "Subject name updated successfully!",
        icon: "success",
      })
    } catch (error) {
      console.error("Failed to update subject name:", error);
      Swal.fire({
        title: "Failed",
        text: "Failed to update subject name",
        icon: "error",
      })
    }
  };

  const handleEditLessonName = async (subjectCode, lessonIndex, newLessonName) => {
    try {
      await axios.put(`${base_url}/api/updateLessonName/${subjectCode}/${lessonIndex}`, {
        lessonName: newLessonName,
      });
  
      setLearningMaterials((prevMaterials) => {
        const updatedMaterials = { ...prevMaterials };
        updatedMaterials[subjectCode].lessons[lessonIndex].lessonName = newLessonName;
        return updatedMaterials;
      });
  
      Swal.fire({
        title: "Success",
        text: "Lesson name updated successfully!",
        icon: "success",
      })
    } catch (error) {
      console.error("Failed to update lesson name:", error);
      Swal.fire({
        title: "Failed",
        text: "Failed to update lesson name.",
        icon: "error",
      })
    }
  };

  const handleEditSubtopic = async (subjectCode, lessonIndex, subtopicIndex, newSubtopic) => {
    try {
      await axios.put(`${base_url}/api/updateSubtopic/${subjectCode}/${lessonIndex}/${subtopicIndex}`, newSubtopic);
  
      setLearningMaterials((prevMaterials) => {
        const updatedMaterials = { ...prevMaterials };
        updatedMaterials[subjectCode].lessons[lessonIndex].subtopics[subtopicIndex] = newSubtopic;
        return updatedMaterials;
      });
  
      Swal.fire({
        title: "Success",
        text: "Subtopic updated successfully!",
        icon: "success",
      })
    } catch (error) {
      console.error("Failed to update subtopic:", error);
      Swal.fire({
        title: "Failed",
        text: "Failed to update subtopic",
        icon: "error",
      })
    }
  };
  
  const handleSaveExercise = async () => {
    try {
      const updatedExercise = {
        content: editingExercise.content,
        questions: editingExercise.questions,
        answers: editingExercise.answers,
      };
  
      setLearningMaterials((prevMaterials) => {
        const updatedMaterials = JSON.parse(JSON.stringify(prevMaterials));
  
        if (
          updatedMaterials[selectedSubject] &&
          updatedMaterials[selectedSubject].lessons[selectedLesson] &&
          updatedMaterials[selectedSubject].lessons[selectedLesson].subtopics[selectedSubtopic]
        ) {
          updatedMaterials[selectedSubject].lessons[selectedLesson].subtopics[selectedSubtopic].content = updatedExercise.content;
          updatedMaterials[selectedSubject].lessons[selectedLesson].subtopics[selectedSubtopic].questions = updatedExercise.questions;
          updatedMaterials[selectedSubject].lessons[selectedLesson].subtopics[selectedSubtopic].answers = updatedExercise.answers;
        }
  
        return updatedMaterials;
      });
  
      await axios.put(
        `${base_url}/api/updateExercise/${selectedSubject}/${selectedLesson}/${selectedSubtopic}`,
        updatedExercise
      );
  
      setEditingExercise(null);
      Swal.fire({
        title: "Success",
        text: "Learning material updated successfully!",
        icon: "success",
      })
    } catch (error) {
      console.error("Failed to update exercise:", error);
      Swal.fire({
        title: "Failed",
        text: "Failed to update learning material",
        icon: "error",
      })
    }
  };

  const handleDownloadLearningMaterials = async (subjectCode) => {
    try {
      const instructorEmail = localStorage.getItem("userEmail");
  
      // Fetch learning materials for the selected subject
      const response = await axios.get(`${base_url}/api/getInstructorLearningMaterials`, {
        params: { instructorEmail },
      });
  
      if (!response.data[subjectCode]) {
        Swal.fire({
          title: "Error 404",
          text: "Learning materials not found",
          icon: "error",
        })
        return;
      }
  
      const learningMaterial = response.data[subjectCode];
      const jsonString = JSON.stringify(learningMaterial, null, 2); // Pretty-print JSON
  
      // Create a Blob object
      const blob = new Blob([jsonString], { type: "application/json" });
  
      // Create a temporary download link
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${learningMaterial.subjectName}.json`; // Set filename based on subject name
      document.body.appendChild(link);
      link.click();
  
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Failed to download learning materials:", error);
      Swal.fire({
        title: "Failed",
        text: "Failed to download learning material.",
        icon: "error",
      })
    }
  };

  const handleCopyCommand = () =>{
    const contentToCopy = `
extract all of the content of the files and follow the format below as reference. make sure to add the necessary line breaks so that it will be rendered properly when it is being displayed and use ###header, **bold text**, '''code snippet'''. also leave the questions and answers empty and make sure that the subject names and content are based on the files
{
    "subjectName": "Intermediate Python Programming",
    "lessons": [
        {
            "lessonName": "Lesson 1",
            "subtopics": [
                {
                    "subtopicCode": 1,
                    "subtopicTitle": "Introduction to Python",
                    "content": "Python is an interpreted, object-oriented, high-level programming language.\nPython has a simple syntax similar to English language.\nPython is portable.\nPython codes have fewer lines.\nIt was created by Guido van Rossum and released in 1991.\n\nPython is easy to understand and can be used to create:\n- Web Applications\n- Data Science and Data Visualization\n- Machine Learning\n- Script for Vulnerability Testing\n- Embedded Systems and IoT\n- Job Scheduling and Automation\n- Computer Vision and Image Processing\n\nPython IDEs include VS Code, PyCharm, Sublime Text, Spyder, and more.\n\nCompanies using Python include Facebook, Dropbox, Mozilla, Firefox, Google, and YouTube.\n\nPython is popular due to its simplicity, high salary potential, and versatility in various fields such as web development, data science, and artificial intelligence.\n\nPython requirements include Python 3.11.0 or later, an interpreter, and a text editor like Sublime or VS Code. IDEs like Anaconda or PyCharm are optional.\n\nPython code can be executed via IDLE, command line, or Python shell.\n\nPython identifiers are names used to identify variables, functions, classes, modules, or other objects. They start with a letter or underscore and can contain letters, underscores, and digits. Python is case-sensitive.\n\nPython reserved words include 'and', 'as', 'assert', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'None', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'True', 'try', 'while', 'with', and 'yield'.\n\nPython uses indentation to indicate code blocks. Multi-line statements can be created using the line continuation character (\\).\n\nPython supports single, double, and triple quotes for string literals. Comments start with a # and are ignored by the Python interpreter.\n\nVariables in Python are containers for storing data values. They are created when a value is assigned to them. Variable names are case-sensitive and must start with a letter or underscore.\n\nPython data types include numeric (int, float, complex), string (str), sequence (list, tuple, range), binary (bytes, bytearray, memoryview), mapping (dict), boolean (bool), set (set, frozenset), and NoneType.\n\nPython variables refer to objects, not memory locations. Multiple variables can refer to the same object.\n\nEscape sequences in Python include \\\\ for backslash, \\n for new line, \\r for carriage return, \\t for tab, and \\b for backspace.\n\nOutput in Python can be displayed using the print() function. Variables can be combined with text using the + operator or formatted using str.format(), f-strings, or data type placeholders.\n\nCasting in Python allows converting one data type into another. Arithmetic operators include +, -, *, /, %, //, and **. Comparison operators include ==, !=, <, <=, >, and >=. Logical operators include not, or, and and.\n\nThe input() function in Python accepts user input.",
                    "questions": "",
                    "answers": ""
                }
            ]
        },
        {
            "lessonName": "Lesson 2",
            "subtopics": [
                {
                    "subtopicCode": 2,
                    "subtopicTitle": "Strings and Math Built-in Functions",
                    "content": "Strings are sequences of characters interpreted as text.\nStrings can be accessed using positive or negative index numbers.\nString placeholders can be used with format() or % for formatting.\nString formatting functions include upper(), lower(), capitalize(), title(), split(), replace(), and len().\n\nNumber formatting functions include round(), ceil(), floor(), and pow().\n\nPython math built-in functions include math.ceil(), math.factorial(), math.pi, and math.e.\n\nMathematical constants in Python include math.pi (3.141592653589793) and math.e (2.718281828459045).\n\nNumber formatting can be done using % for limiting decimal places, format(), or round().\n\nPython conditions can be used with math functions like round(), ceil(), floor(), and pow().",
                    "questions": "",
                    "answers": ""
                }
            ]
        },
        {
            "lessonName": "Lesson 3",
            "subtopics": [
                {
                    "subtopicCode": 3,
                    "subtopicTitle": "Control Structures",
                    "content": "Control structures in Python allow for the execution of statements based on conditions.\n\nTypes of control structures:\n1. Sequence: Statements are executed sequentially.\n2. Selection: Provides a choice between two alternatives based on a condition.\n3. Iteration: Allows repetition of instructions or statements in a loop body.\n\nSelection structures include if, if...else, and if...elif...else statements.\n\nComparison operators include ==, !=, <, <=, >, and >=.\n\nLogical operators include not, or, and and.\n\nNested if statements allow for multiple levels of condition checking.\n\nShort-hand if statements can be written in a single line using the syntax <if-expression> if <condition> else <else-expression>.\n\nCompound conditions involve multiple conditional expressions combined using and/or.\n\nBuilt-in methods for strings include isupper(), islower(), isdigit(), and isalpha().\n\nPractice exercises include checking employee years in service and office, and calculating discounts for an online store.",
                    "questions": "",
                    "answers": ""
                }
            ]
        },
        {
            "lessonName": "Lesson 4",
            "subtopics": [
                {
                    "subtopicCode": 4,
                    "subtopicTitle": "Iteration",
                    "content": "Iteration allows the repetition of instructions or statements in a loop body.\n\nTypes of loops in Python:\n1. while loop: Repeats a statement or group of statements while a condition is true.\n2. for loop: Executes a code block multiple times, often used for traversing arrays.\n3. Nested loops: Loops inside other loops.\n\nLoop control statements include break, continue, and pass.\n\nCommon loop applications include accumulating totals, validating user entry, and iterating through sequences.\n\nThe while loop continues as long as the condition is true. The for loop is used when the number of iterations is known.\n\nInfinite loops occur when the loop condition is always true. The break statement terminates the loop immediately.\n\nThe range() function generates a sequence of numbers and is often used with for loops.\n\nThe enumerate() function adds a counter to an iterable and returns it as an enumerate object.\n\nLoop control statements like continue skip the current iteration, while pass does nothing and is used as a placeholder.\n\nHands-on exercises include traversing a list to determine if numbers are odd or even, adding two numbers with user input, and creating a word bank program.",
                    "questions": "",
                    "answers": ""
                }
            ]
        },
        {
            "lessonName": "Lesson 5",
            "subtopics": [
                {
                    "subtopicCode": 5,
                    "subtopicTitle": "Functions",
                    "content": "Functions are blocks of organized, reusable code used to perform a single, related action.\n\nFunctions provide better modularity and code reusability.\n\nFunctions help reduce duplicate code, make programs easier to read and debug, and allow for code reuse.\n\nFunctions in Python are defined using the def keyword, followed by the function name and parentheses.\n\nFunction arguments can be positional, keyword, default, or arbitrary.\n\nFunctions can return values using the return statement.\n\nPython has built-in functions like print(), input(), type(), float(), and int(), as well as user-defined functions.\n\nFunction names must start with a letter or underscore and should be lowercase. They can contain numbers but should not start with one.\n\nFunctions can accept multiple parameters and return multiple values.\n\nFunctions can accept interactive user input using the input() function.\n\nGlobal and local variables in functions: Global variables are defined outside the function and can be accessed inside the function. Local variables are defined inside the function and are not accessible outside.\n\nRecursion is when a function calls itself.\n\nThe ternary operator allows for quick conditional definitions.\n\nFunctions can be called with keyword arguments, and default argument values can be set.\n\nMutable objects as default argument values should be used carefully, as they are evaluated only once.\n\nThe pass statement is used as a placeholder for future code.\n\nHands-on exercises include writing a program with user-defined functions and a menu within a while loop.",
                    "questions": "",
                    "answers": ""
                }
            ]
        },
        {
            "lessonName": "Lesson 6",
            "subtopics": [
                {
                    "subtopicCode": 6,
                    "subtopicTitle": "Introduction to Tkinter",
                    "content": "Tkinter is the standard GUI library for Python. Python when combined with Tkinter provides a fast and easy way to create GUI applications. Tkinter provides a powerful object-oriented interface to the Tk GUI toolkit.\n\nCreating a GUI application using Tkinter involves the following steps:\n1. Import the Tkinter module.\n2. Create the GUI application main window.\n3. Add one or more widgets to the GUI application.\n4. Enter the main event loop to take action against each event triggered by the user.\n\nTkinter widgets include Button, Canvas, Checkbutton, Entry, Frame, Label, Listbox, Menubutton, Menu, Message, Radiobutton, Scale, Scrollbar, Text, Toplevel, Spinbox, PanedWindow, LabelFrame, and tkMessageBox.\n\nStandard attributes in Tkinter include dimensions, colors, fonts, anchors, relief styles, bitmaps, and cursors.\n\nGeometry management in Tkinter is done using the pack(), grid(), and place() methods.\n\nThe pack() method organizes widgets in blocks before placing them in the parent widget.\n\nThe grid() method organizes widgets in a table-like structure in the parent widget.\n\nThe place() method organizes widgets by placing them in a specific position in the parent widget.\n\nTkinter also provides modules like tkinter.simpledialog, tkinter.filedialog, and tkinter.colorchooser for common dialogs.\n\nThe ttk module provides themed widgets with a modern look and feel across platforms.\n\nEvent handling in Tkinter involves binding events to callback functions using the bind() method or the command parameter in widget constructors.\n\nTkinter supports rendering images using the PhotoImage method.\n\nA simple calculator can be created using Tkinter by defining functions for button clicks, clearing the input field, and evaluating expressions.",
                    "questions": "",
                    "answers": ""
                },
                {
                    "subtopicCode": 6.1,
                    "subtopicTitle": "Introduction to Tkinter (Detailed)",
                    "content": "Tkinter is the standard GUI library for Python. It provides a fast and easy way to create GUI applications.\n\nTo create a window in Tkinter:\n1. Import the tkinter module as tk.\n2. Create an instance of the tk.Tk class to create the application window.\n3. Call the mainloop() method to keep the window visible.\n\nWidgets in Tkinter include Label, Button, Entry, and more. Widgets are created using the syntax: widget = WidgetName(master, **options).\n\nThe title of the window can be changed using the title() method.\n\nThe size and location of the window can be controlled using the geometry() method.\n\nThe resizable() method can prevent the window from being resized.\n\nTransparency of the window can be set using the attributes() method with the '-alpha' option.\n\nBackground color of the window can be set using the configure() method.\n\nLabels can be added to the window using the Label widget. Fonts for labels can be set using the font keyword argument.\n\nImages can be displayed in Tkinter using the PhotoImage method.\n\nWindow stacking order can be controlled using the attributes() method with the '-topmost' option, and the lift() and lower() methods.\n\nThe default icon of the window can be changed using the iconbitmap() method.\n\nThe ttk module provides themed widgets with a modern look and feel across platforms. It includes widgets like Button, Checkbutton, Entry, Frame, Label, LabelFrame, Menubutton, PanedWindow, Radiobutton, Scale, Scrollbar, Combobox, Notebook, Progressbar, Separator, Sizegrip, and Treeview.\n\nEvent handling in Tkinter involves binding events to callback functions using the bind() method or the command parameter in widget constructors.\n\nA simple login form can be created using Tkinter by adding labels, entry fields, and buttons.",
                    "questions": "",
                    "answers": ""
                },
                {
                    "subtopicCode": 6.2,
                    "subtopicTitle": "Tkinter Geometry Manager",
                    "content": "Tkinter uses geometry managers to organize widgets on a window. The three geometry managers are pack, grid, and place.\n\nThe pack geometry manager organizes widgets in blocks before placing them on the container widget. It has options like side, expand, fill, ipadx, ipady, padx, pady, and anchor.\n\nThe side parameter determines the direction of the widgets in the pack layout. Options include 'top', 'bottom', 'left', and 'right'.\n\nThe expand parameter determines whether the widget should expand to occupy any extra spaces allocated to the container.\n\nThe fill parameter determines if a widget will occupy the available space. Options include 'x', 'y', 'both', and 'none'.\n\nThe ipadx and ipady parameters create internal paddings for widgets.\n\nThe padx and pady parameters allow you to specify external padding to be added horizontally and vertically.\n\nThe anchor parameter allows you to anchor the widget to the edge of the allocated space.\n\nThe place geometry manager allows you to specify the exact placement of a widget using either absolute or relative positioning.\n\nThe grid geometry manager uses the concepts of rows and columns to arrange the widgets. It allows you to configure the rows and columns using the columnconfigure() and rowconfigure() methods.\n\nThe sticky option in the grid geometry manager specifies which edge of the cell the widget should stick to.\n\nPadding between cells of a grid can be added using the padx and pady options.\n\nA login screen can be designed using the grid geometry manager by configuring the grid and positioning the widgets.",
                    "questions": "",
                    "answers": ""
                }
            ]
        },
        {
            "lessonName": "Lesson 7",
            "subtopics": [
                {
                    "subtopicCode": 7,
                    "subtopicTitle": "Introduction to OOP in Python",
                    "content": "Object-oriented programming (OOP) is a method of structuring a program by bundling related properties and behaviors into individual objects.\n\nOOP is based on the concept of classes and objects. A class is like a blueprint for creating objects, and an object is an instance of a class.\n\nOOP helps reduce complexity and increase reusability through encapsulation, inheritance, polymorphism, and abstraction.\n\nEncapsulation allows you to group functions and variables together.\n\nInheritance allows a class to inherit properties and methods from another class.\n\nPolymorphism allows objects to take multiple forms.\n\nAbstraction hides the complexity of a program and exposes only relevant details.\n\nIn Python, a class is defined using the class keyword. The __init__ method is used to initialize objects.\n\nInstance variables are unique to each object, while class variables are shared among all instances of a class.\n\nMethods in a class are functions that define the behavior of the objects.\n\nInheritance allows a class to inherit attributes and methods from a parent class. Child classes can override or extend the functionality of the parent class.\n\nPolymorphism allows methods to behave differently based on the object that calls them.\n\nAbstraction is achieved by hiding the internal details of a class and exposing only the necessary functionality.\n\nAccess modifiers in Python include public, protected, and private. Public members are accessible from anywhere, protected members are accessible within the class and its subclasses, and private members are accessible only within the class.\n\nInheritance types in Python include single inheritance, multiple inheritance, multilevel inheritance, and hierarchical inheritance.\n\nHands-on exercises include creating classes, defining methods, and implementing inheritance and polymorphism.",
                    "questions": "",
                    "answers": ""
                }
            ]
        }
    ]
}`;

    navigator.clipboard
      .writeText(contentToCopy)
      .then(() => {
        Swal.fire({
          title: "Prompt copied!",
          text: "Upload learning materials to be extracted in external AI and paste copied prompt",
          icon: "success",
        })
      })
      .catch((err) => {
        Swal.fire({
          title: "Error occured in copying prompt!",
          text: `Error: ${err}`,
          icon: "error",
        })
      });
  }

  const renderExercises = () => {
    if (selectedSubject === null || selectedSubject === undefined) {
      return (
        <div>
          <button className="add-subject" onClick={handleCreateNewSubject}>
            Add Subject
          </button>
          {Object.keys(learningMaterials).map((subject) => (
            <div
              key={subject}
              className="instructor-exercise-subject"
              onClick={() => setSelectedSubject(subject)}
            >
              {editingSubject === subject ? (
                <input
                  type="text"
                  className="edit-subject-name"
                  value={learningMaterials[subject].subjectName}
                  onChange={(e) => {
                    const updatedMaterials = { ...learningMaterials };
                    updatedMaterials[subject].subjectName = e.target.value;
                    setLearningMaterials(updatedMaterials);
                  }}
                  onClick={(e) =>{
                    e.stopPropagation();
                  }}
                />
              ) : (
                <div>{learningMaterials[subject].subjectName}</div>
              )}
              <div className="control-buttons">
                {editingSubject === subject ? (
                  <>
                    <button
                      className="instructor-save-edit-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditSubjectName(subject, learningMaterials[subject].subjectName);
                        setEditingSubject(null);
                      }}
                      title='Save'
                    >
                      <IoIosSave />
                    </button>
                    <button
                      className="instructor-cancel-edit-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSubject(null);
                      }}
                      title='Cancel'
                    >
                      <MdCancel />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="instructor-edit-subject-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSubject(subject);
                      }}
                      title='Edit'
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="instructor-delete-subject-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConfirmDelete({ type: 'subject', subjectCode: subject });
                      }}
                      title='Delete'
                    >
                      <MdDelete />
                    </button>
                    <button className="download-learning-material" onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadLearningMaterials(subject);
                    }} title='Download'><FaFileDownload /></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    } else if (selectedLesson === null || selectedLesson === undefined) {
      const subjectData = learningMaterials[selectedSubject];
      const lessons = subjectData.lessons;
  
      return (
        <div>
          <div className="subject-id-container">
            <p>Subject Code: {subjectData.subjectCode}</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(subjectData.subjectCode);
                setCopyButtonText("Copied");
                setTimeout(() => setCopyButtonText("Copy"), 2000);
              }}
            >
              {copyButtonText}
            </button>
          </div>
          <button className="add-lesson" onClick={() => setShowCreateLessonModal(true)}>
            Add Lesson
          </button>
          <div>
            {lessons.map((lesson, index) => (
              <div onClick={() => setSelectedLesson(index)} key={`lesson-${index}`} className="instructor-exercise-lesson">
                {editingLesson === index ? (
                  <input
                    type="text"
                    value={lesson.lessonName}
                    onChange={(e) => {
                      const updatedMaterials = { ...learningMaterials };
                      updatedMaterials[selectedSubject].lessons[index].lessonName = e.target.value;
                      setLearningMaterials(updatedMaterials);
                    }}
                    onClick={(e) =>{
                      e.stopPropagation();
                    }}
                  />
                ) : (
                  <div>{lesson.lessonName}</div>
                )}
                <div className="control-buttons">
                  {editingLesson === index ? (
                    <>
                      <button
                        className="instructor-save-edit-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditLessonName(selectedSubject, index, lesson.lessonName);
                          setEditingLesson(null);
                        }}
                        title='Save'
                      >
                        <IoIosSave />
                      </button>
                      <button
                        className="instructor-cancel-edit-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingLesson(null);
                        }}
                        title='Cancel'
                      >
                        <MdCancel />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="instructor-edit-lesson-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingLesson(index);
                        }}
                        title='Edit'
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="instructor-delete-lesson-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmDelete({ type: 'lesson', subjectCode: selectedSubject, lessonIndex: index });
                        }}
                        title='Delete'
                      >
                        <MdDelete />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            <button className="instructor-back-to-subjects-button" onClick={handleBackToSubjects}>
              Back to Subjects
            </button>
          </div>
        </div>
      );
    } else if (selectedSubtopic === null || selectedSubtopic === undefined) {
      const lessonData = learningMaterials[selectedSubject].lessons[selectedLesson];
      const subtopics = lessonData.subtopics;
  
      return (
        <div>
          <button className="add-subtopic" onClick={() => setShowCreateSubtopicModal(true)}>
            Add Subtopic
          </button>
          <div>
            {subtopics.map((subtopic, index) => (
              <div onClick={() => setSelectedSubtopic(index)} key={`subtopic-${index}`} className="instructor-exercise-subtopic">
                {editingSubtopic === index ? (
                  <div className="input-fields">
                    <input
                      className="subtopic-code"
                      type="text"
                      value={subtopic.subtopicCode}
                      onChange={(e) => {
                        const updatedMaterials = { ...learningMaterials };
                        updatedMaterials[selectedSubject].lessons[selectedLesson].subtopics[index].subtopicCode = e.target.value;
                        setLearningMaterials(updatedMaterials);
                      }}
                      onClick={(e) =>{
                        e.stopPropagation();
                      }}
                    />
                    <input
                      className="subtopic-name"
                      type="text"
                      value={subtopic.subtopicTitle}
                      onChange={(e) => {
                        const updatedMaterials = { ...learningMaterials };
                        updatedMaterials[selectedSubject].lessons[selectedLesson].subtopics[index].subtopicTitle = e.target.value;
                        setLearningMaterials(updatedMaterials);
                      }}
                      onClick={(e) =>{
                        e.stopPropagation();
                      }}
                    />
                  </div>
                ) : (
                  <div>
                    {`${subtopic['subtopicCode']} - ${subtopic['subtopicTitle']}`}
                  </div>
                )}
                <div className="control-buttons">
                  {editingSubtopic === index ? (
                    <>
                      <button
                        className="instructor-save-edit-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditSubtopic(selectedSubject, selectedLesson, index, {
                            subtopicCode: subtopic.subtopicCode,
                            subtopicTitle: subtopic.subtopicTitle,
                            content: subtopic.content,
                            questions: subtopic.questions,
                            answers: subtopic.answers,
                          });
                          setEditingSubtopic(null);
                        }}
                        title='Save'
                      >
                        <IoIosSave />
                      </button>
                      <button
                        className="instructor-cancel-edit-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSubtopic(null);
                        }}
                        title='Cancel'
                      >
                        <MdCancel />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="instructor-edit-subtopic-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSubtopic(index);
                        }}
                        title='Edit'
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="instructor-delete-subtopic-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmDelete({ type: 'subtopic', subjectCode: selectedSubject, lessonIndex: selectedLesson, subtopicIndex: index });
                        }}
                        title='Delete'
                      >
                        <MdDelete />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            <button className="instructor-back-to-lessons-button" onClick={handleBackToLessons}>
              Back to Lessons
            </button>
          </div>
        </div>
      );
    } else {
      const subtopic =
        learningMaterials[selectedSubject].lessons[selectedLesson].subtopics[selectedSubtopic];
  
      return (
        <div className="instructor-exercise-content">
          <h2>{`${subtopic['subtopicCode']} - ${subtopic['subtopicTitle']}`}</h2>
          {editingExercise ? (
            <textarea
              className="instructor-content-textarea"
              value={editingExercise.content}
              onChange={(e) =>
                setEditingExercise({ ...editingExercise, content: e.target.value })
              }
            />
          ) : (
            <span>{formatText(subtopic.content, "bot")}</span>
          )}
  
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
            <span>{subtopic.questions}</span>
          )}
  
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
            <span>{subtopic.answers}</span>
          )}
  
          <div className="instructor-content-buttons">
            {editingExercise ? (
              <div className="instructor-e-buttons">
                <button title='Save' className="instructor-save-button" onClick={handleSaveExercise} style={{background: '#46cb4b'}}>
                <IoIosSave />
                </button>
                <button title='Cancel' className="instructor-cancel-button" onClick={() => setEditingExercise(null)} style={{background: 'rgb(255, 88, 88)'}}>
                <MdCancel />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  handleEditExercise({
                    docId: selectedSubject,
                    content: subtopic.content,
                    questions: subtopic.questions,
                    answers: subtopic.answers,
                  });
                }}
                title='Edit'
                style={{ background: '#53b2ff' }}
              >
                <FaEdit />
              </button>
            )}
            <button onClick={handleBackToSubtopics}>Back to Subtopics</button>
            <button onClick={handleBackToLessons}>Back to Lessons</button>
            <button onClick={handleBackToSubjects}>Back to Subjects</button>
          </div>
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

  const handleCreateNewSubject = () => {
    setShowCreateSubjectModal(true);
  };

  const renderCreateSubjectModal = () => {
    return (
      <div className="instructor-create-material-modal">
        <div className="instructor-modal-content">
          <h2>Create New Subject</h2>
          <div className="instructor-create-material-form">
            <label>Subject Name:</label>
            <input
              type="text"
              value={newSubject.subjectName}
              onChange={(e) =>
                setNewSubject({ ...newSubject, subjectName: e.target.value })
              }
              onClick={(e) =>{
                e.stopPropagation();
              }}
            />
          </div>
          <div className="instructor-modal-actions">
            <button onClick={handleSaveSubject}>Save</button>
            <button onClick={() => setShowCreateSubjectModal(false)}>Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  const handleSaveSubject = async () => {
    try {
      const instructorEmail = localStorage.getItem("userEmail");
      const ownerName = localStorage.getItem("userName");
  
      const newSubjectData = {
        subjectName: newSubject.subjectName,
        ownerName: ownerName,
        ownerEmail: instructorEmail,
        lessons: [],
      };
  
      const response = await axios.post(`${base_url}/api/createSubject`, newSubjectData);
  
      if (response.status === 200) {
        Swal.fire({
          title: "Success",
          text: "Subject created successfully!",
          icon: "success",
        })
        setShowCreateSubjectModal(false);
        setNewSubject({ subjectName: "", lessons: [] });
  
        const updatedResponse = await axios.get(`${base_url}/api/getInstructorLearningMaterials`, {
          params: { instructorEmail },
        });
        setLearningMaterials(updatedResponse.data);
      } else {
        Swal.fire({
          title: "Failed",
          text: "Failed to create subject",
          icon: "error",
        })
      }
    } catch (error) {
      console.error("Failed to create subject:", error);
      Swal.fire({
        title: "Failed",
        text: "Failed to create subject",
        icon: "error",
      })
    }
  };

  const handleAddLesson = () => {
    setNewSubject((prev) => ({
      ...prev,
      lessons: [...prev.lessons, newLesson],
    }));
    setNewLesson({
      lessonName: "",
      subtopics: [],
    });
  };

  const renderCreateLessonModal = () => {
    return (
      <div className="instructor-create-lesson-modal">
        <div className="instructor-modal-content">
          <h2>Create New Lesson</h2>
          <div className="instructor-create-lesson-form">
            <label>Lesson Name:</label>
            <input
              type="text"
              value={newLesson.lessonName}
              onChange={(e) =>
                setNewLesson({ ...newLesson, lessonName: e.target.value })
              }
              onClick={(e) =>{
                e.stopPropagation();
              }}
            />
          </div>
          <div className="instructor-modal-actions">
            <button onClick={handleSaveLesson}>Save</button>
            <button onClick={() => setShowCreateLessonModal(false)}>Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  const handleSaveLesson = async () => {
    try {
      const instructorEmail = localStorage.getItem("userEmail");
  
      const newLessonData = {
        lessonName: newLesson.lessonName,
        subtopics: [],
      };
  
      const response = await axios.put(
        `${base_url}/api/addLesson/${selectedSubject}`,
        newLessonData,
        {
          params: { instructorEmail },
        }
      );
  
      if (response.status === 200) {
        Swal.fire({
          title: "Success",
          text: "Lesson created successfully!",
          icon: "success",
        })
        setShowCreateLessonModal(false);
        setNewLesson({ lessonName: "", subtopics: [] });
  
        const updatedResponse = await axios.get(`${base_url}/api/getInstructorLearningMaterials`, {
          params: { instructorEmail },
        });
        setLearningMaterials(updatedResponse.data);
      } else {
        Swal.fire({
          title: "Failed",
          text: "Failed to create Lesson",
          icon: "error",
        })
      }
    } catch (error) {
      console.error("Failed to create lesson:", error);
      Swal.fire({
        title: "Failed",
        text: "Failed to create lesson.",
        icon: "error",
      })
    }
  };

  const handleAddSubtopic = () => {
    setNewLesson((prev) => ({
      ...prev,
      subtopics: [...prev.subtopics, newSubtopic],
    }));
    setNewSubtopic({
      subtopicCode: "",
      subtopicTitle: "",
      content: "",
      questions: "",
      answers: "",
    });
  };

  const renderCreateSubtopicModal = () => {
    return (
      <div className="instructor-create-subtopic-modal">
        <div className="instructor-modal-content">
          <h2>Create New Subtopic</h2>
          <div className="instructor-create-subtopic-form">
            <label>Subtopic Code:</label>
            <input
              type="text"
              value={newSubtopic.subtopicCode}
              onChange={(e) =>
                setNewSubtopic({ ...newSubtopic, subtopicCode: e.target.value })
              }
              onClick={(e) =>{
                e.stopPropagation();
              }}
            />
            <label>Subtopic Title:</label>
            <input
              type="text"
              value={newSubtopic.subtopicTitle}
              onChange={(e) =>
                setNewSubtopic({ ...newSubtopic, subtopicTitle: e.target.value })
              }
              onClick={(e) =>{
                e.stopPropagation();
              }}
            />
            <label>Content:</label>
            <textarea
              value={newSubtopic.content}
              onChange={(e) =>
                setNewSubtopic({ ...newSubtopic, content: e.target.value })
              }
            />
            <label>Questions:</label>
            <textarea
              value={newSubtopic.questions}
              onChange={(e) =>
                setNewSubtopic({ ...newSubtopic, questions: e.target.value })
              }
            />
            <label>Answers:</label>
            <textarea
              value={newSubtopic.answers}
              onChange={(e) =>
                setNewSubtopic({ ...newSubtopic, answers: e.target.value })
              }
            />
          </div>
          <div className="instructor-modal-actions">
            <button onClick={handleSaveSubtopic}>Save</button>
            <button onClick={() => setShowCreateSubtopicModal(false)}>Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  const handleSaveSubtopic = async () => {
    try {
      const instructorEmail = localStorage.getItem("userEmail");
  
      const newSubtopicData = {
        subtopicCode: newSubtopic.subtopicCode,
        subtopicTitle: newSubtopic.subtopicTitle,
        content: newSubtopic.content,
        questions: newSubtopic.questions,
        answers: newSubtopic.answers,
      };
  
      const response = await axios.put(
        `${base_url}/api/addSubtopic/${selectedSubject}/${selectedLesson}`,
        newSubtopicData,
        {
          params: { instructorEmail },
        }
      );
  
      if (response.status === 200) {
        Swal.fire({
          title: "Success",
          text: "Subtopic created successfully!",
          icon: "success",
        })
        setShowCreateSubtopicModal(false);
        setNewSubtopic({
          subtopicCode: "",
          subtopicTitle: "",
          content: "",
          questions: "",
          answers: "",
        });
  
        const updatedResponse = await axios.get(`${base_url}/api/getInstructorLearningMaterials`, {
          params: { instructorEmail },
        });
        setLearningMaterials(updatedResponse.data);
      } else {
        Swal.fire({
          title: "Failed",
          text: "Failed to create subtopic",
          icon: "error",
        })
      }
    } catch (error) {
      console.error("Failed to create subtopic:", error);
      Swal.fire({
        title: "Failed",
        text: "Failed to create subtopic",
        icon: "error",
      })
    }
  };

  const handleConfirmDeleteAction = () => {
    if (itemToDelete.type === 'subject') {
      handleDeleteSubject(itemToDelete.subjectCode);
    } else if (itemToDelete.type === 'lesson') {
      handleDeleteLesson(itemToDelete.subjectCode, itemToDelete.lessonIndex);
    } else if (itemToDelete.type === 'subtopic') {
      handleDeleteSubtopic(itemToDelete.subjectCode, itemToDelete.lessonIndex, itemToDelete.subtopicIndex);
    }
    
    setShowSubjectConfirmModal(false);
  };

  if (isLoading) {
    return <div className="instructor-loading-container">Loading...</div>;
  }

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
        <div className="admin-header">
          <div className="admin-pf-border">
            <img src={userPicture} className="admin-pfp" alt="" />
            <p className="admin-user-name">{userName}</p>
          </div>
        </div>
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
                <div>
                  <select 
                    value={selectedLanguage} 
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    style={{ marginRight: '10px' }}
                  >
                    <option value="">Select a language</option>
                    {programmingLanguages.map((language, index) => (
                      <option key={index} value={language}>{language}</option>
                    ))}
                  </select>
                  <select 
                    value={selectedWeek} 
                    onChange={(e) => setSelectedWeek(e.target.value)}
                    style={{ marginRight: '10px' }}
                  >
                    <option value="">Select a week</option>
                    {Object.keys(weeklyPrompts).map((week, index) => (
                      <option key={index} value={week}>{week}</option>
                    ))}
                  </select>
                  <button 
                    className="generate-faq-button"
                    onClick={handleGenerateFAQ}
                    disabled={isGeneratingFAQ || !selectedLanguage || !selectedWeek}
                  >
                    {isGeneratingFAQ ? "Generating..." : "Generate FAQ"}
                  </button>
                </div>
              </div>
              <pre className="instructor-faq-box">{formatFAQText(faq)}</pre>
            </div>
          </div>
        ) : (
          <div className="instructor-manage-learning-materials-tab">
            <h1><LuBookMarked />Manage Learning Materials</h1>
            <input
              style={{width: 'fit-content'}}
              type="file" 
              accept=".json" 
              onChange={handleUploadLearningMaterials} 
              ref={fileInputRef}
            />
            <p>Upload an Excel file to add learning materials.</p>
            <button className="learning-material-command" onClick={handleCopyCommand}>Copy learning material prompt</button>
            <pre className="legend">
              <p style={{fontWeight: 'bold',}}>Learning material elements:</p>
              <p>###Header</p>
              <p>**Bold text**</p>
              <p>'''Code Snippets''''</p>
            </pre>
            <div className="instructor-exercises-container">
              {renderExercises()}
            </div>
          </div>
        )}
      </div>

      {showSubjectConfirmModal && (
        <div className="instructor-confirmation-modal">
          <div className="instructor-modal-content">
            <p>Are you sure you want to delete this {itemToDelete.type}?</p>
            <div className="instructor-modal-actions">
              <button onClick={handleConfirmDeleteAction}>Yes</button>
              <button onClick={() => setShowSubjectConfirmModal(false)}>No</button>
            </div>
          </div>
        </div>
      )}

      {showCreateSubjectModal && renderCreateSubjectModal()}
      {showCreateLessonModal && renderCreateLessonModal()}
      {showCreateSubtopicModal && renderCreateSubtopicModal()}
    </div>
  );
};

export default InstructorPage;