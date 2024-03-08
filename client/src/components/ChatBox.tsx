import React, { useEffect, useRef, useState } from 'react'
import { Socket } from 'socket.io-client';

interface Message {
    id: number;
    user: string;
    text: string;
}

interface ChatMessageProps {
    message: Message;
    isCurrentUser: boolean;
}

interface IChatbox {
    socketIo: Socket | null;
    username: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isCurrentUser }) => {
    const messageClass = isCurrentUser ? 'text-right' : 'text-left';
    const messageContainerClass = `mb-2 ${messageClass}`;

    return (
        <li className={messageContainerClass}>
            {isCurrentUser ? <span className="font-semibold">You:</span> : <span className="font-semibold">{message.user}:</span>} {message.text}
        </li>
    );
};

const ChatBox: React.FC<IChatbox> = ({ socketIo, username }) => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    };

    const sendMessage = () => {
        if (message.trim() !== '') {
            if (socketIo) {
                socketIo.emit('sendMessage', { user: username, text: message });
                setMessage('');
            }
        }
    };

    useEffect(() => {
        if (socketIo) {
            socketIo.on('newMessage', (data: Message) => {

                setMessages((prevMessages) => [...prevMessages, data]);
                scrollToBottom();
            });
        }
    }, [socketIo]);


    return (
        <div className="h-[100%]  w-[500px]">
            <div className="text-xl mb-1 font-semibold">ChatBox</div>
            <div className="border p-4 rounded-lg shadow-lg">
                <div
                    className="mb-4 h-100 overflow-y-auto"
                    ref={chatContainerRef}
                >
                    <ul>
                        {messages.map((msg) => (
                            <ChatMessage
                                key={msg.id}
                                message={msg}
                                isCurrentUser={msg.user === username}
                            />
                        ))}
                    </ul>
                </div>
                <div className="flex">
                    <input
                        type="text"
                        className="flex-grow border p-2 rounded-l-md"
                        placeholder="Type your message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                    <button
                        className="bg-blue-500 text-white px-4 py-2 rounded-r-md"
                        onClick={sendMessage}
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ChatBox