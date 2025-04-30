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
import Swal from 'sweetalert2';
import { FaPaperclip, FaTrash } from "react-icons/fa";
import { RiDownload2Fill } from "react-icons/ri";
import { FaArrowLeft } from "react-icons/fa";
import { IoMdClose } from "react-icons/io";
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
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

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
  const [attachments, setAttachments] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [viewingAttachment, setViewingAttachment] = useState(null);
  const [attachmentType, setAttachmentType] = useState('');

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
  const [uploadingFile, setUploadingFile] = useState(false);

  const [reusing, setReusing] = useState(false);
  const [reusingSubject, setReusingSubject] = useState(null);
  const [reusingLesson, setReusingLesson] = useState(null);
  const [reusingSubtopic, setReusingSubtopic] = useState("");
  const [reusingSubtopicIndex, setReusingSubtopicIndex] = useState(-1);

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
      const headingRegex = /###\s*(.*?)/g; // Matches ### headings
  
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
        { name: 'Week 1', queries: 0 },
        { name: 'Week 2', queries: 0 },
        { name: 'Week 3', queries: 0 },
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

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
  
    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      Swal.fire({
        title: "File too large",
        text: "Maximum file size is 50MB",
        icon: "error",
      });
      return;
    }
  
    setUploadingFile(true);
  
    try {
      const formatString = (str) => str.replace(/\s+/g, '_');
      const formData = new FormData();
      formData.append("file", file);
      formData.append("subjectCode", selectedSubject);
      formData.append("lessonIndex", selectedLesson)
      formData.append("subtopicIndex", selectedSubtopic)
      formData.append(
        "lessonName", 
        formatString(learningMaterials[selectedSubject].lessons[selectedLesson].lessonName)
      );
      formData.append(
        "subtopicName", 
        formatString(learningMaterials[selectedSubject].lessons[selectedLesson].subtopics[selectedSubtopic].subtopicTitle)
      );
  
      const response = await axios.post(`${base_url}/api/uploadAttachment`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
  
      Swal.fire({
        title: "Success",
        text: "File uploaded successfully!",
        icon: "success",
      });
  
      // Refresh learning materials
      const instructorEmail = localStorage.getItem("userEmail");
      const updatedResponse = await axios.get(`${base_url}/api/getInstructorLearningMaterials`, {
        params: { instructorEmail },
      });
      setLearningMaterials(updatedResponse.data);
    } catch (error) {
      console.error("Error uploading file:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to upload file",
        icon: "error",
      });
    } finally {
      setUploadingFile(false);
      event.target.value = ""; // Reset file input
    }
  };
  
  // Add this function to handle file deletion
  const handleDeleteAttachment = async (attachmentIndex, attachmentName) => {
    try {
      const formatString = (str) => str.replace(/\s+/g, '_');
      const lessonName = formatString(learningMaterials[selectedSubject].lessons[selectedLesson].lessonName);
      const subtopicName = formatString(learningMaterials[selectedSubject].lessons[selectedLesson].subtopics[selectedSubtopic].subtopicTitle);
      
      // Make sure all parameters are properly encoded
      await axios.delete(
        `${base_url}/api/deleteAttachment/${
          encodeURIComponent(selectedSubject)
        }/${
          encodeURIComponent(selectedLesson)
        }/${
          encodeURIComponent(lessonName)
        }/${
          encodeURIComponent(selectedSubtopic)
        }/${
          encodeURIComponent(subtopicName)
        }/${
          encodeURIComponent(attachmentIndex)
        }/${
          encodeURIComponent(attachmentName)
        }`
      );
  
      Swal.fire({
        title: "Success",
        text: "Attachment deleted successfully!",
        icon: "success",
      });
  
      // Refresh learning materials
      const instructorEmail = localStorage.getItem("userEmail");
      const updatedResponse = await axios.get(`${base_url}/api/getInstructorLearningMaterials`, {
        params: { instructorEmail },
      });
      setLearningMaterials(updatedResponse.data);
    } catch (error) {
      console.error("Error deleting attachment:", error);
      Swal.fire({
        title: "Error",
        text: error.response?.data?.error || "Failed to delete attachment",
        icon: "error",
      });
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
    e.preventDefault(); // Add this line
    const type = getFileType(attachment.name);
    setAttachmentType(type);
    setViewingAttachment(attachment);
  };
  

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
          <button className="instructor-back-to-subjects-button" onClick={handleBackToSubjects}>
              Back to Subjects
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
          <button className="add-subtopic" onClick={() => setReusing(true)}>
            Reuse material
          </button>
          <button className="instructor-back-to-lessons-button" onClick={handleBackToLessons}>
            Back to Lessons
          </button>
          <div>
            {subtopics.map((subtopic, index) => (
              <div onClick={() => setSelectedSubtopic(index)} key={`subtopic-${index}`} className="instructor-exercise-subtopic">
                {editingSubtopic === index ? (
                  <div className="input-fields">
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
                    {`${subtopic['subtopicTitle']}`}
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
                            subtopicTitle: subtopic.subtopicTitle,
                            content: subtopic.content,
                            questions: subtopic.questions,
                            answers: subtopic.answers,
                            attachments: subtopic.attachments,
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
          </div>
        </div>
      );
    } else {
      const subtopic =
        learningMaterials[selectedSubject].lessons[selectedLesson].subtopics[selectedSubtopic];
    
      return (
        <>
        <div className="instructor-content-buttons">
              {editingExercise ? (
                <div className="instructor-e-buttons">
                  <button title='Save' className="instructor-save-edit-button" onClick={handleSaveExercise}>
                    <IoIosSave />
                  </button>
                  <button title='Cancel' className="instructor-cancel-edit-button" onClick={() => setEditingExercise(null)}>
                    <MdCancel />
                  </button>
                </div>
              ) : (
                <button
                  className="instructor-edit-subtopic-button"
                  onClick={() => {
                    handleEditExercise({
                      docId: selectedSubject,
                      content: subtopic.content,
                      questions: subtopic.questions,
                      answers: subtopic.answers,
                    });
                  }}
                  title='Edit'
                >
                  <FaEdit />
                </button>
              )}
              <button className="instructor-back-to-lessons-button" onClick={handleBackToSubtopics}>Back to Subtopics</button>
            </div>
          <div className="instructor-exercise-content">
            {editingExercise ? (
              <>
                <ReactQuill
                  theme="snow"
                  value={editingExercise.content}
                  onChange={(content) => setEditingExercise({...editingExercise, content})}
                  modules={QUILL_MODULES}
                  formats={QUILL_FORMATS}
                />
                <div className="instructor-attachments-section">
                  <h3>Attachments</h3>
                  <div className="instructor-attachments-list">
                    {subtopic.attachments?.map((attachment, index) => (
                      <div key={index} className="instructor-attachment-item">
                        <div
                          className="instructor-attachment-link"
                          onClick={(e) => handlePreviewAttachment(attachment, e)}
                        >
                          <FaPaperclip /> {attachment.name}
                        </div>
                        <span className="instructor-attachment-size">
                          {(attachment.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        <button
                          className="instructor-delete-attachment"
                          onClick={() => handleDeleteAttachment(index, attachment.name)}
                          title="Delete attachment"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="instructor-upload-attachment">
                    <label className="instructor-upload-button">
                      {uploadingFile ? "Uploading..." : "Add Attachment"}
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                        style={{ display: "none" }}
                      />
                    </label>
                    <span className="instructor-upload-hint">Max 50MB per file</span>
                  </div>
                </div>
                <h3>Exercises</h3>
                <textarea
                  className="instructor-exercise-textarea"
                  value={editingExercise.questions}
                  onChange={(e) =>
                    setEditingExercise({ ...editingExercise, questions: e.target.value })
                  }
                />
                <h3>Answers</h3>
                <textarea
                  className="instructor-exercise-textarea"
                  value={editingExercise.answers}
                  onChange={(e) =>
                    setEditingExercise({ ...editingExercise, answers: e.target.value })
                  }
                />
              </>
            ) : (
              <>
                <div className="instructor-content-display" dangerouslySetInnerHTML={{ __html: subtopic.content }} />
                <div className="instructor-attachments-list" style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px'}}>
                {subtopic.attachments?.map((attachment, index) => {
                  // Determine file type and preview availability
                  const fileType = attachment.name.split('.').pop().toLowerCase();
                  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType);
                  const isPDF = fileType === 'pdf';
                  return (
                    <div
                      key={index}
                      className="instructor-attachment-item"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '15px',
                        border: '1px solid #ddd',
                        borderRadius: '5px',
                        marginBottom: '10px',
                        background: '#f9f9f9',
                        cursor: 'pointer' // Add cursor pointer to indicate clickable area
                      }}
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
                        <span className="instructor-attachment-size" style={{ fontSize: '12px', color: '#666' }}>
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
                <h3>Exercises</h3>
                <div className="instructor-content-display" dangerouslySetInnerHTML={{ __html: subtopic.questions }} />
                <h3>Answers</h3>
                <div className="instructor-content-display" dangerouslySetInnerHTML={{ __html: subtopic.answers }} />
              </>
            )}
          </div>
        </>
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
      <div className="instructor-create-material-modal" onClick={() => setShowCreateSubjectModal(false)}>
        <div className="instructor-modal-content1" onClick={(e) => {e.stopPropagation()}}>
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
      <div className="instructor-create-lesson-modal" onClick={() => {setShowCreateLessonModal(false)}}>
        <div className="instructor-modal-content1" onClick={(e) => {e.stopPropagation()}}>
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

  const reuseSubtopic = async () => {
    try {
      const instructorEmail = localStorage.getItem("userEmail");
      
      // First create the subtopic without attachments
      const createResponse = await axios.put(
        `${base_url}/api/addSubtopic/${selectedSubject}/${selectedLesson}`,
        {
          subtopicTitle: reusingSubtopic.subtopicTitle,
          content: reusingSubtopic.content,
          questions: reusingSubtopic.questions,
          answers: reusingSubtopic.answers,
          attachments: reusingSubtopic.attachments || []
        },
        {
          params: { instructorEmail },
        }
      );
  
      // Refresh learning materials
      const updatedResponse = await axios.get(`${base_url}/api/getInstructorLearningMaterials`, {
        params: { instructorEmail },
      });
      setLearningMaterials(updatedResponse.data);
  
      // Show success notification
      Swal.fire({
        title: "Success",
        text: "Material reused successfully!",
        icon: "success",
      });
  
      // Close the reuse modal and reset states
      setReusing(false);
      setReusingSubject(null);
      setReusingLesson(null);
      setReusingSubtopic("");
  
      // Navigate to the new subtopic
      setSelectedSubtopic(createResponse.data.subtopicIndex);
    } catch (error) {
      console.error("Failed to reuse material:", error);
      Swal.fire({
        title: "Failed",
        text: "Failed to reuse material",
        icon: "error",
      });
    }
  }

  const handleSaveSubtopic = async () => {
    try {
      const instructorEmail = localStorage.getItem("userEmail");
      
      // First create the subtopic without attachments
      const createResponse = await axios.put(
        `${base_url}/api/addSubtopic/${selectedSubject}/${selectedLesson}`,
        {
          subtopicTitle: newSubtopic.subtopicTitle,
          content: newSubtopic.content,
          questions: newSubtopic.questions,
          answers: newSubtopic.answers
        },
        {
          params: { instructorEmail },
        }
      );
  
      const subtopicIndex = createResponse.data.subtopicIndex;
  
      // Now upload each attachment
      const uploadedAttachments = [];
      for (const attachment of attachments) {
        const formData = new FormData();
        const file = await fetch(attachment.url)
          .then(r => r.blob())
          .then(blob => new File([blob], attachment.name, { type: attachment.type }));
  
        formData.append("file", file);
        formData.append("subjectCode", selectedSubject);
        formData.append("lessonIndex", selectedLesson);
        formData.append("subtopicIndex", subtopicIndex);
        formData.append(
          "lessonName", 
          learningMaterials[selectedSubject].lessons[selectedLesson].lessonName.replace(/\s+/g, '_')
        );
        formData.append(
          "subtopicName", 
          newSubtopic.subtopicTitle.replace(/\s+/g, '_')
        );
  
        const uploadResponse = await axios.post(
          `${base_url}/api/uploadAttachment`, 
          formData, 
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
  
        uploadedAttachments.push(uploadResponse.data.attachment);
      }
  
      // Update learning materials in state
      const updatedResponse = await axios.get(`${base_url}/api/getInstructorLearningMaterials`, {
        params: { instructorEmail },
      });
      setLearningMaterials(updatedResponse.data);
  
      Swal.fire({
        title: "Success",
        text: "Subtopic created successfully!",
        icon: "success",
      });
      
      setShowCreateSubtopicModal(false);
      setNewSubtopic({
        subtopicTitle: "",
        content: "",
        questions: "",
        answers: "",
      });
      setAttachments([]);
      
      // Navigate to the new subtopic
      setSelectedSubtopic(subtopicIndex);
    } catch (error) {
      console.error("Failed to create subtopic:", error);
      Swal.fire({
        title: "Failed",
        text: "Failed to create subtopic",
        icon: "error",
      });
    }
  };

  const renderCreateSubtopicModal = () => {
    const handleNewFileUpload = async (event) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
  
      const newUploadingFiles = [...uploadingFiles];
      const newAttachments = [...attachments];
  
      for (const file of files) {
        // Check file size (50MB limit)
        if (file.size > 50 * 1024 * 1024) {
          Swal.fire({
            title: "File too large",
            text: "Maximum file size is 50MB",
            icon: "error",
          });
          continue;
        }
  
        const fileId = Date.now().toString();
        const updatedUploadingFiles = [...newUploadingFiles, { id: fileId, name: file.name }];
  
        try {
          const formData = new FormData();
          formData.append("file", file);
  
          const response = await axios.post(`${base_url}/api/uploadTempAttachment`, formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
  
          newAttachments.push({
            id: fileId,
            name: file.name,
            url: response.data.url,
            path: response.data.path,
            size: file.size,
            type: file.type,
          });
        } catch (error) {
          console.error("Error uploading file:", error);
          Swal.fire({
            title: "Error",
            text: `Failed to upload ${file.name}`,
            icon: "error",
          });
        } finally {
          // Filter out the uploaded file from uploadingFiles
          const filteredUploadingFiles = newUploadingFiles.filter(f => f.id !== fileId);
          setUploadingFiles(filteredUploadingFiles);
        }
      }
  
      setUploadingFiles(newUploadingFiles);
      setAttachments(newAttachments);
      event.target.value = ""; // Reset file input
    };
  
    const handleRemoveNewAttachment = (index) => {
      const attachmentToRemove = attachments[index];
      setAttachments(attachments.filter((_, i) => i !== index));
      
      // Delete from temporary storage if needed
      axios.delete(`${base_url}/api/deleteTempAttachment`, {
        data: { path: attachmentToRemove.path }
      }).catch(error => {
        console.error("Error deleting temporary attachment:", error);
      });
    };
  
    return (
      <div className="instructor-create-subtopic-modal" onClick={() => setShowCreateSubtopicModal(false)}>
        <div className="instructor-modal-content" onClick={(e) => {e.stopPropagation()}}>
          <h2>Create New Subtopic</h2>
          <div className="instructor-create-subtopic-form">
            <label>Subtopic Title:</label>
            <input
              type="text"
              value={newSubtopic.subtopicTitle}
              onChange={(e) =>
                setNewSubtopic({ ...newSubtopic, subtopicTitle: e.target.value })
              }
            />
            <label>Content:</label>
            <ReactQuill
              theme="snow"
              value={newSubtopic.content}
              onChange={(content) => setNewSubtopic({...newSubtopic, content})}
              modules={QUILL_MODULES}
              formats={QUILL_FORMATS}
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
            <div className="instructor-attachments-section">
              <h3>Attachments</h3>
              <div className="instructor-attachments-list">
                {attachments.map((attachment, index) => (
                  <div key={attachment.id} className="instructor-attachment-item">
                    <div
                      className="instructor-attachment-link"
                      onClick={(e) => handlePreviewAttachment(attachment, e)}
                    >
                      <FaPaperclip /> {attachment.name}
                    </div>
                    <span className="instructor-attachment-size">
                      {(attachment.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <button
                      className="instructor-delete-attachment"
                      onClick={() => handleRemoveNewAttachment(index)}
                      title="Remove attachment"
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
                {uploadingFiles.map(file => (
                  <div key={file.id} className="instructor-attachment-item">
                    <span><FaPaperclip /> {file.name} (Uploading...)</span>
                  </div>
                ))}
              </div>
              <div className="instructor-upload-attachment">
                <label className="instructor-upload-button">
                  Add Attachments
                  <input
                    type="file"
                    multiple
                    onChange={handleNewFileUpload}
                    style={{ display: "none" }}
                  />
                </label>
                <span className="instructor-upload-hint">Max 50MB per file</span>
              </div>
            </div>
          </div>
          <div className="instructor-modal-actions">
            <button onClick={handleSaveSubtopic}>Save</button>
            <button onClick={() => {
              // Clean up any temporary files
              attachments.forEach(attachment => {
                if (attachment.path && attachment.path.startsWith('temp/')) {
                  axios.delete(`${base_url}/api/deleteTempAttachment`, {
                    data: { path: attachment.path }
                  }).catch(console.error);
                }
              });
              setAttachments([]);
              setShowCreateSubtopicModal(false);
            }}>Cancel</button>
          </div>
        </div>
      </div>
    );
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
          onClick={() => {
            setActiveTab('learning-materials');
            handleBackToSubjects();
          }}
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
        <div className="instructor-header">
        {activeTab === 'learning-materials' ?
        <h1 style={{display: 'flex', alignItems: 'center'}}><LuBookMarked />
          {!selectedSubject && "Subjects"}
          {selectedSubject && selectedLesson === null && "Lessons"}
          {selectedSubject && selectedLesson !== null && selectedSubtopic === null && "Subtopics"}
          {selectedSubject && selectedLesson !== null && selectedSubtopic !== null && learningMaterials[selectedSubject]?.lessons[selectedLesson]?.subtopics[selectedSubtopic]?.subtopicTitle}
        </h1>
        :
        <h1 style={{display: 'flex', alignItems: 'center'}}><MdOutlineDashboard />Dashboard</h1>
        }
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
            {/*<input
              style={{width: 'fit-content'}}
              type="file" 
              accept=".json" 
              onChange={handleUploadLearningMaterials} 
              ref={fileInputRef}
            />
            <p>Upload an Excel file to add learning materials.</p>*/}
            <div className="instructor-exercises-container">
              {renderExercises()}
            </div>
          </div>
        )}
      </div>

      {showSubjectConfirmModal && (
        <div className="instructor-confirmation-modal">
          <div className="instructor-modal-content1">
            <h3 style={{paddingBottom: '20px'}}>Are you sure you want to delete this {itemToDelete.type}?</h3>
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

      {/* File Viewer Modal */}
      {viewingAttachment && (
        <div className="instructor-file-viewer-modal" onClick={() => setViewingAttachment(null)}>
          <div className="instructor-file-viewer-controls">
            <button 
              className="instructor-close-viewer" 
              onClick={() => setViewingAttachment(null)}
            >
              &times;
            </button>
            <button
              className="instructor-download-file-button"
              onClick={async () => {
                try {
                  const response = await fetch(viewingAttachment.url);
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = viewingAttachment.name; // Optional: Set filename
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                } catch (error) {
                  console.error("Download failed:", error);
                  alert("Download failed. Please try again.");
                }
              }}
            >
              <RiDownload2Fill />
            </button>
            <h3 style={{color: 'white'}}>{viewingAttachment.name}</h3>
          </div>
          <div className="instructor-file-viewer-content">
            
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
              <div className="instructor-no-preview">
                No preview available for this file type. 
                <a href="#"
                  onClick={async () => {
                    try {
                      const response = await fetch(viewingAttachment.url);
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = viewingAttachment.name; // Optional: Set filename
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                    } catch (error) {
                      console.error("Download failed:", error);
                      alert("Download failed. Please try again.");
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

      {reusing && (
        <div className="reuse-subtopic-modal" onClick={() => {setReusing(false)}}>
          <div className="reuse-form" onClick={(e) => {e.stopPropagation();}}>
            <div className="reuse-header">
              {!reusingSubject && (
                <h3>Subjects</h3>
              )}
              {reusingSubject && !reusingLesson && (<div style={{display: 'flex', alignItems: 'center'}}>
                <button onClick={() => {setReusingSubject(null)}}><FaArrowLeft /></button>
                <h3>Lessons (Select Lesson)</h3>
              </div>)}
              {reusingSubject && reusingLesson && (<div style={{display: 'flex', alignItems: 'center'}}>
                <button onClick={() => {setReusingLesson(null); setReusingSubtopic("")}}><FaArrowLeft /></button>
                <h3>Select material</h3>
              </div>)}
              <button style={{fontSize: 'xx-large'}} onClick={() => {setReusingSubject(null); setReusingLesson(null); setReusingSubtopic(null); setReusing(false);}}><IoMdClose /></button>
            </div>
            <div className="reuse-body">
              {!reusingSubject && <>{Object.keys(learningMaterials).map((subject) => (
                <div className="reuse-subject-items" onClick={() => {setReusingSubject(learningMaterials[subject].subjectCode)}}>
                  {learningMaterials[subject].subjectName}
                </div>
              ))}</>}
              {reusingSubject && !reusingLesson && <>{Object.keys(learningMaterials[reusingSubject].lessons).map((lesson) => (
                <div className="reuse-subject-items" onClick={() => {setReusingLesson(lesson)}}>
                  {learningMaterials[reusingSubject].lessons[lesson].lessonName}
                </div>
              ))}</>}
              {reusingSubject && reusingLesson && <>{Object.keys(learningMaterials[reusingSubject].lessons[reusingLesson].subtopics).map((subtopic, subtopicIndex) => (
                <div className={`reuse-subject-items ${reusingSubtopic.subtopicTitle === learningMaterials[reusingSubject].lessons[reusingLesson].subtopics[subtopic].subtopicTitle && reusingSubtopicIndex === subtopicIndex ? 'selected' : ''}`} onClick={() => {setReusingSubtopic(learningMaterials[reusingSubject].lessons[reusingLesson].subtopics[subtopic]); setReusingSubtopicIndex(subtopicIndex)}}>
                  {learningMaterials[reusingSubject].lessons[reusingLesson].subtopics[subtopic].subtopicTitle}
                </div>
              ))}</>}
            </div>
            <div className="reuse-buttons" style={{display: 'flex', direction: 'rtl', alignItems: 'center'}}>
              {reusingSubject && reusingLesson && reusingSubtopic === "" && <button disabled>Reuse</button>}
              {reusingSubject && reusingLesson && reusingSubtopic !== "" && <button onClick={() => reuseSubtopic()}>Reuse</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorPage;