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
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingNewChat, setIsCreatingNewChat] = useState(false);
  const navigate = useNavigate();
  const textareaRef = useRef(null);
  const chatBodyRef = useRef(null);

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

        const storedChatId = localStorage.getItem("currentChatId");
        if (storedChatId && response.data.some(chat => chat.id === storedChatId)) {
          setCurrentChatId(storedChatId);
          await fetchChatHistory(storedChatId);
        } else if (response.data.length > 0) {
          setCurrentChatId(response.data[0].id);
          await fetchChatHistory(response.data[0].id);
        } else {
          setCurrentChatId(null);
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
    setIsDisabled(true); // Disable the submit button
    setIsTyping(true);

    try {
      const response = await fetch(`${base_url}/api/llama`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input, userId }),
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
      setIsDisabled(false); // Re-enable the submit button
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isDisabled) { // Check if the submit button is disabled
        handleSend();
      }
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
            <pre key={index} className={`student-code-block ${theme}`}>
              <code>{part}</code>
            </pre>
          );
        }

        const boldParts = part.split(boldTextRegex);
        return (
          <span key={index} className="student-message-text" style={{ whiteSpace: 'pre-wrap' }}>
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
        <span className="student-message-text" style={{ whiteSpace: 'pre-wrap' }}>
          {text}
        </span>
      );
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 7 * 24)}px`;
    }
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
      setChats([newChat, ...chats]);
      setCurrentChatId(newChat.id);
      setMessages([]);

      const newMessages = [
        { text: input, sender: "user", timestamp: new Date().toLocaleString() },
      ];
      setMessages(newMessages);

      setIsDisabled(true);
      setIsTyping(true);

      const aiResponse = await fetch(`${base_url}/api/llama`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input, userId }),
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
        chatId: newChat.id,
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

  const handleNewChatClick = () => {
    setIsCreatingNewChat(true);
    setInput("");
    setMessages([]);
    setCurrentChatId(null);
  };

  if (isLoading) {
    return <div className={`student-loading-container ${theme}`}>Loading...</div>;
  }

  return (
    <div className={`student-user-container ${theme}`}>
      <button className={`student-theme-toggle ${theme}`} onClick={toggleTheme}>
          {theme === "dark" ? <MdLightMode /> : <MdDarkMode />}
        </button>

        <button className={`student-exercises-button ${theme}`} onClick={() => navigate('/exercises')}>
          Exercises
        </button>
      <div className={`student-sidebar ${theme} ${isSidebarVisible ? 'visible' : 'hidden'}`}>
        <button 
          className="student-new-chat" 
          onClick={handleNewChatClick} 
          disabled={isDisabled} // Disable the button when isDisabled is true
        >
          New Chat
        </button>
        <div className="student-chat-list">
          {chats.map(chat => (
            <div
              key={chat.id}
              className={`student-chat-item ${chat.id === currentChatId ? 'active' : ''} ${theme} ${isDisabled ? 'disabled' : ''}`} // Add 'disabled' class when isDisabled is true
              onClick={() => {
                if (!isDisabled) { // Only allow navigation if not disabled
                  setCurrentChatId(chat.id);
                  fetchChatHistory(chat.id);
                  setSelectedTab("chat");
                }
              }}
            >
              {chat.chatName || `Chat ${chat.id}`}
              <button 
                className="student-delete-chat" 
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isDisabled) { // Only allow deletion if not disabled
                    handleDeleteChat(chat.id);
                  }
                }}
                disabled={isDisabled} // Disable the delete button when isDisabled is true
              >
                <MdOutlineDelete className={`student-delete-icon ${theme}`} />
              </button>
            </div>
          ))}
        </div>
        <div className="student-logout-section">
          <button className={`student-user-logout-button ${theme}`} onClick={handleLogout}>Logout</button>
        </div>

        <button className={`student-sidebar-toggle ${theme} ${isSidebarVisible ? 'sidebar-visible' : 'sidebar-hidden'}`} onClick={toggleSidebar}>
          {isSidebarVisible ? <MdChevronLeft /> : <MdChevronRight />}
        </button>
      </div>

      {currentChatId && (
        <div className={`student-content ${theme} ${isSidebarVisible ? 'sidebar-visible' : 'sidebar-hidden'}`}>
          <div className="student-chat-container">
            <div className={`student-chat-header ${theme}`}>
              <h2>AIssistant Chat</h2>
              <p className="student-disclaimer">This chat will respond to queries in any language.</p>
            </div>
            <div className={`student-chat-body ${theme}`} ref={chatBodyRef}>
              {messages.map((message, index) => (
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
              ))}
              {isTyping && (
                <div className="student-message bot">
                  <p className="student-typing-indicator">Typing...</p>
                </div>
              )}
            </div>
            <div className={`student-chat-input ${theme}`}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                className={theme}
                style={{ height: "auto", minHeight: "96px", maxHeight: "168px", whiteSpace: 'pre-wrap' }}
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
                <h1>Hello World! I am AIssistant.</h1>
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
          <div className={`student-user-modal-content ${theme}`}>
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

export default UserPage;