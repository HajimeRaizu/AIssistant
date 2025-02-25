import React, { useState, useEffect } from "react";
import './admin_page.css';
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { MdLightMode, MdDarkMode } from "react-icons/md";
import { Line } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [totalQueries, setTotalQueries] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalInstructors, setTotalInstructors] = useState(0);
  const [queryData, setQueryData] = useState([]);
  const [graphFilter, setGraphFilter] = useState('weekly');
  const [theme, setTheme] = useState("light");
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
  const [isAddingUser, setIsAddingUser] = useState(false); // To prevent multiple user additions
  const [isAddingInstructor, setIsAddingInstructor] = useState(false); // To prevent multiple instructor additions
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTotalQueries = async () => {
      try {
        const response = await axios.get("https://aissistant-backend.vercel.app/api/getChats");
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
        const response = await axios.get("https://aissistant-backend.vercel.app/api/getUsers");
        setTotalStudents(response.data.length);
        setUsers(response.data);
      } catch (error) {
        console.error("Failed to fetch total users:", error);
      }
    };
    

    const fetchUniversityInfo = async () => {
      try {
        const response = await axios.get("https://aissistant-backend.vercel.app/api/getUniversityInfo");
        setUniversityInfo(response.data.info);
      } catch (error) {
        console.error("Failed to fetch university info:", error);
      }
    };

    const fetchInstructors = async () => {
      try {
        const response = await axios.get("https://aissistant-backend.vercel.app/api/getInstructors");
        setInstructors(response.data);
        setTotalInstructors(response.data.length); // Set the total number of instructors
      } catch (error) {
        console.error("Failed to fetch instructors:", error);
      }
    };

    fetchTotalQueries();
    fetchtotalStudents();
    fetchUniversityInfo();
    fetchInstructors();
  }, []);

  const handleGenerateFAQ = async () => {
    try {
      const prompts = queryData.map(query => query.text);
      const response = await fetch("https://aissistant-backend.vercel.app/api/generateFAQ", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompts: queryData.map(query => query.text) }),
      });
      setFaq(response.data.generated_text);
    } catch (error) {
      console.error("Failed to generate FAQ:", error);
    }
  };

  const handleLogout = () => {
    navigate('/');
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

  const handleEditUser = (user) => {
    setEditingUser(user);
  };

  const handleSaveUser = async (user) => {
    try {
      if (activeTab === 'settings') {
        // Update user
        await axios.put(`https://aissistant-backend.vercel.app/api/updateUser/${user.id}`, user);
        setUsers(users.map(u => u.id === user.id ? user : u));
      } else if (activeTab === 'instructors') {
        // Update instructor
        await axios.put(`https://aissistant-backend.vercel.app/api/updateInstructor/${user.id}`, user); // Use user.id (Firestore document ID)
        setInstructors(instructors.map(i => i.id === user.id ? user : i));
      }
      setEditingUser(null);
    } catch (error) {
      console.error("Failed to update user/instructor:", error);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await axios.delete(`https://aissistant-backend.vercel.app/api/deleteUser/${userId}`);
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
        const response = await axios.post("https://aissistant-backend.vercel.app/api/uploadUsers", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        alert("Users uploaded successfully!");
        const usersResponse = await axios.get("https://aissistant-backend.vercel.app/api/getUsers");
        setUsers(usersResponse.data);
      } catch (error) {
        console.error("Error uploading users:", error);
        alert("Failed to upload users. Please check the file format and try again.");
      }
    }
  };

  const handleAddSingleUser = async () => {
    if (isAddingUser) return; // Prevent multiple submissions
    setIsAddingUser(true); // Disable the "Add" button

    try {
      const response = await axios.post("https://aissistant-backend.vercel.app/api/addSingleUser", {
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
      setIsAddingUser(false); // Re-enable the "Add" button
    }
  };

  const handleUpdateUniversityInfo = async () => {
    try {
      await axios.put("https://aissistant-backend.vercel.app/api/updateUniversityInfo", { info: universityInfo });
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
        await axios.post("https://aissistant-backend.vercel.app/api/uploadInstructors", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        alert("Instructors uploaded successfully!");
        const response = await axios.get("https://aissistant-backend.vercel.app/api/getInstructors");
        setInstructors(response.data);
      } catch (error) {
        console.error("Error uploading instructors:", error);
        alert("Failed to upload instructors. Please check the file format and try again.");
      }
    }
  };

  const handleAddSingleInstructor = async () => {
    if (isAddingInstructor) return; // Prevent multiple submissions
    setIsAddingInstructor(true); // Disable the "Add" button

    try {
      await axios.post("https://aissistant-backend.vercel.app/api/addSingleInstructor", {
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
      setIsAddingInstructor(false); // Re-enable the "Add" button
    }
  };

  const handleDeleteInstructor = async (instructorEmail) => {
    try {
      await axios.delete(`https://aissistant-backend.vercel.app/api/deleteInstructor/${encodeURIComponent(instructorEmail)}`);
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

  return (
    <div className={`admin-container ${theme}`}>
      <div className={`admin-sidebar ${theme}`}>
        <button 
          className={`tab ${activeTab === 'dashboard' ? 'active' : ''} ${theme}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={`tab ${activeTab === 'settings' ? 'active' : ''} ${theme}`}
          onClick={() => setActiveTab('settings')}
        >
          Manage Students
        </button>
        <button 
          className={`tab ${activeTab === 'instructors' ? 'active' : ''} ${theme}`}
          onClick={() => setActiveTab('instructors')}
        >
          Manage Instructors
        </button>
        <button 
          className={`admin-logout-button ${theme}`}
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
      <div className={`content ${theme}`}>
        {activeTab === 'dashboard' ? (
          <div className={`dashboard-tab ${theme}`}>
            <h1>Dashboard</h1>
            <div className="statistics">
              <div className={`statistics-box queries ${theme}`}>
                <h3>Total Queries</h3>
                <p>{totalQueries}</p>
              </div>
              <div className={`statistics-box users ${theme}`}>
                <h3>Students</h3>
                <p>{totalStudents}</p>
              </div>
              <div className={`statistics-box instructors ${theme}`}>
                <h3>Instructors</h3>
                <p>{totalInstructors}</p>
              </div>
            </div>
            <div className={`line-graph-container ${theme}`}>
              <div className="graph-filters">
                <button className={`${theme}`} onClick={() => setGraphFilter('weekly')}>Weekly</button>
                <button className={`${theme}`} onClick={() => setGraphFilter('monthly')}>Monthly</button>
              </div>
              <Line data={getGraphData()} options={getGraphOptions()} />
            </div>
            <div className="faq-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Frequently Asked Questions</h2>
                <button 
                  className={`generate-faq-button ${theme}`}
                  onClick={handleGenerateFAQ}
                >
                  Generate FAQ
                </button>
              </div>
              <pre className="faq-box">{faq}</pre>
            </div>
          </div>
        ) : activeTab === 'settings' ? (
          <div className={`manage-users-tab ${theme}`}>
            <h1>Manage Users</h1>
            <div className="search-bar">
              <input 
                type="text" 
                placeholder="Search users by ID, name, or email..." 
                className={theme}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <input 
              type="file" 
              accept=".xlsx" 
              onChange={handleFileUpload} 
            />
            <button 
              className={`add-user-button ${theme}`}
              onClick={() => setShowAddUserModal(true)}
            >
              Add Single User
            </button>
            <table className={`users-table ${theme}`}>
              <thead>
                <tr>
                  <th className="id-column">ID</th>
                  <th className="name-column">Name</th>
                  <th className="email-column">Email</th>
                  <th className="actions-column">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>
                      {editingUser && editingUser.id === user.id ? (
                        <input 
                          type="text" 
                          value={editingUser.name} 
                          onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} 
                        />
                      ) : (
                        user.name
                      )}
                    </td>
                    <td>
                      {editingUser && editingUser.id === user.id ? (
                        <input 
                          type="text" 
                          value={editingUser.email} 
                          onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} 
                        />
                      ) : (
                        user.email
                      )}
                    </td>
                    <td>
                      {editingUser && editingUser.id === user.id ? (
                        <>
                          <button className={`save-button ${theme}`} onClick={() => handleSaveUser(editingUser)}>Save</button>
                          <button className={`cancel-button ${theme}`} onClick={() => setEditingUser(null)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className={`edit-button ${theme}`} onClick={() => handleEditUser(user)}>Edit</button>
                          <button className={`delete-button ${theme}`} onClick={() => handleConfirmDelete(user.id)}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'instructors' ? (
          <div className={`manage-instructors-tab ${theme}`}>
            <h1>Manage Instructors</h1>
            <div className="search-bar">
              <input 
                type="text" 
                placeholder="Search instructors by email..." 
                className={theme}
                value={instructorSearchTerm}
                onChange={(e) => setInstructorSearchTerm(e.target.value)} 
              />
            </div>
            <input 
              type="file" 
              accept=".xlsx" 
              onChange={handleUploadInstructors} 
            />
            <button 
              className={`add-instructor-button ${theme}`}
              onClick={() => setShowAddInstructorModal(true)}
            >
              Add Single Instructor
            </button>
            <table className={`instructors-table ${theme}`}>
              <thead>
                <tr>
                  <th className="name-column">Name</th>
                  <th className="email-column">Email</th>
                  <th className="actions-column">Actions</th>
                </tr>
              </thead>
              <tbody>
              {filteredInstructors.map((instructor, index) => (
                <tr key={index}>
                  <td>
                    {editingUser && editingUser.email === instructor.email ? (
                      <input 
                        type="text" 
                        value={editingUser.name || ''} 
                        onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} 
                      />
                    ) : (
                      instructor.name || 'N/A'
                    )}
                  </td>
                  <td>
                    {editingUser && editingUser.email === instructor.email ? (
                      <input 
                        type="text" 
                        value={editingUser.email} 
                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} 
                      />
                    ) : (
                      instructor.email
                    )}
                  </td>
                  <td>
                    {editingUser && editingUser.email === instructor.email ? (
                      <>
                        <button className={`save-button ${theme}`} onClick={() => handleSaveUser(editingUser)}>Save</button>
                        <button className={`cancel-button ${theme}`} onClick={() => setEditingUser(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className={`edit-button ${theme}`} onClick={() => handleEditUser(instructor)}>Edit</button>
                        <button className={`delete-button ${theme}`} onClick={() => handleConfirmDeleteInstructor(instructor.email)}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={`university-info-tab ${theme}`}>
            <h1>University Information</h1>
            {editingUniversityInfo ? (
              <div>
                <textarea
                  className={`content-textarea ${theme}`}
                  value={universityInfo}
                  onChange={(e) => setUniversityInfo(e.target.value)}
                />
                <button className={`save-button ${theme}`} onClick={handleUpdateUniversityInfo}>Save</button>
                <button className={`cancel-button ${theme}`} onClick={() => setEditingUniversityInfo(false)}>Cancel</button>
              </div>
            ) : (
              <div>
                <p>{universityInfo}</p>
                <button className={`edit-button ${theme}`} onClick={() => setEditingUniversityInfo(true)}>Edit</button>
              </div>
            )}
          </div>
        )}
      </div>
      <button className={`theme-toggle ${theme}`} onClick={toggleTheme}>
        {theme === "dark" ? <MdLightMode /> : <MdDarkMode />}
      </button>

      {showConfirmModal && (
        <div className={`admin-confirmation-modal ${theme}`}>
          <div className={`modal-content ${theme}`}>
            <p>Are you sure you want to delete this user?</p>
            <div className={`modal-actions ${theme}`}>
              <button onClick={() => handleDeleteUser(userIdToDelete)}>Yes</button>
              <button onClick={() => setShowConfirmModal(false)}>No</button>
            </div>
          </div>
        </div>
      )}

      {showConfirmInstructorModal && (
        <div className={`admin-confirmation-modal ${theme}`}>
          <div className={`modal-content ${theme}`}>
            <p>Are you sure you want to delete this instructor?</p>
            <div className={`modal-actions ${theme}`}>
              <button onClick={() => handleDeleteInstructor(instructorEmailToDelete)}>Yes</button>
              <button onClick={() => setShowConfirmInstructorModal(false)}>No</button>
            </div>
          </div>
        </div>
      )}

      {showAddUserModal && (
        <div className={`admin-add-user-modal ${theme}`}>
          <div className={`modal-content ${theme}`}>
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
            <div className={`modal-actions ${theme}`}>
              <button onClick={handleAddSingleUser} disabled={isAddingUser}>Add</button>
              <button onClick={() => setShowAddUserModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showAddInstructorModal && (
        <div className={`admin-add-instructor-modal ${theme}`}>
          <div className={`modal-content ${theme}`}>
            <h2>Add New Instructor</h2>
            <input 
              type="text" 
              placeholder="Name" 
              className={theme}
              value={newInstructorName} 
              onChange={(e) => setNewInstructorName(e.target.value)} 
            />
            <input 
              type="email" 
              placeholder="Email" 
              className={theme}
              value={newInstructorEmail} 
              onChange={(e) => setNewInstructorEmail(e.target.value)} 
            />
            <div className={`modal-actions ${theme}`}>
              <button className={`save-button ${theme}`} onClick={handleAddSingleInstructor} disabled={isAddingInstructor}>Add</button>
              <button className={`cancel-button ${theme}`} onClick={() => setShowAddInstructorModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;