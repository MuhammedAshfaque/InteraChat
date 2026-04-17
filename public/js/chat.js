const token = localStorage.getItem('token');
let currentUser = null;
try {
  currentUser = JSON.parse(localStorage.getItem('user'));
} catch (e) {}

if (!token || !currentUser) {
  window.location.href = '/';
}

const socket = io({
  auth: { token }
});

let activeChat = null; // { type: 'user' | 'group', id: string, name: string }
let allUsers = [];

socket.on('connect', () => {
  socket.emit('join', currentUser.id);
});

// UI Elements
const currentUsernameEl = document.getElementById('current-username');
const userListEl = document.getElementById('user-list');
const groupListEl = document.getElementById('group-list');
const logoutBtn = document.getElementById('logout-btn');
const emptyChatState = document.getElementById('empty-chat-state');
const activeChatContainer = document.getElementById('active-chat-container');
const chatHeaderName = document.getElementById('chat-header-name');
const chatHeaderAvatar = document.getElementById('chat-header-avatar');
const messagesContainer = document.getElementById('messages-container');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const imageUploadInput = document.getElementById('image-upload-input');
const triggerUploadBtn = document.getElementById('trigger-upload-btn');

// Modal Elements
const createGroupBtn = document.getElementById('create-group-btn');
const createGroupModal = document.getElementById('create-group-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const confirmCreateGroupBtn = document.getElementById('confirm-create-group-btn');
const newGroupNameInput = document.getElementById('new-group-name');
const groupMembersSelect = document.getElementById('group-members-select');

const authHeaders = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

currentUsernameEl.textContent = currentUser.username;

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
});

async function loadSidebar() {
  try {
    const [usersRes, groupsRes] = await Promise.all([
      fetch('/api/chat/users', { headers: authHeaders }),
      fetch('/api/chat/groups', { headers: authHeaders })
    ]);

    allUsers = await usersRes.json();
    const groups = await groupsRes.json();

    renderUsers(allUsers);
    renderGroups(groups);
  } catch (err) {
    console.error('Error loading sidebar data', err);
  }
}

function renderUsers(users) {
  userListEl.innerHTML = '';
  users.forEach(user => {
    const currentUsername = user.username;
    
    const li = document.createElement('li');
    li.className = 'list-item';
    li.dataset.id = user._id;
    li.innerHTML = `
      <div class="avatar">${currentUsername.charAt(0).toUpperCase()}</div>
      <div class="item-name">${currentUsername}</div>
    `;
    li.addEventListener('click', () => openChat('user', user._id, currentUsername));
    userListEl.appendChild(li);
  });
}

function renderGroups(groups) {
  groupListEl.innerHTML = '';
  groups.forEach(group => {
    socket.emit('join_group', group._id);

    const li = document.createElement('li');
    li.className = 'list-item';
    li.dataset.id = group._id;
    li.innerHTML = `
      <div class="avatar group-avatar">G</div>
      <div class="item-name">${group.name}</div>
    `;
    li.addEventListener('click', () => openChat('group', group._id, group.name));
    groupListEl.appendChild(li);
  });
}

async function openChat(type, id, name) {
  activeChat = { type, id, name };
  
  document.querySelectorAll('.list-item').forEach(el => el.classList.remove('active'));
  const activeItem = document.querySelector(`.list-item[data-id="${id}"]`);
  if (activeItem) activeItem.classList.add('active');

  emptyChatState.classList.add('hidden');
  activeChatContainer.classList.remove('hidden');
  activeChatContainer.style.display = 'flex';

  chatHeaderName.textContent = name;
  chatHeaderAvatar.textContent = type === 'group' ? 'G' : name.charAt(0).toUpperCase();

  messagesContainer.innerHTML = '';
  const endpoint = type === 'user' ? `/api/chat/messages/${id}` : `/api/chat/group-messages/${id}`;
  
  try {
    const res = await fetch(endpoint, { headers: authHeaders });
    const messages = await res.json();
    messages.forEach(appendMessage);
    scrollToBottom();
  } catch (err) {
    console.error('Error loading messages', err);
  }
}

function appendMessage(msg) {
  if (activeChat) {
    if (activeChat.type === 'user') {
      const isRelevant = 
        (msg.sender._id === activeChat.id && msg.receiver === currentUser.id) ||
        (msg.sender._id === currentUser.id && msg.receiver === activeChat.id) ||
        (msg.sender === activeChat.id && msg.receiver === currentUser.id) ||
        (msg.sender === currentUser.id && msg.receiver === activeChat.id);
      
      if (!isRelevant) return;
    } else if (activeChat.type === 'group') {
      if (msg.groupId !== activeChat.id) return;
    }
  } else {
    return;
  }

  const isMe = typeof msg.sender === 'object' ? msg.sender._id === currentUser.id : msg.sender === currentUser.id;
  const senderName = typeof msg.sender === 'object' ? msg.sender.username : (isMe ? currentUser.username : 'User');
  
  const div = document.createElement('div');
  div.className = `message ${isMe ? 'sent' : 'received'}`;
  
  const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

  let headerHtml = '';
  if (!isMe && activeChat.type === 'group') {
    headerHtml = `<div class="message-sender">${senderName}</div>`;
  }

  let textHtml = msg.messageText ? `<div class="message-text">${msg.messageText}</div>` : '';
  let imageHtml = msg.imageUrl ? `<img src="${msg.imageUrl}" class="message-image" alt="Shared photo" />` : '';

  div.innerHTML = `
    ${headerHtml}
    ${imageHtml}
    ${textHtml}
    <span class="message-time">${timeStr}</span>
  `;
  
  messagesContainer.appendChild(div);
  scrollToBottom();
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Image upload logic
let selectedImageFile = null;

triggerUploadBtn.addEventListener('click', () => {
  imageUploadInput.click();
});

imageUploadInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    selectedImageFile = e.target.files[0];
    triggerUploadBtn.style.color = 'var(--accent-color)';
    triggerUploadBtn.style.background = 'rgba(88, 166, 255, 0.2)';
  } else {
    selectedImageFile = null;
    triggerUploadBtn.style.color = '';
    triggerUploadBtn.style.background = 'rgba(255,255,255,0.05)';
  }
});

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!activeChat) return;

  const text = messageInput.value.trim();
  if (!text && !selectedImageFile) return;

  let imageUrl = null;

  // If there's an image, upload it first
  if (selectedImageFile) {
    const formData = new FormData();
    formData.append('image', selectedImageFile);

    try {
      const res = await fetch('/api/chat/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type here, let the browser set it with the boundary
        },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        imageUrl = data.imageUrl;
      } else {
        alert('Image upload failed: ' + data.message);
        return;
      }
    } catch (err) {
      console.error('Upload Error:', err);
      alert('Error uploading image');
      return;
    }
  }

  // Determine socket endpoint and emit message data
  if (activeChat.type === 'user') {
    socket.emit('private_message', {
      senderId: currentUser.id,
      receiverId: activeChat.id,
      messageText: text,
      imageUrl
    });
  } else {
    socket.emit('group_message', {
      senderId: currentUser.id,
      groupId: activeChat.id,
      messageText: text,
      imageUrl
    });
  }

  // Reset form
  messageInput.value = '';
  imageUploadInput.value = '';
  selectedImageFile = null;
  triggerUploadBtn.style.color = '';
  triggerUploadBtn.style.background = 'rgba(255,255,255,0.05)';
  messageInput.focus();
});

socket.on('receive_message', (msg) => {
  appendMessage(msg);
});

socket.on('troll_alert', (msg) => {
  alert(msg);
});

socket.on('troll_error', (msg) => {
  alert(msg);
});

createGroupBtn.addEventListener('click', () => {
  createGroupModal.classList.add('active');
  newGroupNameInput.value = '';
  
  groupMembersSelect.innerHTML = '';
  allUsers.forEach(user => {
    const label = document.createElement('label');
    label.className = 'member-option';
    label.innerHTML = `
      <input type="checkbox" value="${user._id}">
      <span>${user.username}</span>
    `;
    groupMembersSelect.appendChild(label);
  });
});

closeModalBtn.addEventListener('click', () => {
  createGroupModal.classList.remove('active');
});

confirmCreateGroupBtn.addEventListener('click', async () => {
  const name = newGroupNameInput.value.trim();
  if (!name) return alert('Group name required');

  const checkboxes = groupMembersSelect.querySelectorAll('input[type="checkbox"]:checked');
  const members = Array.from(checkboxes).map(cb => cb.value);

  if (members.length === 0) return alert('Select at least one member');

  try {
    const res = await fetch('/api/chat/groups', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name, members })
    });
    
    if (res.ok) {
      createGroupModal.classList.remove('active');
      loadSidebar();
    }
  } catch (err) {
    console.error('Failed to create group', err);
  }
});

loadSidebar();
