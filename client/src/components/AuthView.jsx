import { useState } from 'react';

export default function AuthView({ login }) {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const [signupUser, setSignupUser] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPass, setSignupPass] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, password: loginPass })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      login(data.token, data.user);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: signupUser, email: signupEmail, password: signupPass })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Signup failed');
      login(data.token, data.user);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      {isLogin ? (
        <div id="login-section">
          <h2>Welcome Back</h2>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email or Username</label>
              <input type="text" required value={loginId} onChange={e => setLoginId(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" required value={loginPass} onChange={e => setLoginPass(e.target.value)} />
            </div>
            <button type="submit" className="btn">Log In</button>
          </form>
          <div className="auth-switch">
            Don't have an account? <a onClick={() => setIsLogin(false)}>Sign Up</a>
          </div>
        </div>
      ) : (
        <div id="signup-section">
          <h2>Create Account</h2>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={handleSignup}>
            <div className="form-group">
              <label>Username</label>
              <input type="text" required value={signupUser} onChange={e => setSignupUser(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" required value={signupEmail} onChange={e => setSignupEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" required value={signupPass} onChange={e => setSignupPass(e.target.value)} />
            </div>
            <button type="submit" className="btn">Sign Up</button>
          </form>
          <div className="auth-switch">
            Already have an account? <a onClick={() => setIsLogin(true)}>Log In</a>
          </div>
        </div>
      )}
    </div>
  );
}
