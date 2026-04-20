import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { LogOut, Plus, Image as ImageIcon, Send, ChevronLeft } from 'lucide-react';

export default function ChatDashboard({ session, logout }) {
  const [socket, setSocket] = useState(null);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeChat, setActiveChat] = useState(null); // { type: 'user' | 'group', id, name }
  const [messages, setMessages] = useState([]);
  
  // UI States
  const [messageText, setMessageText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const authHeaders = {
    'Authorization': `Bearer ${session.token}`,
    'Content-Type': 'application/json'
  };

  useEffect(() => {
    const newSocket = io({
      auth: { token: session.token }
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join', session.user.id);
    });

    return () => newSocket.close();
  }, [session]);

  useEffect(() => {
    // Load sidebar
    const loadSidebar = async () => {
      try {
        const [usersRes, groupsRes] = await Promise.all([
          fetch('/api/chat/users', { headers: authHeaders }),
          fetch('/api/chat/groups', { headers: authHeaders })
        ]);
        const fetchedUsers = await usersRes.json();
        const fetchedGroups = await groupsRes.json();
        setUsers(fetchedUsers);
        setGroups(fetchedGroups);
      } catch (err) {
        console.error('Error loading sidebar data', err);
      }
    };
    loadSidebar();
  }, []);

  useEffect(() => {
    if (socket && groups.length > 0) {
      groups.forEach(g => socket.emit('join_group', g._id));
    }
  }, [groups, socket]);

  useEffect(() => {
    if (!socket) return;
    
    socket.on('receive_message', (msg) => {
      // Very basic check, in production you should use functional state update properly checking active user
      setMessages(prev => [...prev, msg]);
    });

    socket.on('troll_alert', (msg) => alert(msg));
    socket.on('troll_error', (msg) => alert(msg));

    return () => {
      socket.off('receive_message');
      socket.off('troll_alert');
      socket.off('troll_error');
    }
  }, [socket]);

  useEffect(() => {
    if (messagesEndRef.current && messagesEndRef.current.parentElement) {
      const container = messagesEndRef.current.parentElement;
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const openChat = async (type, id, name) => {
    setActiveChat({ type, id, name });
    const endpoint = type === 'user' ? `/api/chat/messages/${id}` : `/api/chat/group-messages/${id}`;
    try {
      const res = await fetch(endpoint, { headers: authHeaders });
      const msgs = await res.json();
      setMessages(msgs);
    } catch (err) {
      console.error('Error loading messages', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!activeChat) return;

    if (!messageText.trim() && !selectedImage) return;

    let imageUrl = null;
    if (selectedImage) {
      const formData = new FormData();
      formData.append('image', selectedImage);
      try {
        const res = await fetch('/api/chat/upload-image', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.token}` },
          body: formData
        });
        const data = await res.json();
        if (res.ok) {
          imageUrl = data.imageUrl;
        } else {
          return alert('Image upload failed: ' + data.message);
        }
      } catch (err) {
        console.error('Upload Error:', err);
        return alert('Error uploading image');
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
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  // Ensure message belongs to current chat
  const filterMessages = () => {
    if(!activeChat) return [];
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

  // Group Create Modal Component (inline for simplicity but can be separated)
  const CreateGroupModal = () => {
    const [name, setName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState(new Set());

    const toggleMember = (id) => {
      const newSel = new Set(selectedMembers);
      if (newSel.has(id)) newSel.delete(id);
      else newSel.add(id);
      setSelectedMembers(newSel);
    };

    const confirmCreate = async () => {
      if (!name) return alert('Group name required');
      if (selectedMembers.size === 0) return alert('Select at least one member');

      try {
        const res = await fetch('/api/chat/groups', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ name, members: Array.from(selectedMembers) })
        });
        if (res.ok) {
          setIsModalOpen(false);
          // reload groups list
          fetch('/api/chat/groups', { headers: authHeaders })
            .then(r => r.json())
            .then(setGroups);
        }
      } catch (err) {
        console.error('Failed to create group', err);
      }
    }

    return (
      <div className={`modal ${isModalOpen ? 'active' : ''}`}>
        <div className="modal-content">
          <h3>Create New Group</h3>
          <div className="form-group">
            <label>Group Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Study Group" required />
          </div>
          <div className="form-group">
            <label>Select Members</label>
            <div className="select-members">
              {users.map(u => (
                <label key={u._id} className="member-option">
                  <input type="checkbox" checked={selectedMembers.has(u._id)} onChange={() => toggleMember(u._id)} />
                  <span>{u.username}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={confirmCreate}>Create</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`chat-app ${activeChat ? 'chat-active' : ''}`}>
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>{session.user.username}</h3>
          <div className="sidebar-actions">
            <button className="btn-icon" title="New Group" onClick={() => setIsModalOpen(true)}>
              <Plus />
            </button>
            <button className="btn-icon logout-btn" title="Logout" onClick={logout}>
              <LogOut />
            </button>
          </div>
        </div>
        
        <div className="sidebar-content">
          <ul className="user-list">
            {users.map(u => (
              <li key={u._id} className={`list-item ${activeChat?.id === u._id ? 'active' : ''}`} onClick={() => openChat('user', u._id, u.username)}>
                <div className="avatar">{u.username.charAt(0).toUpperCase()}</div>
                <div className="item-name">{u.username}</div>
              </li>
            ))}
          </ul>

          <ul className="group-list">
            {groups.map(g => (
              <li key={g._id} className={`list-item ${activeChat?.id === g._id ? 'active' : ''}`} onClick={() => openChat('group', g._id, g.name)}>
                <div className="avatar group-avatar">G</div>
                <div className="item-name">{g.name}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="chat-area">
        {!activeChat ? (
          <div className="empty-chat">
            <h2>Select a chat</h2>
            <p>Choose a user or group to start messaging</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', minHeight: 0, overflow: 'hidden' }}>
            <div className="chat-header">
              <button className="back-btn" onClick={() => setActiveChat(null)}>
                <ChevronLeft />
              </button>
              <div className="avatar">{activeChat.type === 'group' ? 'G' : activeChat.name.charAt(0).toUpperCase()}</div>
              <div className="item-name">{activeChat.name}</div>
            </div>
            
            <div className="messages">
              {filterMessages().map((msg, i) => {
                const isMe = typeof msg.sender === 'object' ? msg.sender._id === session.user.id : msg.sender === session.user.id;
                const senderName = typeof msg.sender === 'object' ? msg.sender.username : (isMe ? session.user.username : 'User');
                const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

                return (
                  <div key={msg._id || i} className={`message ${isMe ? 'sent' : 'received'}`}>
                    {!isMe && activeChat.type === 'group' && <div className="message-sender">{senderName}</div>}
                    {msg.imageUrl && <img src={msg.imageUrl} className="message-image" alt="Shared photo" />}
                    <div className="message-body">
                      {msg.messageText && <div className="message-text">{msg.messageText}</div>}
                      <span className="message-time">{timeStr}</span>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input" onSubmit={handleSendMessage}>
              <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={e => setSelectedImage(e.target.files[0])} />
              
              <button type="button" className="btn-icon" onClick={() => fileInputRef.current?.click()} style={{ background: selectedImage ? 'rgba(88, 166, 255, 0.2)' : 'rgba(255,255,255,0.05)', color: selectedImage ? 'var(--accent-color)' : '' }}>
                <ImageIcon />
              </button>

              <input type="text" placeholder="Type a message..." value={messageText} onChange={e => setMessageText(e.target.value)} />
              <button type="submit" className="send-btn">
                <Send />
              </button>
            </form>
          </div>
        )}
      </div>

      <CreateGroupModal />
    </div>
  );
}
