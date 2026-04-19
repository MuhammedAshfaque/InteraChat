
import { useState } from 'react';

const API = import.meta.env.VITE_BACKEND_URL;

//  Safe fetch helper
const fetchJSON = async (url, options = {}) => {
  const res = await fetch(url, options);
  const text = await res.text();

  if (!res.ok) {
    let message = 'Request failed';
    try {
      message = JSON.parse(text).message || message;
    } catch {
      console.error("Non-JSON error:", text);
    }
    throw new Error(message);
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("Invalid JSON:", text);
    throw new Error("Invalid server response");
  }
};

export default function AuthView({ login }) {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');

  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const [signupUser, setSignupUser] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPass, setSignupPass] = useState('');

  // ✅ LOGIN
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const data = await fetchJSON(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, password: loginPass })
      });

      login(data.token, data.user);
    } catch (err) {
      setError(err.message);
    }
  };

  // ✅ SIGNUP
  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const data = await fetchJSON(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: signupUser,
          email: signupEmail,
          password: signupPass
        })
      });

      login(data.token, data.user);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      {isLogin ? (
        <div>
          <h2>Welcome Back</h2>
          {error && <div className="error-msg">{error}</div>}

          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Email or Username"
              required
              value={loginId}
              onChange={e => setLoginId(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              required
              value={loginPass}
              onChange={e => setLoginPass(e.target.value)}
            />

            <button type="submit">Log In</button>
          </form>

          <p onClick={() => setIsLogin(false)}>Sign Up</p>
        </div>
      ) : (
        <div>
          <h2>Create Account</h2>
          {error && <div className="error-msg">{error}</div>}

          <form onSubmit={handleSignup}>
            <input
              type="text"
              placeholder="Username"
              required
              value={signupUser}
              onChange={e => setSignupUser(e.target.value)}
            />

            <input
              type="email"
              placeholder="Email"
              required
              value={signupEmail}
              onChange={e => setSignupEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              required
              value={signupPass}
              onChange={e => setSignupPass(e.target.value)}
            />

            <button type="submit">Sign Up</button>
          </form>

          <p onClick={() => setIsLogin(true)}>Log In</p>
        </div>
      )}
    </div>
  );
}
