import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { LogOut, Plus, Image as ImageIcon, Send, ChevronLeft } from 'lucide-react';

const API = import.meta.env.VITE_BACKEND_URL;

// 🔐 Safe fetch helper
const fetchJSON = async (url, options = {}) => {
  const res = await fetch(url, options);
  const text = await res.text();

  if (!res.ok) {
    console.error("API Error:", text);
    throw new Error("Request failed");
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("Invalid JSON:", text);
    throw err;
  }
};

export default function ChatDashboard({ session, logout }) {
  const [socket, setSocket] = useState(null);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);

  const [messageText, setMessageText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const authHeaders = {
    Authorization: `Bearer ${session.token}`,
    'Content-Type': 'application/json'
  };

  // ✅ SOCKET FIX
  useEffect(() => {
    const newSocket = io(API, {
      auth: { token: session.token },
      transports: ['websocket']
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join', session.user.id);
    });

    return () => newSocket.close();
  }, [session]);

  // ✅ LOAD SIDEBAR
  useEffect(() => {
    const loadSidebar = async () => {
      try {
        const [users, groups] = await Promise.all([
          fetchJSON(`${API}/api/chat/users`, { headers: authHeaders }),
          fetchJSON(`${API}/api/chat/groups`, { headers: authHeaders })
        ]);
        setUsers(users);
        setGroups(groups);
      } catch (err) {
        console.error('Sidebar error:', err);
      }
    };
    loadSidebar();
  }, []);

  // ✅ JOIN GROUPS
  useEffect(() => {
    if (socket && groups.length > 0) {
      groups.forEach(g => socket.emit('join_group', g._id));
    }
  }, [groups, socket]);

  // ✅ RECEIVE MESSAGE
  useEffect(() => {
    if (!socket) return;

    socket.on('receive_message', msg => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.off('receive_message');
    };
  }, [socket]);

  // ✅ AUTO SCROLL
  useEffect(() => {
    if (messagesEndRef.current?.parentElement) {
      const container = messagesEndRef.current.parentElement;
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  // ✅ OPEN CHAT
  const openChat = async (type, id, name) => {
    setActiveChat({ type, id, name });

    const endpoint =
      type === 'user'
        ? `${API}/api/chat/messages/${id}`
        : `${API}/api/chat/group-messages/${id}`;

    try {
      const msgs = await fetchJSON(endpoint, { headers: authHeaders });
      setMessages(msgs);
    } catch (err) {
      console.error('Message load error:', err);
    }
  };

  // ✅ SEND MESSAGE
  const handleSendMessage = async e => {
    e.preventDefault();
    if (!activeChat) return;
    if (!messageText.trim() && !selectedImage) return;

    let imageUrl = null;

    if (selectedImage) {
      const formData = new FormData();
      formData.append('image', selectedImage);

      try {
        const res = await fetch(`${API}/api/chat/upload-image`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.token}` },
          body: formData
        });

        const text = await res.text();
        if (!res.ok) {
          console.error(text);
          return alert('Upload failed');
        }

        imageUrl = JSON.parse(text).imageUrl;
      } catch (err) {
        console.error('Upload error:', err);
        return;
      }
    }

    if (activeChat.type === 'user') {
      socket.emit('private_message', {
        senderId: session.user.id,
        receiverId: activeChat.id,
        messageText: messageText.trim(),
        imageUrl
      });
    } else {
      socket.emit('group_message', {
        senderId: session.user.id,
        groupId: activeChat.id,
        messageText: messageText.trim(),
        imageUrl
      });
    }

    setMessageText('');
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filterMessages = () => {
    if (!activeChat) return [];

    return messages.filter(msg => {
      if (activeChat.type === 'user') {
        return (
          (msg.sender?._id === activeChat.id && msg.receiver === session.user.id) ||
          (msg.sender?._id === session.user.id && msg.receiver === activeChat.id) ||
          (msg.sender === activeChat.id && msg.receiver === session.user.id) ||
          (msg.sender === session.user.id && msg.receiver === activeChat.id)
        );
      } else {
        return msg.groupId === activeChat.id;
      }
    });
  };

  return (
    <div className={`chat-app ${activeChat ? 'chat-active' : ''}`}>
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>{session.user.username}</h3>
          <button onClick={logout}><LogOut /></button>
        </div>

        <ul>
          {users.map(u => (
            <li key={u._id} onClick={() => openChat('user', u._id, u.username)}>
              {u.username}
            </li>
          ))}
        </ul>

        <ul>
          {groups.map(g => (
            <li key={g._id} onClick={() => openChat('group', g._id, g.name)}>
              {g.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="chat-area">
        {!activeChat ? (
          <h2>Select a chat</h2>
        ) : (
          <>
            <div className="messages">
              {filterMessages().map((msg, i) => (
                <div key={i}>{msg.messageText}</div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage}>
              <input
                type="text"
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
              />
              <button type="submit"><Send /></button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
