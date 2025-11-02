// In src/hooks/useWebSocket.js
import { useState, useEffect, useRef } from 'react';

function useWebSocket(roomId, token) {
    const [messages, setMessages] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const webSocket = useRef(null);

    useEffect(() => {
        if (!roomId || !token) {
            return; // Don't connect if no room or token
        }

        // Close any existing connection
        if (webSocket.current) {
            webSocket.current.close();
        }

        // Create new WebSocket connection
        const wsUrl = `ws://127.0.0.1:8000/ws/chat/${roomId}/?token=${token}`;
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log(`WebSocket connected to room ${roomId}`);
            setIsConnected(true);
        };

        socket.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                // We expect a single message object from our consumer
                if (data.id && data.content) {
                    setMessages(prevMessages => [...prevMessages, data]);
                } else {
                    console.warn("Received non-message WebSocket data:", data);
                }
            } catch (error) {
                console.error("Failed to parse WebSocket message:", e.data, error);
            }
        };

        socket.onerror = (e) => {
            console.error("WebSocket error:", e);
            setIsConnected(false); // Set connected to false on error
        };

        socket.onclose = (e) => {
            console.log(`WebSocket disconnected from room ${roomId}`, e.code, e.reason);
            setIsConnected(false);
        };

        // Store the socket in the ref
        webSocket.current = socket;

        // Cleanup function: close the socket when component unmounts or deps change
        return () => {
            if (socket) {
                console.log(`Closing WebSocket for room ${roomId}`);
                socket.close();
                webSocket.current = null;
            }
        };
    }, [roomId, token]); // Re-run effect if room or token changes

    // Function to send a message
    const sendMessage = (message) => {
        if (webSocket.current && webSocket.current.readyState === WebSocket.OPEN) {
            webSocket.current.send(JSON.stringify({
                'message': message
            }));
        } else {
            console.error("Cannot send message: WebSocket is not open.");
        }
    };

    return { messages, setMessages, sendMessage, isConnected };
}

export default useWebSocket;