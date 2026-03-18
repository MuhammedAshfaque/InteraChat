const loginSection = document.getElementById('login-section');
const signupSection = document.getElementById('signup-section');
const showSignupBtn = document.getElementById('show-signup');
const showLoginBtn = document.getElementById('show-login');

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');

const loginError = document.getElementById('login-error');
const signupError = document.getElementById('signup-error');

// Redirect if already logged in
if (localStorage.getItem('token')) {
  window.location.href = '/chat.html';
}

showSignupBtn.addEventListener('click', () => {
  loginSection.classList.add('hidden');
  signupSection.classList.remove('hidden');
  signupError.classList.add('hidden');
});

showLoginBtn.addEventListener('click', () => {
  signupSection.classList.add('hidden');
  loginSection.classList.remove('hidden');
  loginError.classList.add('hidden');
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const loginId = document.getElementById('login-id').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.location.href = '/chat.html';
  } catch (err) {
    loginError.textContent = err.message;
    loginError.classList.remove('hidden');
  }
});

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('signup-username').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Signup failed');

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.location.href = '/chat.html';
  } catch (err) {
    signupError.textContent = err.message;
    signupError.classList.remove('hidden');
  }
});
