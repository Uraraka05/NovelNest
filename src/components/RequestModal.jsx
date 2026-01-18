import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { X, BookPlus, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RequestModal({ session, onClose }) {
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!session) return toast.error("Please login to request books")
    
    setLoading(true)
    const { error } = await supabase.from('book_requests').insert({
      user_id: session.user.id,
      title,
      author
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Request sent to Admin!")
      onClose()
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-fadeIn">
        
        {/* Header */}
        <div className="bg-purple-600 p-4 flex justify-between items-center text-white">
          <h2 className="font-bold flex items-center gap-2">
            <BookPlus className="w-5 h-5" /> Request a Book
          </h2>
          <button onClick={onClose} className="hover:bg-purple-700 p-1 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
            Can't find what you're looking for? Let us know and we'll upload it!
          </p>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">Book Title</label>
            <input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g. The Hobbit"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">Author</label>
            <input 
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g. J.R.R. Tolkien"
              required
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition flex justify-center items-center"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Submit Request'}
          </button>
        </form>
      </div>
    </div>
  )
}