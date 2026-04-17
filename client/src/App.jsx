import { useState } from 'react'
import AuthView from './components/AuthView'
import ChatDashboard from './components/ChatDashboard'
import './index.css' // Import global CSS

function App() {
  const [session, setSession] = useState({
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user') || 'null')
  })

  const login = (token, user) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setSession({ token, user })
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setSession({ token: null, user: null })
  }

  return (
    <>
      {session.token && session.user ? (
        <ChatDashboard session={session} logout={logout} />
      ) : (
        <AuthView login={login} />
      )}
    </>
  )
}

export default App
