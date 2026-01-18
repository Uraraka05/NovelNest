import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { BookOpen, User, LogIn, Sun, Moon, BookPlus, Menu, X, ShieldCheck } from 'lucide-react'
import RequestModal from './RequestModal'

export default function Navbar({ session }) {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  
  // Theme State (Initialize based on current document class)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Sync React state with the actual HTML class on mount
    if (document.documentElement.classList.contains('dark')) {
      setIsDark(true)
    }
  }, [])

  function toggleTheme() {
    const html = document.documentElement
    if (html.classList.contains('dark')) {
      html.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setIsDark(false)
    } else {
      html.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setIsDark(true)
    }
    // Close mobile menu if open to see changes clearly
    setIsMobileMenuOpen(false) 
  }

  // Function to close menu when a link is clicked
  function closeMenu() {
    setIsMobileMenuOpen(false)
  }

  // Common Link Styles
  const linkClass = (path) => 
    `flex items-center space-x-2 px-3 py-2 rounded-lg transition font-medium ${
      location.pathname === path 
        ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400' 
        : 'text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-50 dark:hover:bg-gray-800'
    }`

  return (
    <>
      <nav className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            
            {/* --- LEFT: LOGO --- */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2 group" onClick={closeMenu}>
                <div className="bg-purple-600 text-white p-2 rounded-lg group-hover:bg-purple-700 transition shadow-lg">
                  <BookOpen className="w-6 h-6" />
                </div>
                <span className="text-2xl font-serif font-bold text-gray-800 dark:text-white tracking-tight">
                  NovelNest
                </span>
              </Link>
            </div>

            {/* --- RIGHT: DESKTOP MENU (Hidden on Mobile) --- */}
            <div className="hidden md:flex items-center space-x-4">
              <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition">
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <Link to="/" className={linkClass('/')}>Browse</Link>
              
              {session ? (
                <>
                  <button 
                    onClick={() => setShowRequestModal(true)}
                    className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 font-medium px-3 py-2 transition"
                  >
                    <BookPlus className="w-5 h-5" />
                    <span>Request</span>
                  </button>

                  <Link to="/my-library" className={linkClass('/my-library')}>
                    <span className="whitespace-nowrap">My Library</span>
                  </Link>

                  <Link to="/admin" className={linkClass('/admin')}>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin</span>
                  </Link>
                  
                  <Link to="/profile" className={linkClass('/profile')}>
                    <User className="w-5 h-5" />
                    <span>Profile</span>
                  </Link>
                </>
              ) : (
                <Link to="/login" className="bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-5 py-2.5 rounded-lg font-bold hover:opacity-90 transition shadow-md flex items-center">
                  <LogIn className="w-4 h-4 mr-2" /> Login
                </Link>
              )}
            </div>

            {/* --- RIGHT: MOBILE HAMBURGER BUTTON (Visible on Mobile) --- */}
            <div className="flex items-center md:hidden">
              <button 
                onClick={toggleTheme} 
                className="p-2 mr-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>

        {/* --- MOBILE DROPDOWN MENU --- */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-gray-800 border-t dark:border-gray-700 shadow-lg animate-fadeIn">
            <div className="px-4 pt-2 pb-6 space-y-2">
              <Link to="/" onClick={closeMenu} className={`block ${linkClass('/')}`}>Browse Library</Link>
              
              {session ? (
                <>
                  <button 
                    onClick={() => { setShowRequestModal(true); closeMenu(); }}
                    className="w-full flex items-center space-x-2 px-3 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium"
                  >
                    <BookPlus className="w-5 h-5" />
                    <span>Request a Book</span>
                  </button>

                  <Link to="/my-library" onClick={closeMenu} className={`block ${linkClass('/my-library')}`}>My Library</Link>
                  <Link to="/admin" onClick={closeMenu} className={`block ${linkClass('/admin')}`}>Admin Dashboard</Link>
                  <Link to="/profile" onClick={closeMenu} className={`block ${linkClass('/profile')}`}>My Profile</Link>
                </>
              ) : (
                <Link to="/login" onClick={closeMenu} className="block w-full text-center bg-purple-600 text-white px-4 py-3 rounded-lg font-bold mt-4">
                  Login / Signup
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* --- RENDER REQUEST MODAL --- */}
      {showRequestModal && (
        <RequestModal session={session} onClose={() => setShowRequestModal(false)} />
      )}
    </>
  )
}