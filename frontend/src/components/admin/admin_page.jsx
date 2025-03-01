import React, { useState, useEffect } from "react";
import './admin_page.css';
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

    const fetchtotalStudents = async () => {
      try {
        const response = await axios.get(`${base_url}/api/getUsers`);
        setTotalStudents(response.data.length);
        setUsers(response.data);
      } catch (error) {
        console.error("Failed to fetch total users:", error);
      }
    };
    
    const fetchUniversityInfo = async () => {
      try {
        const response = await axios.get(`${base_url}/api/getUniversityInfo`);
        setUniversityInfo(response.data.info);
      } catch (error) {
        console.error("Failed to fetch university info:", error);
      }
    };

    const fetchInstructors = async () => {
      try {
        const response = await axios.get(`${base_url}/api/getInstructors`);
        setInstructors(response.data);
        setTotalInstructors(response.data.length);
      } catch (error) {
        console.error("Failed to fetch instructors:", error);
      }
    };

    const fetchTotalLearningMaterials = async () => {
      try {
        const response = await axios.get(`${base_url}/api/getLearningMaterials`);
        const learningMaterials = response.data;

        // Count unique subject codes across all learning materials
        const uniqueSubjects = new Set();
        Object.keys(learningMaterials).forEach(subjectName => {
          Object.keys(learningMaterials[subjectName]).forEach(lesson => {
            Object.keys(learningMaterials[subjectName][lesson]).forEach(subtopicCode => {
              const subjectId = learningMaterials[subjectName][lesson][subtopicCode].subjectId;
              uniqueSubjects.add(subjectId);
            });
          });
        });

        setTotalLearningMaterials(uniqueSubjects.size);
      } catch (error) {
        console.error("Failed to fetch total learning materials:", error);
      }
    };

    fetchTotalQueries();
    fetchtotalStudents();
    fetchUniversityInfo();
    fetchInstructors();
    fetchTotalLearningMaterials();
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

  const handleEditUser = (user) => {
    setEditingUser(user);
  };

  const handleSaveUser = async (user) => {
    try {
      if (activeTab === 'settings') {
        await axios.put(`${base_url}/api/updateUser/${user.id}`, user);
        setUsers(users.map(u => u.id === user.id ? user : u));
      } else if (activeTab === 'instructors') {
        await axios.put(`${base_url}/api/updateInstructor/${user.id}`, user);
        setInstructors(instructors.map(i => i.id === user.id ? user : i));
      }
      setEditingUser(null);
    } catch (error) {
      console.error("Failed to update user/instructor:", error);
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

  const handleConfirmDelete = (userId) => {
    setUserIdToDelete(userId);
    setShowConfirmModal(true);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await axios.post(`${base_url}/api/uploadUsers`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        alert("Users uploaded successfully!");
        const usersResponse = await axios.get(`${base_url}/api/getUsers`);
        setUsers(usersResponse.data);
      } catch (error) {
        console.error("Error uploading users:", error);
        alert("Failed to upload users. Please check the file format and try again.");
      } finally {
        event.target.value = null;
      }
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

  const handleUploadInstructors = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        await axios.post(`${base_url}/api/uploadInstructors`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        alert("Instructors uploaded successfully!");
        const response = await axios.get(`${base_url}/api/getInstructors`);
        setInstructors(response.data);
      } catch (error) {
        console.error("Error uploading instructors:", error);
        alert("Failed to upload instructors. Please check the file format and try again.");
      } finally {
        event.target.value = null;
      }
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

  const handleConfirmDeleteInstructor = (instructorEmail) => {
    setInstructorEmailToDelete(instructorEmail);
    setShowConfirmInstructorModal(true);
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
    return instructor.email.toLowerCase().includes(searchLower);
  });

  const pieChartData = [
    { name: 'Students', value: totalStudents },
    { name: 'Instructors', value: totalInstructors },
  ];

  const COLORS = ['#F8E9A1', '#6DE88B'];

  const userColumns = [
    {
      name: 'ID',
      selector: row => row.id,
      sortable: true,
    },
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
      name: 'Actions',
      cell: row => (
        <div>
          <button className="edit-button" onClick={() => handleEditUser(row)}>Edit</button>
          <button className="delete-button" onClick={() => handleConfirmDelete(row.id)}>Delete</button>
        </div>
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
      name: 'Actions',
      cell: row => (
        <div>
          <button className="edit-button" onClick={() => handleEditUser(row)}>Edit</button>
          <button className="delete-button" onClick={() => handleConfirmDeleteInstructor(row.email)}>Delete</button>
        </div>
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
        backgroundColor: "#4e73df", // Blue header background
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

  return (
    <div className="admin-container">
      <div className="admin-sidebar">
        <div className="aissistant-logo-title">
          <img src={logo} alt="aissistant logo" />
          <div className="aissistant-title">
            <h1 className="ai">AI</h1>
            <h1>ssistant</h1>
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
          className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
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
        <button 
          className="admin-logout-button"
          onClick={handleLogout}
        >
          <BiLogOut />
          Logout
        </button>
      </div>
      <div className="admin-content">
        {activeTab === 'dashboard' ? (
          <div className="dashboard-tab">
            <h1><MdOutlineDashboard />Dashboard</h1>
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
              <div style={{ display: 'flex', gap: '3%', alignItems: 'center' }}>
                <ResponsiveContainer className='line-graph' width="75%" height={300} style={{display: 'flex', alignItems: 'center', padding: '20px 0px 20px 0px'}}>
                  <LineChart className='line'
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
            <div className="faq-section">
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
              <pre className="faq-box">{faq}</pre>
            </div>
          </div>
        ) : activeTab === 'settings' ? (
          <div className="manage-users-tab">
            <h1><FaRegUser />Manage Students</h1>
            <div className="search-bar">
              <input 
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
            />
          </div>
        ) : activeTab === 'instructors' ? (
          <div className="manage-instructors-tab">
            <h1><PiStudentBold />Manage Instructors</h1>
            <div className="search-bar">
              <input 
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

      {showAddUserModal && (
        <div className="admin-add-user-modal">
          <div className="modal-content">
            <h2>Add New User</h2>
            <input 
              type="text" 
              placeholder="Name" 
              value={newUserName} 
              onChange={(e) => setNewUserName(e.target.value)} 
            />
            <input 
              type="email" 
              placeholder="Email" 
              value={newUserEmail} 
              onChange={(e) => setNewUserEmail(e.target.value)} 
            />
            <div className="modal-actions">
              <button onClick={handleAddSingleUser} disabled={isAddingUser}>Add</button>
              <button onClick={() => setShowAddUserModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showAddInstructorModal && (
        <div className="admin-add-instructor-modal">
          <div className="modal-content">
            <h2>Add New Instructor</h2>
            <input 
              type="text" 
              placeholder="Name" 
              value={newInstructorName} 
              onChange={(e) => setNewInstructorName(e.target.value)} 
            />
            <input 
              type="email" 
              placeholder="Email" 
              value={newInstructorEmail} 
              onChange={(e) => setNewInstructorEmail(e.target.value)} 
            />
            <div className="modal-actions">
              <button className="save-button" onClick={handleAddSingleInstructor} disabled={isAddingInstructor}>Add</button>
              <button className="cancel-button" onClick={() => setShowAddInstructorModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;