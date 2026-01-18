import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import { Trash2, BookOpen, Clock, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function MyLibrary({ session }) {
  const [libraryBooks, setLibraryBooks] = useState([])
  const [inProgressBooks, setInProgressBooks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session) fetchLibraryData()
  }, [session])

  async function fetchLibraryData() {
    // 1. Fetch "My Library" (Bookmarks)
    const { data: bookmarks } = await supabase
      .from('bookmarks')
      .select('book_id, novels(*)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    
    // 2. Fetch "Continue Reading" (Progress > 1)
    const { data: progress } = await supabase
      .from('reading_progress')
      .select('book_id, current_page, novels(*)')
      .eq('user_id', session.user.id)
      .gt('current_page', 1) // Only started books
      .order('updated_at', { ascending: false })

    if (bookmarks) setLibraryBooks(bookmarks.map(b => b.novels))
    if (progress) setInProgressBooks(progress.map(p => ({ ...p.novels, current_page: p.current_page })))
    
    setLoading(false)
  }

  async function removeFromLibrary(bookId) {
    if (!confirm("Remove from library?")) return
    const { error } = await supabase.from('bookmarks').delete().eq('user_id', session.user.id).eq('book_id', bookId)
    if (!error) {
      toast.success("Removed")
      setLibraryBooks(libraryBooks.filter(b => b.id !== bookId))
    }
  }

  if (loading) return <div className="p-20 text-center dark:text-white"><Loader2 className="animate-spin mx-auto"/></div>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* --- FEATURE 1: CONTINUE READING SHELF --- */}
        {inProgressBooks.length > 0 && (
          <div>
            <h2 className="text-2xl font-serif font-bold text-gray-800 dark:text-white mb-6 flex items-center">
              <Clock className="mr-3 text-purple-600" /> Continue Reading
            </h2>
            <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar">
              {inProgressBooks.map(book => (
                <Link key={book.id} to={`/book/${book.id}`} className="min-w-[200px] w-[200px] group">
                  <div className="relative rounded-xl overflow-hidden shadow-md h-[300px] mb-3">
                    <img src={book.cover_url} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    {/* Progress Badge */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm p-2">
                       <p className="text-white text-xs font-bold mb-1">Page {book.current_page}</p>
                       <div className="w-full bg-gray-600 rounded-full h-1.5">
                         {/* Visual estimation of progress (assuming ~300 pages avg) */}
                         <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${Math.min((book.current_page / 200) * 100, 100)}%` }}></div>
                       </div>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white truncate">{book.title}</h3>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* --- MY LIBRARY GRID --- */}
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-800 dark:text-white mb-8 flex items-center">
            <BookOpen className="mr-3 text-purple-600" /> My Library
          </h1>

          {libraryBooks.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400 mb-6">Your library is empty.</p>
              <Link to="/" className="bg-purple-600 text-white px-6 py-3 rounded-lg font-bold">Browse Books</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {libraryBooks.map(book => (
                <div key={book.id} className="flex bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition border dark:border-gray-700">
                  <div className="w-1/3 min-w-[100px]"><img src={book.cover_url} className="w-full h-full object-cover" /></div>
                  <div className="p-5 flex flex-col justify-between flex-1">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white line-clamp-2">{book.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{book.author}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                      <Link to={`/book/${book.id}`} className="flex-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-center py-2 rounded-lg text-sm font-bold">Read</Link>
                      <button onClick={() => removeFromLibrary(book.id)} className="p-2 text-gray-400 hover:text-red-500 transition"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}