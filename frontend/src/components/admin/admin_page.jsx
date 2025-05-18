import React, { useState, useEffect } from "react";
import './admin_page.css';
import './admin_page_android.css';
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { MdOutlineDashboard } from "react-icons/md";
import { PiStudentBold } from "react-icons/pi";
import { FaRegUser } from "react-icons/fa";
import { MdOutlineQuestionAnswer } from "react-icons/md";
import { LuBookMarked } from "react-icons/lu";
import logo from '../assets/AIssistant.png';
import { BiLogOut } from "react-icons/bi";
import DataTable from 'react-data-table-component';
import Swal from 'sweetalert2';
import { IoLogOutOutline } from "react-icons/io5";
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

const AdminPage = () => {
  const base_url = `https://aissistant-backend.vercel.app`;
  //const base_url = `http://localhost:5000`;
  const [activeTab, setActiveTab] = useState('dashboard');
  const [totalQueries, setTotalQueries] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalInstructors, setTotalInstructors] = useState(0);
  const [totalLearningMaterials, setTotalLearningMaterials] = useState(0);
  const [queryData, setQueryData] = useState([]);
  const [graphFilter, setGraphFilter] = useState('weekly');
  const [faq, setFaq] = useState("");
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [userIdToDelete, setUserIdToDelete] = useState(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [universityInfo, setUniversityInfo] = useState("");
  const [editingUniversityInfo, setEditingUniversityInfo] = useState(false);
  const [instructors, setInstructors] = useState([]);
  const [showAddInstructorModal, setShowAddInstructorModal] = useState(false);
  const [newInstructorEmail, setNewInstructorEmail] = useState("");
  const [newInstructorName, setNewInstructorName] = useState("");
  const [instructorSearchTerm, setInstructorSearchTerm] = useState("");
  const [showConfirmInstructorModal, setShowConfirmInstructorModal] = useState(false);
  const [instructorEmailToDelete, setInstructorEmailToDelete] = useState(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isAddingInstructor, setIsAddingInstructor] = useState(false);
  const [isGeneratingFAQ, setIsGeneratingFAQ] = useState(false);
  const [userRole, setUserRole] = useState(localStorage.getItem("userRole") || "");
  const navigate = useNavigate();
  const isAuthenticated = localStorage.getItem("isAuthenticated");
  const userId = localStorage.getItem("userId");
  const userName = localStorage.getItem("userName");
  const userEmail = localStorage.getItem("userEmail");
  const userPicture = localStorage.getItem("profileImage");
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [weeklyPrompts, setWeeklyPrompts] = useState({});
  const [selectedWeek, setSelectedWeek] = useState("");
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  
  useEffect(() => {
    const fetchUserRole = async () => {
      if (userEmail) {
        try {
          const response = await axios.get(`${base_url}/api/getUserRole`, {
            params: { email: userEmail }
          });
          const role = response.data.role;
  
          // Update both state and localStorage
          setUserRole(role);
          localStorage.setItem("userRole", role);
  
          // Navigate based on the fetched role
          if (role === "student") {
            navigate("/student");
          } else if (role === "admin") {
            setIsLoading(false);
            return;
          } else if (role === "instructor") {
            navigate("/instructor");
          } else {
            navigate("/");
          }
        } catch (error) {
          console.error("Failed to fetch user role:", error);
          navigate("/");
        }
      } else {
        navigate("/");
      }
    };
  
    fetchUserRole();
  }, [userId, userEmail, navigate]);

  useEffect(() => {
    const fetchTotalQueries = async () => {
      try {
        const response = await axios.get(`${base_url}/api/getChats`);
        const allMessages = response.data.flatMap(chat => 
          chat.messages.filter(message => message.sender === "user")
        );
        setTotalQueries(allMessages.length);
        setQueryData(allMessages.map(message => ({
          timestamp: new Date(message.timestamp),
          text: message.text,
        })));
  
        // Group prompts by week
        const groupedPrompts = groupPromptsByWeek(allMessages);
        setWeeklyPrompts(groupedPrompts);
      } catch (error) {
        console.error("Failed to fetch total queries:", error);
      }
    };
  
    const fetchtotalStudents = async () => {
      try {
        const response = await axios.get(`${base_url}/api/getStudents`);
        setTotalStudents(response.data.length);
        setUsers(response.data);
      } catch (error) {
        console.error("Failed to fetch total students:", error);
      }
    };
  
    const fetchInstructors = async () => {
      try {
        const response = await axios.get(`${base_url}/api/getInstructors`);
        setTotalInstructors(response.data.length);
        setInstructors(response.data);
      } catch (error) {
        console.error("Failed to fetch instructors:", error);
      }
    };
  
    const fetchTotalLearningMaterials = async () => {
      try {
        const response = await axios.get(`${base_url}/api/getTotalLearningMaterials`);
        setTotalLearningMaterials(response.data.totalLearningMaterials);
      } catch (error) {
        console.error("Failed to fetch total learning materials:", error);
      }
    };
  
    const fetchData = async () => {
      await fetchTotalQueries();
      await fetchtotalStudents();
      await fetchInstructors();
      await fetchTotalLearningMaterials();
    };
  
    fetchData();
  }, []);

  const groupPromptsByWeek = (allMessages) => {
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

  const handleGenerateFAQ = async () => {
    if (isGeneratingFAQ || !selectedWeek) return; // Prevent multiple simultaneous requests
    setIsGeneratingFAQ(true);
    setFaq(""); // Clear the FAQ content before starting
  
    try {
      // Filter prompts based on the selected week
      const prompts = weeklyPrompts[selectedWeek] || [];
  
      // Use fetch for streaming
      const response = await fetch(`${base_url}/api/generateFAQ`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompts }),
      });
  
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
        setFaq((prevFaq) => prevFaq + chunk);
      }
    } catch (error) {
      console.error("Failed to generate FAQ:", error);
      setFaq("Failed to generate FAQ. Please try again.");
    } finally {
      setIsGeneratingFAQ(false); // Reset the generating state
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

function getDefaultGraphData() {
  // Return an array with default values (e.g., 7 days with 0 queries)
  return [
    { name: 'Week 1', queries: 0 },
    { name: 'Week 2', queries: 0 },
    { name: 'Week 3', queries: 0 },
  ];
}

const handleEditUser = async (user, newRole) => {
  if (isUpdatingRole) return; // Prevent multiple simultaneous updates
  setIsUpdatingRole(true);

  try {
    await axios.put(`${base_url}/api/updateUserRole/${user.id}`, { role: newRole });

    if (activeTab === 'students') {
      if (newRole === 'instructor') {
        setUsers(prevUsers => prevUsers.filter(u => u.id !== user.id));
        setInstructors(prevInstructors => [...prevInstructors, { ...user, role: newRole }]);
      } else {
        setUsers(prevUsers => 
          prevUsers.map(u => u.id === user.id ? { ...u, role: newRole } : u)
        );
      }
    } else if (activeTab === 'instructors') {
      if (newRole === 'student') {
        setInstructors(prevInstructors => prevInstructors.filter(i => i.id !== user.id));
        setUsers(prevUsers => [...prevUsers, { ...user, role: newRole }]);
      } else {
        setInstructors(prevInstructors => 
          prevInstructors.map(i => i.id === user.id ? { ...i, role: newRole } : i)
        );
      }
    }
  } catch (error) {
    console.error("Failed to update user role:", error);
  } finally {
    setIsUpdatingRole(false); // Reset the updating state
  }
};

  const handleDeleteUser = async (userId) => {
    try {
      await axios.delete(`${base_url}/api/deleteUser/${userId}`);
      setUsers(users.filter(user => user.id !== userId));
      setShowConfirmModal(false);
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  };

  const handleAddSingleUser = async () => {
    if (isAddingUser) return;
    setIsAddingUser(true);

    try {
      const response = await axios.post(`${base_url}/api/addSingleUser`, {
        name: newUserName,
        email: newUserEmail,
      });
      setUsers([...users, { id: response.data.studentId, name: newUserName, email: newUserEmail }]);
      setShowAddUserModal(false);
      setNewUserName("");
      setNewUserEmail("");
      alert("User added successfully!");
    } catch (error) {
      console.error("Failed to add user:", error);
      alert("Failed to add user.");
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleUpdateUniversityInfo = async () => {
    try {
      await axios.put(`${base_url}/api/updateUniversityInfo`, { info: universityInfo });
      setEditingUniversityInfo(false);
      alert("University info updated successfully!");
    } catch (error) {
      console.error("Failed to update university info:", error);
    }
  };

  const handleAddSingleInstructor = async () => {
    if (isAddingInstructor) return;
    setIsAddingInstructor(true);

    try {
      await axios.post(`${base_url}/api/addSingleInstructor`, {
        email: newInstructorEmail,
        name: newInstructorName,
      });
      setInstructors([...instructors, { email: newInstructorEmail, name: newInstructorName }]);
      setShowAddInstructorModal(false);
      setNewInstructorEmail("");
      setNewInstructorName("");
      alert("Instructor added successfully!");
    } catch (error) {
      console.error("Failed to add instructor:", error);
      alert("Failed to add instructor.");
    } finally {
      setIsAddingInstructor(false);
    }
  };

  const handleDeleteInstructor = async (instructorEmail) => {
    try {
      await axios.delete(`${base_url}/api/deleteInstructor/${encodeURIComponent(instructorEmail)}`);
      setInstructors(instructors.filter(instructor => instructor.email !== instructorEmail));
      setShowConfirmInstructorModal(false);
      alert("Instructor deleted successfully!");
    } catch (error) {
      console.error("Failed to delete instructor:", error);
      alert("Failed to delete instructor.");
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.id.toLowerCase().includes(searchLower) ||
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });
  
  const filteredInstructors = instructors.filter(instructor => {
    const searchLower = instructorSearchTerm.toLowerCase();
    return (
      instructor.id.toLowerCase().includes(searchLower) ||
      instructor.name.toLowerCase().includes(searchLower) ||
      instructor.email.toLowerCase().includes(searchLower)
    );
  });

  const pieChartData = [
    { name: 'Students', value: totalStudents },
    { name: 'Instructors', value: totalInstructors },
  ];

  const COLORS = ['rgb(252, 215, 144)', 'rgb(216, 198, 250)'];

  const userColumns = [
    {
      name: 'Name',
      selector: row => row.name,
      sortable: true,
    },
    {
      name: 'Email',
      selector: row => row.email,
      sortable: true,
    },
    {
      name: 'Role',
      cell: row => (
        <select
          id={row.email}
          value={row.role || 'student'}
          onChange={(e) => handleEditUser(row, e.target.value)}
          disabled={isUpdatingRole}
        >
          <option value="student">Student</option>
          <option value="instructor">Instructor</option>
        </select>
      ),
    },
  ];
  
  const instructorColumns = [
    {
      name: 'Name',
      selector: row => row.name,
      sortable: true,
    },
    {
      name: 'Email',
      selector: row => row.email,
      sortable: true,
    },
    {
      name: 'Role',
      cell: row => (
        <select
          id={row.email}
          value={row.role || 'instructor'}
          onChange={(e) => handleEditUser(row, e.target.value)}
          disabled={isUpdatingRole}
        >
          <option value="student">Student</option>
          <option value="instructor">Instructor</option>
        </select>
      ),
    },
  ];

  const customStyles = {
    rows: {
      style: {
        minHeight: "50px", // Row height
        backgroundColor: "#f8f9fa", // Light gray background
        borderBottom: "1px solid #ddd", // Add border between rows
      },
    },
    headCells: {
      style: {
        backgroundColor: "rgb(73, 45, 122)", // Blue header background
        color: "#fff", // White text
        fontWeight: "bold",
        border: "1px solid #ddd", // Add border around header cells
      },
    },
    cells: {
      style: {
        padding: "10px",
        fontSize: "14px",
        border: "1px solid #ddd", // Add border around all cells
      },
    },
  };

  if (isLoading) {
    return <div className="admin-loading-container">Loading...</div>;
  }
  
  return (
    <div className="admin-container">
      <div className={`admin-sidebar ${isSidebarVisible ? 'visible' : 'hidden'}`}>
        <div className="aissistant-logo-title">
          <img src={logo} alt="aissistant logo" style={{filter: 'drop-shadow(0 0 5px white)'}} />
          <div className="aissistant-title">
            <h1 className="ai" style={{color: 'rgb(216, 198, 250)'}}>AI</h1>
            <h1 style={{color: 'white'}}>ssistant</h1>
          </div>
        </div>
        <button 
          className={`admin-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <MdOutlineDashboard />
          Dashboard
        </button>
        <button 
          className={`admin-tab ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          <FaRegUser />
          Students
        </button>
        <button 
          className={`admin-tab ${activeTab === 'instructors' ? 'active' : ''}`}
          onClick={() => setActiveTab('instructors')}
        >
          <PiStudentBold />
          Instructors
        </button>
        <div className="student-logout-section" style={{marginTop: 'auto'}}>
          <div className="profile-dropdown" style={{width: '100%'}}>
            <button 
              className="profile-dropdown-toggle" 
              onClick={(e) => {
                e.stopPropagation();
                setShowLogoutDropdown(!showLogoutDropdown);
              }}
              title="Actions"
              style={{display: 'flex', flexDirection: 'row', justifyContent: 'left', alignItems: 'center', width: '100%', gap: '20px', padding: '10px'}}
            >
              <img src={userPicture} className='userPicture' alt="" />
              <div className="userName" style={{ paddingLeft: '10px', color: 'rgb(216, 198, 250)'}}>{userName}</div>
            </button>
            <div 
              className={`profile-dropdown-menu ${showLogoutDropdown ? 'show' : ''}`} 
            >
              <button
                className="dropdown-item"
                style={{display: 'flex', justifyContent: 'center'}}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLogoutDropdown(false);
                  handleLogout();
                }}
                title="Logout"
              >
                <IoLogOutOutline style={{height:'20px', width: '20px'}} /> Logout
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="admin-content">
        {activeTab === 'dashboard' ? (
          <div className="dashboard-tab">
            <div className="header">
            <button
              className="admin-sidebar-toggle"
              onClick={() => setIsSidebarVisible(!isSidebarVisible)}
              style={{fontSize: 'large'}}
            >
              ☰
            </button>
            <h1><MdOutlineDashboard />Dashboard</h1>
            </div>
            <div className="statistics">
              <div className="statistics-box queries">
                <h3><MdOutlineQuestionAnswer className='statistics-box-icon' />Total Queries</h3>
                <p>{totalQueries}</p>
              </div>
              <div className="statistics-box users">
                <h3><FaRegUser className='statistics-box-icon' />Students</h3>
                <p>{totalStudents}</p>
              </div>
              <div className="statistics-box instructors">
                <h3><PiStudentBold className='statistics-box-icon' />Instructors</h3>
                <p>{totalInstructors}</p>
              </div>
              <div className="statistics-box learning-materials">
                <h3><LuBookMarked className='statistics-box-icon' />Learning Materials</h3>
                <p>{totalLearningMaterials}</p>
              </div>
            </div>
            <div className="graph-container">
              <div className="graphs">
                <ResponsiveContainer className='line-graph'>
                  <LineChart 
                    className='line'
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
                      domain={[0, 10]}  // Fixed domain (0 to 10) to ensure Y-axis labels appear
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
                      stroke="rgb(73, 45, 122)" 
                      strokeWidth={3} 
                      activeDot={{ r: 8 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
                <ResponsiveContainer className='pie-graph' width="25%" height={300} style={{ display: 'flex', alignItems: 'center', paddingBottom: '20px'}}>
                  <PieChart>
                    <Pie
                      dataKey="value"
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      label
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="graph-filters">
                <button 
                  className={graphFilter === 'weekly' ? 'active' : ''} 
                  onClick={() => setGraphFilter('weekly')}
                  style={{background: 'white'}}
                >
                  Weekly
                </button>
                <button 
                  className={graphFilter === 'monthly' ? 'active' : ''} 
                  onClick={() => setGraphFilter('monthly')}
                  style={{background: 'white'}}
                >
                  Monthly
                </button>
              </div>
            </div>
            <div className="faq-section">
              <div className="faq-controls">
                <h2>Frequently Asked Questions</h2>
                <div style={{display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}}>
                  <select
                    id="selectedWeek"
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
                    disabled={isGeneratingFAQ || !selectedWeek}
                    style={{background: 'white'}}
                  >
                    {isGeneratingFAQ ? "Generating..." : "Generate FAQ"}
                  </button>
                </div>
              </div>
              <pre className="faq-box">{formatFAQText(faq)}</pre>
            </div>
          </div>
        ) : activeTab === 'students' ? (
          <div className="manage-users-tab">
            <div className="header">
            <button
              className="admin-sidebar-toggle"
              onClick={() => setIsSidebarVisible(!isSidebarVisible)}
            >
              ☰
            </button>
            <h1><FaRegUser />Manage Students</h1>
            </div>
            <div className="search-bar">
              <input
                id="student-search-bar"
                type="text" 
                placeholder="Search users by ID, name, or email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DataTable
              columns={userColumns}
              data={filteredUsers}
              pagination
              highlightOnHover
              responsive
              customStyles={customStyles}
              id="student-table"
            />
          </div>
        ) : activeTab === 'instructors' ? (
          <div className="manage-instructors-tab">
            <div className="header">
              <button
                className="admin-sidebar-toggle"
                onClick={() => setIsSidebarVisible(!isSidebarVisible)}
              >
                ☰
              </button>
              <h1><PiStudentBold />Manage Instructors</h1>
            </div>
            <div className="search-bar">
              <input 
                id="instructor-search-bar"
                type="text" 
                placeholder="Search instructors by email..." 
                value={instructorSearchTerm}
                onChange={(e) => setInstructorSearchTerm(e.target.value)} 
              />
            </div>
            <DataTable
              className="data-tables"
              columns={instructorColumns}
              data={filteredInstructors}
              pagination
              highlightOnHover
              responsive
              customStyles={customStyles}
              id="instructor-table"
            />
          </div>
        ) : (
          <div className="university-info-tab">
            <h1>University Information</h1>
            {editingUniversityInfo ? (
              <div>
                <textarea
                  className="content-textarea"
                  value={universityInfo}
                  onChange={(e) => setUniversityInfo(e.target.value)}
                />
                <button className="save-button" onClick={handleUpdateUniversityInfo}>Save</button>
                <button className="cancel-button" onClick={() => setEditingUniversityInfo(false)}>Cancel</button>
              </div>
            ) : (
              <div>
                <p>{universityInfo}</p>
                <button className="edit-button" onClick={() => setEditingUniversityInfo(true)}>Edit</button>
              </div>
            )}
          </div>
        )}
      </div>
      {showConfirmModal && (
        <div className="admin-confirmation-modal">
          <div className="modal-content">
            <p>Are you sure you want to delete this user?</p>
            <div className="modal-actions">
              <button onClick={() => handleDeleteUser(userIdToDelete)}>Yes</button>
              <button onClick={() => setShowConfirmModal(false)}>No</button>
            </div>
          </div>
        </div>
      )}

      {showConfirmInstructorModal && (
        <div className="admin-confirmation-modal">
          <div className="modal-content">
            <p>Are you sure you want to delete this instructor?</p>
            <div className="modal-actions">
              <button onClick={() => handleDeleteInstructor(instructorEmailToDelete)}>Yes</button>
              <button onClick={() => setShowConfirmInstructorModal(false)}>No</button>
            </div>
          </div>
        </div>
      )}

      {isSidebarVisible && <div className={`overlay ${isSidebarVisible? "visible" : "hidden"}`} onClick={() => setIsSidebarVisible(!isSidebarVisible)} />}
    </div>
  );
};

export default AdminPage;