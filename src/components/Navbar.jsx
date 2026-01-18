import { Link } from 'react-router-dom'
import { useState } from 'react' // Added useState
import RequestModal from './RequestModal' // Added Import
import { BookPlus, BookOpen, Library, User, ShieldCheck, Moon, Sun } from 'lucide-react' // Added BookPlus

export default function Navbar({ session, darkMode, setDarkMode }) {
  const ADMIN_EMAIL = 'madhumithakarthikeyan2005@gmail.com'
  const isAdmin = session?.user?.email === ADMIN_EMAIL
  
  // New State for Modal
  const [showRequestModal, setShowRequestModal] = useState(false)

  return (
    <>
      <nav className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40 transition-colors duration-300">
        <div className="w-full px-6 md:px-12"> 
          <div className="flex justify-between h-20 items-center">
            
            {/* --- LEFT SIDE: LOGO --- */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-3 text-purple-600 hover:text-purple-700 transition group">
                <div className="bg-purple-100 dark:bg-purple-900/50 p-2 rounded-lg group-hover:scale-110 transition-transform">
                  <BookOpen className="w-8 h-8" />
                </div>
                <span className="font-serif font-bold text-2xl tracking-tight text-gray-900 dark:text-white">
                  NovelNest
                </span>
              </Link>
            </div>

            {/* --- RIGHT SIDE: LINKS --- */}
            <div className="flex items-center space-x-8">
              
              {/* Dark Mode Toggle */}
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition"
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
              </button>

              <Link to="/" className="text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 font-medium transition text-lg">
                Browse
              </Link>
              
              {session ? (
                <>
                  {/* REQUEST BUTTON (New Feature) */}
                  <button 
                    onClick={() => setShowRequestModal(true)}
                    className="flex items-center text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 font-medium transition text-lg"
                  >
                    <BookPlus className="w-5 h-5 mr-2" />
                    <span className="hidden sm:inline">Request</span>
                  </button>

                  <Link to="/my-library" className="flex items-center text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 font-medium transition text-lg">
                    <Library className="w-5 h-5 mr-2" />
                    <span className="hidden sm:inline">My Library</span>
                  </Link>
                  
                  {isAdmin && (
                    <Link to="/admin" className="flex items-center text-red-600 hover:text-red-700 font-bold transition bg-red-50 dark:bg-red-900/20 px-4 py-1.5 rounded-full border border-red-100 dark:border-red-900">
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Admin
                    </Link>
                  )}

                  <Link to="/profile" className="flex items-center text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 font-medium transition text-lg">
                    <User className="w-5 h-5 mr-2" />
                    <span className="hidden sm:inline">Profile</span>
                  </Link>
                </>
              ) : (
                <Link to="/login" className="bg-gray-900 dark:bg-purple-600 text-white px-6 py-2.5 rounded-full font-bold hover:bg-black dark:hover:bg-purple-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* RENDER MODAL IF OPEN */}
      {showRequestModal && (
        <RequestModal session={session} onClose={() => setShowRequestModal(false)} />
      )}
    </>
  )
}