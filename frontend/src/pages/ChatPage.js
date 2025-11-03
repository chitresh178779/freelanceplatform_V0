// In src/pages/ChatPage.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useParams } from 'react-router-dom'; // Import useParams
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import useWebSocket from '../hooks/useWebSocket'; // Import the new hook
import './ChatPage.css';

function ChatPage() {
    const { roomId } = useParams(); // Get room ID from URL, if provided
    const { user, authTokens, logoutUser } = useAuth();
    const [rooms, setRooms] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const [loadingRooms, setLoadingRooms] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [error, setError] = useState('');
    const messageListRef = useRef(null); // Ref for auto-scrolling

    // --- WebSocket Hook ---
    // Get messages, sendMessage function, and connection status from the hook
    const { messages, setMessages, sendMessage, isConnected } = useWebSocket(
        selectedRoom?.id, // Pass selected room ID (null if none selected)
        authTokens?.access   // Pass the access token
    );
    // --- End WebSocket Hook ---


    // 1. Fetch all chat rooms for the user
    const fetchRooms = useCallback(async () => {
        if (!authTokens) return;
        setLoadingRooms(true);
        try {
            const response = await axios.get('http://127.0.0.1:8000/api/chats/', {
                headers: { 'Authorization': `Bearer ${authTokens.access}` }
            });
            const fetchedRooms = response.data.results || response.data;
            setRooms(fetchedRooms);

            // If a roomId is present in the URL, try to select it
            if (roomId) {
                const roomFromUrl = fetchedRooms.find(r => String(r.id) === String(roomId));
                if (roomFromUrl) {
                    // Call handleRoomSelect logic directly
                    setSelectedRoom(roomFromUrl);
                    setMessages([]); // Clear messages before fetching new ones
                    fetchMessages(roomFromUrl.id); // Fetch historical messages
                } else {
                    console.warn(`Room ID ${roomId} from URL not found in user's rooms.`);
                }
            }

        } catch (err) {
            console.error("Error fetching chat rooms:", err);
            setError('Failed to load chat rooms.');
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                logoutUser();
            }
        } finally {
            setLoadingRooms(false);
        }
    }, [authTokens, logoutUser, roomId]); // Add roomId as dependency

    // 2. Fetch *past* messages when a room is selected
    const fetchMessages = useCallback(async (roomId) => {
        setLoadingMessages(true);
        setError('');
        try {
            const response = await axios.get(`http://127.0.0.1:8000/api/chats/${roomId}/messages/`, {
                headers: { 'Authorization': `Bearer ${authTokens.access}` }
            });
            // Set the hook's messages state with history
            setMessages(response.data.results || response.data); 
        } catch (err) {
            console.error("Error fetching messages:", err);
            setError('Failed to load messages.');
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                logoutUser();
            }
        } finally {
            setLoadingMessages(false);
        }
    }, [authTokens, logoutUser, setMessages]); // Add setMessages to dependencies

    // Initial fetch for rooms
    useEffect(() => {
        fetchRooms();
    }, [fetchRooms]);

    // 3. Handle room selection from the sidebar
    const handleRoomSelect = (room) => {
        setSelectedRoom(room); // This triggers the WebSocket hook to connect
        setMessages([]); // Clear old messages immediately
        fetchMessages(room.id); // Fetch historical messages
        // Optionally update URL, though not strictly necessary if already on /chat/
        // navigate(`/chat/${room.id}`, { replace: true });
    };

    // 4. Handle sending a message (NOW REAL)
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedRoom || !isConnected) return;
        
        // Use the hook's sendMessage function
        sendMessage(newMessage); 
        setNewMessage(''); // Clear input
    };

    // 5. Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messageListRef.current) {
            messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
    }, [messages]); // Run when hook's messages state changes

    // --- Render ---
    if (loadingRooms) return <div className="loading-message">Loading chats...</div>;
    if (error && !loadingRooms) return <div className="error-message">{error}</div>; // Show error only after room load attempt

    return (
        <div className="chat-page-container">
            <div className="chat-layout">
                {/* --- Chat List (Sidebar) --- */}
                <div className="chat-sidebar">
                    <h2 className="sidebar-title">Conversations</h2>
                    <div className="room-list">
                        {rooms.length > 0 ? (
                            rooms.map(room => (
                                <div
                                    key={room.id}
                                    className={`room-item ${selectedRoom?.id === room.id ? 'active' : ''}`}
                                    onClick={() => handleRoomSelect(room)}
                                >
                                    <span className="room-name">
                                        {/* Show other participants, not the current user */}
                                        {room.participants.filter(name => name !== user?.username).join(', ') || 'Chat'}
                                    </span>
                                    {room.last_message && (
                                        <span className="room-last-message">
                                            {room.last_message.content.substring(0, 30)}...
                                        </span>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="no-rooms-message">No conversations started yet.</p>
                        )}
                    </div>
                </div>

                {/* --- Message Area (Main) --- */}
                <div className="chat-main">
                    {selectedRoom ? (
                        <>
                            <div className="chat-header">
                                <h3>
                                    Chat with {selectedRoom.participants.filter(name => name !== user?.username).join(', ')}
                                </h3>
                                <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                                    {isConnected ? '• Connected' : '• Disconnected'}
                                </span>
                            </div>
                            <div className="message-list" ref={messageListRef}>
                                {loadingMessages ? (
                                    <p className="loading-message">Loading messages...</p>
                                ) : (
                                    // Messages now come from the useWebSocket hook
                                    messages.map(msg => (
                                        <div
                                            key={msg.id} // Use msg.id
                                            className={`message-item ${msg.sender_username === user?.username ? 'sent' : 'received'}`}
                                        >
                                            <span className="message-sender">
                                                {/* Only show sender name if it's not the current user */}
                                                {msg.sender_username !== user?.username && msg.sender_username}
                                            </span>
                                            <p className="message-content">{msg.content}</p>
                                            <span className="message-timestamp">
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                            <form className="message-input-form" onSubmit={handleSendMessage}>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={isConnected ? "Type your message..." : "Connecting..."}
                                    className="message-input"
                                    disabled={!isConnected} // Disable input if not connected
                                />
                                <button type="submit" className="send-button" disabled={!isConnected}>Send</button>
                            </form>
                        </>
                    ) : (
                        <div className="no-room-selected">
                            <p>Select a conversation to start chatting.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ChatPage;