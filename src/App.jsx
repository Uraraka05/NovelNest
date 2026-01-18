import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import BookDetails from './pages/BookDetails'
import MyLibrary from './pages/MyLibrary'
import Admin from './pages/Admin'
import Profile from './pages/Profile'
import AdminRoute from './components/AdminRoute'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark'
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Apply Dark Mode Class to HTML tag
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-purple-600 bg-gray-50 dark:bg-gray-900">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-300">
      <Toaster position="top-center" toastOptions={{ className: 'dark:bg-gray-800 dark:text-white' }} />
      
      {/* Pass toggle function to Navbar */}
      <Navbar session={session} darkMode={darkMode} setDarkMode={setDarkMode} />
      
      <Routes>
        <Route path="/" element={<Home session={session} />} />
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        <Route path="/book/:id" element={<BookDetails session={session} />} />
        <Route path="/profile" element={session ? <Profile session={session} /> : <Navigate to="/login" />} />
        <Route path="/my-library" element={session ? <MyLibrary session={session} /> : <Navigate to="/login" />} />
        <Route path="/admin" element={<AdminRoute session={session}><Admin /></AdminRoute>} />
      </Routes>
    </div>
  )
}