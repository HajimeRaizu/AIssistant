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

  function getDefaultGraphData() {
    // Return an array with default values (e.g., 7 days with 0 queries)
    return [
        { name: 'Mon', queries: 0 },
        { name: 'Tue', queries: 0 },
        { name: 'Wed', queries: 0 },
        { name: 'Thu', queries: 0 },
        { name: 'Fri', queries: 0 },
        { name: 'Sat', queries: 0 },
        { name: 'Sun', queries: 0 }
    ];
}

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
extract all of the content of the files and follow the format below as reference. make sure to add the necessary line breaks so that it will be rendered properly when it is being displayed and use ###header, **bold text**, '''code snippet'''. also leave the questions and answers empty and make sure that the subject names and content are based on the content of the files.
format reference (number of lessons depend on the content of files):
{
    "subjectName": "",
    "lessons": [
        {
            "lessonName": "",
            "subtopics": [
                {
                    "subtopicCode": 1,
                    "subtopicTitle": "",
                    "content": "",
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
                    "subtopicTitle": "",
                    "content": "",
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
                    "subtopicTitle": "",
                    "content": "",
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
                    "subtopicTitle": "",
                    "content": "",
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
                    "subtopicTitle": "",
                    "content": "",
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
                    "subtopicTitle": "",
                    "content": "",
                    "questions": "",
                    "answers": ""
                },
                {
                    "subtopicCode": 6.1,
                    "subtopicTitle": "",
                    "content": "",
                    "questions": "",
                    "answers": ""
                },
                {
                    "subtopicCode": 6.2,
                    "subtopicTitle": "",
                    "content": "",
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
                    "subtopicTitle": "",
                    "content": "",
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
                    data={getGraphData().length > 0 ? getGraphData() : getDefaultGraphData()}
                    margin={{
                        top: 10,
                        right: 30,
                        left: 0,
                        bottom: 0,
                    }}
                  >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" padding={{ left: 10, right: 10 }} />
                  <YAxis
                      tickFormatter={(value) => (value === 0 ? "" : Math.floor(value))}
                      domain={[0, 20]}  // Fixed domain from 0 to 10 (adjust max as needed)
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
                  <Line 
                      type="monotone" 
                      dataKey="queries" 
                      stroke="rgb(101, 134, 145)" 
                      strokeWidth={3} 
                      activeDot={{ r: 8 }} 
                  />
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