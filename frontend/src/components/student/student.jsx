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
import { BiLike, BiDislike, BiSolidDislike, BiSolidLike } from "react-icons/bi";
import { FaPaperclip } from "react-icons/fa6";
import Prism from 'prismjs';
import 'prismjs/themes/prism.css'; // Default light theme
// Import additional languages as needed
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';

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
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingNewChat, setIsCreatingNewChat] = useState(false);
  const [userRole, setUserRole] = useState(localStorage.getItem("userRole") || "");
  const [editingChatId, setEditingChatId] = useState(null);
  const [newChatName, setNewChatName] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editedPrompt, setEditedPrompt] = useState("");
  const navigate = useNavigate();
  const textareaRef = useRef(null);
  const editTextareaRef = useRef(null);
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
      const messagesWithFeedback = response.data;
      setMessages(messagesWithFeedback); // Set messages with feedback status
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
    const messageId = Date.now().toString();
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
      { text: input, sender: "user", timestamp: new Date().toLocaleString('en-US'), messageId: messageId },
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
          { text: botText, sender: "bot", timestamp: new Date().toLocaleString('en-US'), messageId: messageId },
        ];
        setMessages(updatedMessages);
      }
  
      const currentChat = chats.find(chat => chat.id === currentChatId);
      const chatNameToStore = currentChat?.chatName || "Unnamed Chat";
  
      await axios.post(`${base_url}/api/storeChat`, {
        chatId: currentChatId,
        messages: [
          ...newMessages,
          { text: botText, sender: "bot", timestamp: new Date().toLocaleString('en-US'), messageId: messageId },
        ],
        chatName: chatNameToStore,
        userId,
      });
    } catch (error) {
      console.error("Failed to generate response:", error);
      const updatedMessages = [
        ...newMessages,
        { text: "Failed to generate response. Please try again.", sender: "bot", timestamp: new Date().toLocaleString('en-US'), messageId: messageId },
      ];
      setMessages(updatedMessages);
    } finally {
      setIsTyping(false);
      setIsDisabled(false);
    }
  };

  const handleStartEdit = (messageId, currentText) => {
    setEditingMessageId(messageId);
    setEditedPrompt(currentText);
  };
  
  const handleCancelEditMessage = () => {
    setEditingMessageId(null);
    setEditedPrompt("");
  };
  
  const handleSaveEdit = async () => {
    if (!editedPrompt.trim()) return;
  
    try {
      setIsDisabled(true);
      setIsTyping(true);
  
      const response = await fetch(`${base_url}/api/editPrompt`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId: currentChatId,
          messageId: editingMessageId,
          editedPrompt: editedPrompt,
          userId: userId,
        }),
      });
  
      const reader = response.body.getReader();
      let botText = "";
  
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
  
        const chunk = new TextDecoder().decode(value);
        botText += chunk;
  
        const messageIndex = messages.findIndex(msg => msg.messageId === editingMessageId);
        const updatedMessages = [
          ...messages.slice(0, messageIndex),
          {
            ...messages[messageIndex],
            text: editedPrompt,
            edited: true,
            editedAt: new Date().toLocaleString()
          },
          { 
            text: botText, 
            sender: "bot", 
            timestamp: new Date().toLocaleString(),
            messageId: `bot_${Date.now()}`
          }
        ];
        setMessages(updatedMessages);
      }
    } catch (error) {
      console.error("Failed to edit prompt:", error);
    } finally {
      // Reset all relevant states
      setEditingMessageId(null);
      setEditedPrompt("");
      setIsTyping(false);
      setIsDisabled(false);
      
      // Focus back on the main input field
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 0);
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
      const boldTextRegex = /\*\*(.*?)\*\*/g;
      const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g; // Modified to capture language
      const headingRegex = /###\s*(.*?)\n/g;
  
      // Process code blocks with language detection
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = codeBlockRegex.exec(text)) !== null) {
        // Add text before the code block
        if (match.index > lastIndex) {
          parts.push({
            type: 'text',
            content: text.substring(lastIndex, match.index)
          });
        }
        
        // Add the code block
        parts.push({
          type: 'code',
          language: match[1] || 'javascript', // Default to javascript if no language specified
          content: match[2]
        });
        
        lastIndex = match.index + match[0].length;
      }
      
      // Add remaining text after last code block
      if (lastIndex < text.length) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex)
        });
      }
  
      return parts.map((part, index) => {
        if (part.type === 'code') {
          // Syntax highlight the code
          const highlightedCode = Prism.highlight(
            part.content,
            Prism.languages[part.language] || Prism.languages.javascript,
            part.language
          );
          
          return (
            <pre key={index} className={`student-code-block ${theme}`}>
              <code 
                className={`language-${part.language}`}
                dangerouslySetInnerHTML={{ __html: highlightedCode }}
                style={{textShadow: 'none', color: theme === 'light' ? 'black' : 'white'}}
              />
            </pre>
          );
        }
  
        // Process text parts (headings and bold text)
        const headingParts = part.content.split(headingRegex);
        return (
          <span key={index} className="student-message-text" style={{ whiteSpace: 'pre-wrap' }}>
            {headingParts.map((headingPart, headingIndex) => {
              if (headingIndex % 2 === 1) {
                return <h3 key={headingIndex}>{headingPart}</h3>;
              }
  
              const boldParts = headingPart.split(boldTextRegex);
              return (
                <span key={headingIndex}>
                  {boldParts.map((boldPart, boldIndex) => {
                    if (boldIndex % 2 === 1) {
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
      // For user messages
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
    const messageId = Date.now().toString();
  
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
        { text: input, sender: "user", timestamp: new Date().toLocaleString('en-US'), messageId: messageId },
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
          { text: botText, sender: "bot", timestamp: new Date().toLocaleString('en-US'), messageId: messageId },
        ];
        setMessages(updatedMessages);
      }
  
      await axios.post(`${base_url}/api/storeChat`, {
        chatId: newChatId,
        messages: [
          ...newMessages,
          { text: botText, sender: "bot", timestamp: new Date().toLocaleString('en-US'), messageId: messageId },
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
    localStorage.setItem("theme", theme === "dark" ? "light" : "dark");
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
                  setIsCreatingNewChat(false);
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

  const handleLikeDislike = async (messageId, action) => {
    try {
      // Check if the user has already reacted to this message
      const feedbackResponse = await axios.get(`${base_url}/api/checkFeedback`, {
        params: {
          userId: userId,
          messageId: messageId,
        },
      });
  
      if (feedbackResponse.data.exists) {
        alert("You have already reacted to this message.");
        return;
      }
  
      // Find the message in the messages array
      const message = messages.find(msg => msg.messageId === messageId && msg.sender === "bot");
      if (!message || message.sender !== "bot") {
        console.error("Message not found or not a bot response");
        return;
      }
  
      // Find the corresponding user prompt that generated this response
      const userPrompt = messages.find(msg => msg.messageId === messageId && msg.sender === "user");
      if (!userPrompt || userPrompt.sender !== "user") {
        console.log(userPrompt);
        console.error("User prompt not found");
        return;
      }
  
      // Send the data to the backend
      const response = await axios.post(`${base_url}/api/likeDislikeResponse`, {
        studentPrompt: userPrompt.text,
        response: message.text,
        action, // 'like' or 'dislike'
        messageId,
        userId,
      });
  
      if (response.data.success) {
        console.log("Response liked/disliked successfully");
  
        // Update the messages state to reflect the feedback immediately
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.messageId === messageId
              ? { ...msg, feedback: action } // Add the feedback action to the message
              : msg
          )
        );
      } else {
        console.error("Failed to like/dislike response");
      }
    } catch (error) {
      console.error("Error liking/disliking response:", error);
    }
  };

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
              <div className={`student-message-pfp ${message.sender}`} key={index}>
                <img className="sender-image" src={`${message.sender === 'user' ? userPicture : logo}`} alt="sender.jpg" />
                <div className={`student-message ${message.sender}`}>
                  {message.sender === 'user' && editingMessageId === message.messageId ? (
                    <div className={`student-edit-container ${theme}`}>
                      <textarea
                        ref={editTextareaRef}
                        value={editedPrompt}
                        onChange={(e) => {
                          const textarea = editTextareaRef.current; // Changed variable name
                          if (!textarea) return;

                          const value = e.target.value;
                          const cursorPosition = textarea.selectionStart;

                          setEditedPrompt(value);

                          textarea.style.height = "auto";
                          textarea.style.height = `${textarea.scrollHeight}px`;

                          setTimeout(() => {
                            textarea.setSelectionRange(cursorPosition, cursorPosition);
                          }, 0);
                        }}
                        className={`student-edit-textarea ${theme}`}
                        autoFocus
                      />
                      <div className={`student-edit-actions ${theme}`}>
                        <button 
                          onClick={handleSaveEdit}
                          className={`student-save-edit ${theme}`}
                          disabled={isDisabled}
                        >
                          Ask
                        </button>
                        <button
                          onClick={handleCancelEditMessage}
                          className={`student-cancel-edit-message ${theme}`}
                          disabled={isDisabled}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={`student-message ${message.sender} ${theme}`}>
                      {formatMessageText(message.text, message.sender)}
                      {message.edited && (
                        <span className="student-edited-indicator">(edited)</span>
                      )}
                    </div>
                  )}
                  {/* Rest of your message rendering */}
                  {message.sender === "bot" ? (
                    <>
                      {message.feedback === 'like' ? (
                        <div
                          className={`student-like-button ${theme}`}
                          title="Liked"
                        >
                          <BiSolidLike />
                        </div>
                      ) : message.feedback === 'dislike' ? (
                        <div
                          className={`student-dislike-button ${theme}`}
                          title="Disliked"
                        >
                          <BiSolidDislike />
                        </div>
                      ) : (
                        <div className="message-buttons-bot">
                          <div
                            className={`student-like-button ${theme}`}
                            onClick={() => handleLikeDislike(message.messageId, 'like')}
                            title="Like"
                          >
                            <BiLike />
                          </div>
                          <div
                            className={`student-dislike-button ${theme}`}
                            onClick={() => handleLikeDislike(message.messageId, 'dislike')}
                            title="Dislike"
                          >
                            <BiDislike />
                          </div>
                        </div>
                      )}
                    </>
                    ):(
                    <div className="message-buttons">
                      {editingMessageId === null && editedPrompt === "" ? (<div
                      className={`student-edit-prompt ${theme}`}
                      onClick={() => handleStartEdit(message.messageId, message.text)}
                      disabled={isDisabled}
                      title="Edit prompt"
                      >
                        <FaEdit />
                      </div>):(null)}
                    </div>
                    )}
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
                >Ask</button>
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
                <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center', alignSelf: 'end'}}>
                  <button className={`student-submit-query ${theme}`} onClick={handleSend}>Ask</button>
                </div>
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