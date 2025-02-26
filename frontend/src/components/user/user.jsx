import React, { useState, useEffect, useRef } from "react";
import "./user.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { MdOutlineDelete, MdLightMode, MdDarkMode, MdChevronLeft, MdChevronRight } from "react-icons/md";

const UserPage = () => {
  const base_url = `https://aissistant-backend.vercel.app`;
  //const base_url = `http://localhost:5000`;
  const [selectedTab, setSelectedTab] = useState("chat");
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [exercises, setExercises] = useState([]);
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [theme, setTheme] = useState("light");
  const [showChatNameModal, setShowChatNameModal] = useState(false);
  const [chatNameInput, setChatNameInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const textareaRef = useRef(null);

  const userId = localStorage.getItem("userId") || sessionStorage.getItem("userId");

  useEffect(() => {
    if (!userId) {
      navigate("/");
    }
  }, [userId, navigate]);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const response = await axios.get(`${base_url}/api/getChats/${userId}`);
        setChats(response.data);
  
        if (response.data.length === 0) {
          setCurrentChatId(null);
        } else {
          setCurrentChatId(null); // Set the latest chat as the current chat
          await fetchChatHistory(response.data[0].id);
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

  const handleSend = async () => {
    if (input.trim() === "") return;
  
    const newMessages = [
      ...messages,
      { text: input, sender: "user", timestamp: new Date().toLocaleString() },
    ];
    setMessages(newMessages);
  
    setInput("");
    setIsDisabled(true);
    setIsTyping(true);
  
    try {
      const response = await axios.post(`${base_url}/api/llama`, { input });
      const botText = response.data.generated_text || "No response received.";
  
      const updatedMessages = [
        ...newMessages,
        { text: botText, sender: "bot", timestamp: new Date().toLocaleString() },
      ];
      setMessages(updatedMessages);
  
      // Retrieve the chat name from the chats state
      const currentChat = chats.find(chat => chat.id === currentChatId);
      const chatNameToStore = currentChat?.chatName || "Unnamed Chat";
  
      // Pass the chatName to the backend when storing the chat
      await axios.post(`${base_url}/api/storeChat`, {
        chatId: currentChatId,
        messages: updatedMessages,
        chatName: chatNameToStore, // Pass the chat name here
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      setInput((prevInput) => prevInput + "\n");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    sessionStorage.removeItem("userId");
    sessionStorage.removeItem("userName");
    navigate("/");
  };

  const formatMessageText = (text, sender) => {
    if (!text) return null;

    if (sender === "bot") {
      const boldTextRegex = /\*\*(.*?)\*\*/g;
      const codeBlockRegex = /```([\s\S]*?)```/g;

      const parts = text.split(codeBlockRegex);

      return parts.map((part, index) => {
        if (index % 2 === 1) {
          return (
            <pre key={index} className={`code-block ${theme}`}>
              <code>{part}</code>
            </pre>
          );
        }

        const boldParts = part.split(boldTextRegex);
        return (
          <span key={index} className="message-text" style={{ whiteSpace: 'pre-wrap' }}>
            {boldParts.map((boldPart, boldIndex) => {
              if (boldIndex % 2 === 1) {
                return <strong key={boldIndex}>{boldPart}</strong>;
              }
              return boldPart;
            })}
          </span>
        );
      });
    } else {
      return (
        <span className="message-text" style={{ whiteSpace: 'pre-wrap' }}>
          {text}
        </span>
      );
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);

    const textarea = textareaRef.current;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 7 * 24)}px`;
  };

  const createNewChat = async () => {
    setSelectedTab(null);
    setCurrentChatId(null);
    setShowChatNameModal(true);
  };
  
  const handleChatNameSubmit = async () => {
    if (chatNameInput.trim() === "" || isSubmitting) return;
    
    setIsSubmitting(true);
  
    try {
      const response = await axios.post(`${base_url}/api/createChat`, { chatName: chatNameInput, userId });
      setChats([response.data, ...chats]);
      setCurrentChatId(response.data.id);
      setMessages([]);
      setShowChatNameModal(false);
      setChatNameInput("");
    } catch (error) {
      console.error("Failed to create new chat:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteChat = async (chatId) => {
    try {
      await axios.delete(`${base_url}/api/deleteChat/${chatId}/${userId}`);
      setChats(chats.filter(chat => chat.id !== chatId));
      if (currentChatId === chatId) {
        setCurrentChatId(chats.length > 1 ? chats[0].id : null);
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

  if (isLoading) {
    return <div className={`loading-container ${theme}`}>Loading...</div>;
  }

  return (
    <div className={`user-container ${theme}`}>
      <button className={`theme-toggle ${theme}`} onClick={toggleTheme}>
          {theme === "dark" ? <MdLightMode /> : <MdDarkMode />}
        </button>

        <button className={`exercises-button ${theme}`} onClick={() => navigate('/exercises')}>
          Exercises
        </button>
      <div className={`user-sidebar ${theme} ${isSidebarVisible ? 'visible' : 'hidden'}`}>
        <button className="new-chat" onClick={createNewChat}>New Chat</button>
        <div className="chat-list">
          {chats.map(chat => (
            <div
              key={chat.id}
              className={`chat-item ${chat.id === currentChatId ? 'active' : ''} ${theme}`}
              onClick={() => {
                setCurrentChatId(chat.id);
                fetchChatHistory(chat.id);
                setSelectedTab("chat");
              }}
            >
              {chat.chatName || `Chat ${chat.id}`} {/* Fallback to "Chat {id}" if chatName is not available */}
              <button className="delete-chat" onClick={(e) => {
                e.stopPropagation();
                handleDeleteChat(chat.id);
              }}><MdOutlineDelete className={`delete-icon ${theme}`} /></button>
            </div>
          ))}
        </div>
        <div className="logout-section">
          <button className={`user-logout-button ${theme}`} onClick={handleLogout}>Logout</button>
        </div>

        <button className={`sidebar-toggle ${theme} ${isSidebarVisible ? 'sidebar-visible' : 'sidebar-hidden'}`} onClick={toggleSidebar}>
          {isSidebarVisible ? <MdChevronLeft /> : <MdChevronRight />}
        </button>
      </div>

      {currentChatId && (
        <div className={`student-content ${theme} ${isSidebarVisible ? 'sidebar-visible' : 'sidebar-hidden'}`}>
          <div className="chat-container">
            <div className={`chat-header ${theme}`}>
              <h2>AIssistant Chat</h2>
              <p className="disclaimer">This chat will respond to queries in any language.</p>
            </div>
            <div className={`chat-body ${theme}`}>
              {messages.map((message, index) => (
                <div className={`message ${message.sender}`} key={index}>
                  <div className={`message ${message.sender} ${theme}`}>
                    {message.sender === "user" ? (
                      <p>{formatMessageText(message.text, message.sender)}</p>
                    ) : (
                      <div className="bot-response">
                        {formatMessageText(message.text, message.sender)}
                      </div>
                    )}
                  </div>
                  <span className={`timestamp ${message.sender}`}>{message.timestamp}</span>
                </div>
              ))}
              {isTyping && (
                <div className="message bot">
                  <p className="typing-indicator">Typing...</p>
                </div>
              )}
            </div>
            <div className={`chat-input ${theme}`}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                disabled={isDisabled}
                className={theme}
                style={{ height: "auto", minHeight: "96px", maxHeight: "168px", whiteSpace: 'pre-wrap' }}
              />
              <div className={`chat-input-button ${theme}`}>
                <button 
                  onClick={handleSend} 
                  className={`submit-query ${theme}`} 
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
        <div className={`no-chat-selected ${isSidebarVisible ? 'sidebar-visible' : 'sidebar-hidden'}`}>
          <div className={`no-chat-box`}>
            <div className="newchat-container">
              <div className="newchat-header">
                <h1>Hello World! I am AIssistant.</h1>
                <p>Your personal academia companion.</p>
              </div>
              <div className="newchat-message">
                <textarea type="text" placeholder="Ask a question" />
                <button>Send</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirmation && (
        <div className={`confirmation-modal ${theme}`}>
          <div className={`user-modal-content ${theme}`}>
            <p>Are you sure you want to delete this chat?</p>
            <div className={`chat-name-modal-actions ${theme}`}>
              <button onClick={confirmDeleteChat}>Yes</button>
              <button onClick={cancelDeleteChat}>No</button>
            </div>
          </div>
        </div>
      )}

      {showChatNameModal && (
        <div className={`chat-name-modal ${theme}`}>
          <div className={`chat-name-modal-content ${theme}`}>
            <p>Enter a name for the new chat:</p>
            <input
              type="text"
              value={chatNameInput}
              onChange={(e) => setChatNameInput(e.target.value)}
              placeholder="Chat name"
            />
            <div className="chat-name-modal-actions">
              <button onClick={handleChatNameSubmit}>Submit</button>
              <button onClick={() => setShowChatNameModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPage;