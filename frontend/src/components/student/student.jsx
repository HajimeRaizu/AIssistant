import React, { useState, useEffect, useRef } from "react";
import "./student.css";
import "./student_android.css"
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { LuBookMarked } from "react-icons/lu";
import { MdOutlineDelete, MdLightMode, MdDarkMode, MdChevronLeft, MdChevronRight } from "react-icons/md";
import logo from '../assets/AIssistant.png';
import { FaEdit } from "react-icons/fa";
import { IoMdCloseCircleOutline } from "react-icons/io";
import { LuSave } from "react-icons/lu";

const StudentPage = () => {
  const base_url = `https://aissistant-backend.vercel.app`;
  //const base_url = `http://localhost:5000`;
  const [tutorial, setTutorial] = useState(false);
  const [tutorial2, setTutorial2] = useState(false);
  const [tutorial3, setTutorial3] = useState(false);
  const [selectedTab, setSelectedTab] = useState("chat");
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [student, setExercises] = useState([]);
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [theme, setTheme] = useState("light");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingNewChat, setIsCreatingNewChat] = useState(false);
  const [userRole, setUserRole] = useState(localStorage.getItem("userRole") || "");
  const [editingChatId, setEditingChatId] = useState(null);
  const [newChatName, setNewChatName] = useState("");
  const navigate = useNavigate();
  const textareaRef = useRef(null);
  const chatBodyRef = useRef(null);

  const isAuthenticated = localStorage.getItem("isAuthenticated");
  const userId = localStorage.getItem("userId");
  const userName = localStorage.getItem("userName");
  const userEmail = localStorage.getItem("userEmail");
  const userPicture = localStorage.getItem("profileImage");

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
            return
          } else if (role === "admin") {
            navigate("/admin");
          } else if (role === "instructor") {
            navigate("/instructor");
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
    const fetchChats = async () => {
      try {
        const response = await axios.get(`${base_url}/api/getChats/${userId}`);
        setChats(response.data);
  
        const storedChatId = localStorage.getItem("currentChatId");
        if (storedChatId && response.data.some(chat => chat.id === storedChatId)) {
          setCurrentChatId(storedChatId);
          await fetchChatHistory(storedChatId);
        } else if (response.data.length > 0) {
          setCurrentChatId(response.data[0].id);
          await fetchChatHistory(response.data[0].id);
        } else {
          setTutorial(true);
          handleNewChatClick();
        }
      } catch (error) {
        console.error("Failed to fetch chats:", error);
      } finally {
        setIsLoading(false);
      }
    };
  
    if (userId) {
      fetchChats();
    }
  }, [userId, navigate]);

  const fetchChatHistory = async (chatId) => {
    try {
      const response = await axios.get(`${base_url}/api/getChatHistory/${chatId}/${userId}`);
      setMessages(response.data);
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
    }
  };

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (input.trim() === "") return;
    const textarea = document.querySelector(".student-chat-input textarea");
    if (textarea) {
      textarea.style.height = "auto";
    }

    if (isCreatingNewChat) {
      await createNewChat();
      return;
    }
  
    const newMessages = [
      ...messages,
      { text: input, sender: "user", timestamp: new Date().toLocaleString() },
    ];
    setMessages(newMessages);
  
    setInput("");
    setIsDisabled(true);
    setIsTyping(true);
  
    try {
      const response = await fetch(`${base_url}/api/ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input, userId, chatId: currentChatId }),
      });
  
      const reader = response.body.getReader();
      let botText = "";
  
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
  
        const chunk = new TextDecoder().decode(value);
        botText += chunk;
  
        const updatedMessages = [
          ...newMessages,
          { text: botText, sender: "bot", timestamp: new Date().toLocaleString() },
        ];
        setMessages(updatedMessages);
      }
  
      const currentChat = chats.find(chat => chat.id === currentChatId);
      const chatNameToStore = currentChat?.chatName || "Unnamed Chat";
  
      await axios.post(`${base_url}/api/storeChat`, {
        chatId: currentChatId,
        messages: [
          ...newMessages,
          { text: botText, sender: "bot", timestamp: new Date().toLocaleString() },
        ],
        chatName: chatNameToStore,
        userId,
      });
    } catch (error) {
      console.error("Failed to generate response:", error);
      const updatedMessages = [
        ...newMessages,
        { text: "Failed to generate response. Please try again.", sender: "bot", timestamp: new Date().toLocaleString() },
      ];
      setMessages(updatedMessages);
    } finally {
      setIsTyping(false);
      setIsDisabled(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
  
      const textarea = textareaRef.current;
      if (!textarea) return;
  
      const cursorPosition = textarea.selectionStart;
      const currentValue = input;
  
      // Insert the newline at the cursor position
      const newValue =
        currentValue.slice(0, cursorPosition) + "\n" + currentValue.slice(cursorPosition);
  
      setInput(newValue);
  
      // Wait for state update before adjusting height and scrolling
      requestAnimationFrame(() => {
        textarea.setSelectionRange(cursorPosition + 1, cursorPosition + 1);
  
        // Resize textarea and ensure cursor is visible
        setTimeout(() => {
          textarea.style.height = "auto"; // Reset height
          textarea.style.height = `${textarea.scrollHeight}px`; // Adjust height dynamically
  
          // Scroll to keep the cursor visible
          textarea.scrollTop = textarea.scrollHeight;
        }, 0);
      });
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isDisabled) {
        handleSend();
      }
      setInput("");
    }
  };

  const handleTutorial = () => {
    if (tutorial){
      setTutorial(false);
      setTutorial2(true);
    } else if (!tutorial && tutorial2){
      setTutorial2(false);
      setTutorial3(true);
    } else if (!tutorial && !tutorial2){
      setTutorial3(false);
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
    navigate("/googleLogin");
  };

  const formatMessageText = (text, sender) => {
    if (!text) return null;
  
    if (sender === "bot") {
      const boldTextRegex = /\*\*(.*?)\*\*/g; // Matches **bold** text
      const codeBlockRegex = /```([\s\S]*?)```/g; // Matches ```code blocks```
      const headingRegex = /###\s*(.*?)\n/g; // Matches ### headings
  
      // Split the text by code blocks first
      const parts = text.split(codeBlockRegex);
  
      return parts.map((part, index) => {
        if (index % 2 === 1) {
          // This is a code block
          return (
            <pre key={index} className={`student-code-block ${theme}`}>
              <code>{part}</code>
            </pre>
          );
        }
  
        // Process headings and bold text in non-code parts
        const headingParts = part.split(headingRegex);
        return (
          <span key={index} className="student-message-text" style={{ whiteSpace: 'pre-wrap' }}>
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

  const handleInputChange = (e) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
  
    const value = e.target.value;
    const cursorPosition = textarea.selectionStart; // Save cursor position
  
    setInput(value); // Update state
  
    // Reset height and adjust dynamically
    textarea.style.height = "auto"; // Reset height
    textarea.style.height = `${textarea.scrollHeight}px`; // Adjust height based on content
  
    // Restore cursor position after state update
    setTimeout(() => {
      textarea.setSelectionRange(cursorPosition, cursorPosition); // Restore cursor position
    }, 0);
  };
  

  const createNewChat = async () => {
    if (input.trim() === "") return;
  
    setIsSubmitting(true);
    setIsCreatingNewChat(true);
  
    try {
      const response = await axios.post(`${base_url}/api/createChat`, {
        userId,
        firstMessage: input,
      });
  
      const newChat = response.data;
      const newChatId = newChat.id;
  
      setChats([newChat, ...chats]);
      setCurrentChatId(newChatId);
      setMessages([]);
  
      const newMessages = [
        { text: input, sender: "user", timestamp: new Date().toLocaleString() },
      ];
      setMessages(newMessages);
      setInput("");
  
      setIsDisabled(true);
      setIsTyping(true);
  
      const aiResponse = await fetch(`${base_url}/api/ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input, userId, chatId: newChatId }),
      });
  
      const reader = aiResponse.body.getReader();
      let botText = "";
  
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
  
        const chunk = new TextDecoder().decode(value);
        botText += chunk;
  
        const updatedMessages = [
          ...newMessages,
          { text: botText, sender: "bot", timestamp: new Date().toLocaleString() },
        ];
        setMessages(updatedMessages);
      }
  
      await axios.post(`${base_url}/api/storeChat`, {
        chatId: newChatId,
        messages: [
          ...newMessages,
          { text: botText, sender: "bot", timestamp: new Date().toLocaleString() },
        ],
        chatName: newChat.chatName,
        userId,
      });
    } catch (error) {
      console.error("Failed to create new chat:", error);
    } finally {
      setIsSubmitting(false);
      setIsTyping(false);
      setIsDisabled(false);
      setIsCreatingNewChat(false);
    }
  };

  const deleteChat = async (chatId) => {
    try {
      await axios.delete(`${base_url}/api/deleteChat/${chatId}/${userId}`);
      setChats(chats.filter(chat => chat.id !== chatId));
      if (currentChatId === chatId) {
        handleNewChatClick();
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  const handleDeleteChat = (chatId) => {
    setChatToDelete(chatId);
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteChat = () => {
    deleteChat(chatToDelete);
    setShowDeleteConfirmation(false);
  };

  const cancelDeleteChat = () => {
    setShowDeleteConfirmation(false);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const toggleSidebar = () => {
    setIsSidebarVisible(prev => !prev);
  };

  const handleNewChatClick = () => {
    setIsCreatingNewChat(true);
    setInput("");
    setMessages([]);
    setCurrentChatId(null);
  };

  const handleEditChat = (chatId, currentChatName) => {
    setEditingChatId(chatId);
    setNewChatName(currentChatName);
  };

  const handleSaveChatName = async (chatId) => {
    if (newChatName.trim() === "") return;

    try {
      await axios.put(`${base_url}/api/updateChatName`, {
        chatId,
        chatName: newChatName,
      });

      setChats(chats.map(chat => 
        chat.id === chatId ? { ...chat, chatName: newChatName } : chat
      ));

      setEditingChatId(null);
      setNewChatName("");
    } catch (error) {
      console.error("Failed to update chat name:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingChatId(null);
    setNewChatName("");
  };

  const groupChatsByDate = (chats) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  
    // Initialize grouped chats object
    const groupedChats = {
      today: [],
      yesterday: [],
      last7Days: [],
      last30Days: [],
      months: {}, // Only for the current year
      years: {}, // For previous years
    };
  
    chats.forEach(chat => {
      const chatDate = new Date(chat.createdAt);
  
      if (chatDate >= today) {
        groupedChats.today.push(chat);
      } else if (chatDate >= yesterday) {
        groupedChats.yesterday.push(chat);
      } else if (chatDate >= sevenDaysAgo) {
        groupedChats.last7Days.push(chat);
      } else if (chatDate >= thirtyDaysAgo) {
        groupedChats.last30Days.push(chat);
      } else {
        const chatMonth = chatDate.toLocaleString('default', { month: 'long' });
        const chatYear = chatDate.getFullYear();
  
        // Group by month (only for the current year)
        if (chatYear === now.getFullYear()) {
          if (!groupedChats.months[chatMonth]) {
            groupedChats.months[chatMonth] = [];
          }
          groupedChats.months[chatMonth].push(chat);
        }
  
        // Group by year (only for previous years)
        if (chatYear < now.getFullYear()) {
          if (!groupedChats.years[chatYear]) {
            groupedChats.years[chatYear] = [];
          }
          groupedChats.years[chatYear].push(chat);
        }
      }
    });
  
    return groupedChats;
  };

  const renderGroupedChats = (groupedChats) => {
    const renderChats = (chats, groupLabel) => {
      return (
        <div key={groupLabel} className={`student-chat-group ${theme}`}>
          <h3>{groupLabel}</h3>
          {chats.map(chat => (
            <div
              key={chat.id}
              className={`student-chat-item ${chat.id === currentChatId ? 'active' : ''} ${theme} ${isDisabled ? 'disabled' : ''}`}
              onClick={() => {
                if (!isDisabled && editingChatId !== chat.id) {
                  setCurrentChatId(chat.id);
                  fetchChatHistory(chat.id);
                  setSelectedTab("chat");
                }
              }}
            >
              {editingChatId === chat.id ? (
                <input
                  type="text"
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  className={`student-chat-name-input ${theme}`}
                  autoFocus
                />
              ) : (
                <span>{chat.chatName || `Chat ${chat.id}`}</span>
              )}
              <div className="student-chat-actions">
                {editingChatId === chat.id ? (
                  <>
                    <button
                      className={`student-save-chat ${theme}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveChatName(chat.id);
                      }}
                      disabled={isDisabled}
                      title='Save'
                    >
                      <LuSave />
                    </button>
                    <button
                      className={`student-cancel-edit ${theme}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelEdit();
                      }}
                      disabled={isDisabled}
                      title="Cancel"
                    >
                      <IoMdCloseCircleOutline />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className={`student-edit-chat ${theme}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditChat(chat.id, chat.chatName);
                      }}
                      disabled={isDisabled}
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                    <button
                      className={`student-delete-chat ${theme}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isDisabled) {
                          handleDeleteChat(chat.id);
                        }
                      }}
                      disabled={isDisabled}
                      title="Delete"
                    >
                      <MdOutlineDelete className={`student-delete-icon ${theme}`} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    };
  
    return (
      <>
        {groupedChats.today.length > 0 && renderChats(groupedChats.today, "Today")}
        {groupedChats.yesterday.length > 0 && renderChats(groupedChats.yesterday, "Yesterday")}
        {groupedChats.last7Days.length > 0 && renderChats(groupedChats.last7Days, "7 Days")}
        {groupedChats.last30Days.length > 0 && renderChats(groupedChats.last30Days, "30 Days")}
    
        {/* Render chats grouped by month (only for the current year) */}
        {Object.entries(groupedChats.months).map(([month, chats]) => (
          renderChats(chats, month) // Only show the month name (e.g., "January")
        ))}
    
        {/* Render chats grouped by year (only for previous years) */}
        {Object.entries(groupedChats.years).map(([year, chats]) => (
          renderChats(chats, year) // Show the year (e.g., "2024")
        ))}
      </>
    );
    
  };

  const groupedChats = groupChatsByDate(chats);

  if (isLoading) {
    return <div className={`student-loading-container ${theme}`}>Loading...</div>;
  }

  return (
    <div className={`student-container ${theme}`}>
      <div className={`student-tutorial-highlight ${tutorial}`} onClick={handleTutorial}></div>
      <div className={`student-tutorial ${tutorial}`} onClick={handleTutorial}>
        <span>
          <p>click here to hide and</p>
          <p>unhide sidebar to</p>
          <p>navigate through</p>
          <p>chats</p>
        </span>
      </div>
      <div className={`student-tutorial-highlight2 ${tutorial2}`} onClick={handleTutorial}></div>
      <div className={`student-tutorial2 ${tutorial2}`} onClick={handleTutorial}>
        <span>
          <p>click here to navigate</p>
          <p>to AIssistant learn</p>
        </span>
      </div>
      <div className={`student-tutorial-highlight3 ${tutorial3}`} onClick={handleTutorial}></div>
      <div className={`student-tutorial3 ${tutorial3}`} onClick={handleTutorial}>
        <span>
          <p>click here to toggle</p>
          <p>light mode and</p>
          <p>dark mode</p>
        </span>
      </div>
      <div className="student-header-buttons">
        <div className="userName" style={{ paddingLeft: '10px' }}>{userName}</div>
        <img src={userPicture} className='userPicture' alt="" />
        <button title="Toggle theme" className={`student-theme-toggle ${theme} ${tutorial3}`} onClick={toggleTheme}>
          {theme === "dark" ? <MdLightMode /> : <MdDarkMode />}
        </button>
        <button title="Move to learning materials" className={`student-exercise-button ${theme} ${tutorial2}`} onClick={() => navigate('/exercises')}>
          <LuBookMarked />
        </button>
      </div>
      <div className={`student-overlay ${isSidebarVisible ? 'visible' : 'hidden'}`} onClick={toggleSidebar} />
      <div className={`student-sidebar ${theme} ${isSidebarVisible ? 'visible' : 'hidden'}`}>
        <div className="student-profile">
          <img src={`${userPicture}`} alt={`${userName}.jpg`} />
          <p>{userName}</p>
        </div>
        <button
          className="student-new-chat"
          onClick={handleNewChatClick}
          disabled={isDisabled}
        >
          New Chat
        </button>
        <div className="student-chat-list">
          {renderGroupedChats(groupedChats)}
        </div>
        <div className="student-logout-section">
          <button className={`student-logout-button ${theme}`} onClick={handleLogout}>Logout</button>
        </div>

        <button className={`student-sidebar-toggle ${theme} ${isSidebarVisible ? 'sidebar-visible' : 'sidebar-hidden'}`} onClick={toggleSidebar}>
          {isSidebarVisible ? <MdChevronLeft /> : <MdChevronRight />}
        </button>
        <button className={`student-sidebar-toggle2 ${theme} ${isSidebarVisible ? 'sidebar-visible' : 'sidebar-hidden'}`} onClick={toggleSidebar}>
          {isSidebarVisible ? <MdChevronRight /> : <MdChevronLeft />}
        </button>
      </div>

      {currentChatId && (
        <div className={`student-content ${theme} ${isSidebarVisible ? 'sidebar-visible' : 'sidebar-hidden'}`}>
          <div className="student-chat-container">
            <div className={`student-chat-header ${theme}`}>
              <div className="student-aissistant">
                <h2 style={{ color: 'rgb(86, 86, 255)' }}>AI</h2>
                <h2>ssistant Chat</h2>
              </div>
              <p className="student-disclaimer">This chat will respond to any programming language.</p>
            </div>
            <div className={`student-chat-body ${theme}`} ref={chatBodyRef}>
              {messages.map((message, index) => (
                <div className={`student-message-pfp ${message.sender}`}>
                  <img className="sender-image" src={`${message.sender === 'user' ? userPicture : logo}`} alt="sender.jpg" />
                  <div className={`student-message ${message.sender}`} key={index}>
                    <div className={`student-message ${message.sender} ${theme}`}>
                      {message.sender === "user" ? (
                        <p>{formatMessageText(message.text, message.sender)}</p>
                      ) : (
                        <div className="student-bot-response">
                          {formatMessageText(message.text, message.sender)}
                        </div>
                      )}
                    </div>
                    <span className={`student-timestamp ${message.sender}`}>{message.timestamp}</span>
                  </div>
                </div>
              ))}
              {isTyping && (
                <p className="student-typing-indicator">Typing...</p>
              )}
            </div>
            <div className={`student-chat-input ${theme}`}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onInput={handleKeyDown}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                className={theme}
              />
              <div className={`student-chat-input-button ${theme}`}>
                <button
                  onClick={handleSend}
                  className={`student-submit-query ${theme}`}
                  disabled={isDisabled}
                >
                  Ask
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!currentChatId && (
        <div className={`student-no-chat-selected ${isSidebarVisible ? 'sidebar-visible' : 'sidebar-hidden'} ${theme}`}>
          <div className={`student-no-chat-box ${theme}`}>
            <div className={`student-newchat-container ${theme}`}>
              <div className={`student-newchat-header ${theme}`}>
                <div className="student-aissistant">
                  <h1>Hello World! I am </h1>
                  <h2 style={{ color: 'rgb(86, 86, 255)', fontSize: '24px', paddingLeft: '7px' }}>AI</h2>
                  <h2 style={{ fontSize: '24px' }}>ssistant.</h2>
                </div>
                <p>Your personal academia companion.</p>
              </div>
              <div className={`student-newchat-message ${theme}`}>
                <textarea
                  className={`${theme}`}
                  ref={textareaRef}
                  type="text"
                  placeholder="Ask a question"
                  value={input}
                  onChange={handleInputChange}
                  onInput={handleKeyDown}
                  onKeyDown={handleKeyDown}
                />
                <button className={`student-submit-query ${theme}`} onClick={handleSend}>Ask</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirmation && (
        <div className={`student-confirmation-modal ${theme}`}>
          <div className={`student-modal-content ${theme}`}>
            <p>Are you sure you want to delete this chat?</p>
            <div className={`student-chat-name-modal-actions ${theme}`}>
              <button onClick={confirmDeleteChat}>Yes</button>
              <button onClick={cancelDeleteChat}>No</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPage;