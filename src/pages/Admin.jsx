import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Trash2, Loader2, Plus, Pencil, X, User, BookOpen, Star, Check, BookPlus, Flag } from 'lucide-react' // Added Flag
import toast from 'react-hot-toast'

export default function Admin() {
  const [uploading, setUploading] = useState(false)
  const [books, setBooks] = useState([])
  const [stats, setStats] = useState({ users: 0, books: 0, reviews: 0 })
  
  // --- REQUESTS & FLAGS STATE ---
  const [requests, setRequests] = useState([])
  const [flaggedReviews, setFlaggedReviews] = useState([]) // New State for Flags
  const [reqPage, setReqPage] = useState(0)
  const [hasMoreReqs, setHasMoreReqs] = useState(true)
  const notifiedRef = useRef(false) 

  // Form State
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    title: '', author: '', genre: '', description: '', series_name: '', series_order: ''
  })

  useEffect(() => {
    fetchBooks()
    fetchRequests(false)
    fetchFlaggedReviews() // Fetch flags on mount
  }, [])

  async function fetchBooks() {
    const { data: booksData } = await supabase.from('novels').select('*').order('created_at', { ascending: false })
    setBooks(booksData || [])

    const { data: statsData } = await supabase.rpc('get_admin_stats')
    if (statsData) setStats(statsData)
  }

  // --- FETCH FLAGGED REVIEWS (Moderation) ---
  async function fetchFlaggedReviews() {
    const { data } = await supabase
      .from('review_flags')
      .select(`
        id,
        reviews (
          id,
          comment,
          rating,
          profiles (nickname)
        )
      `)
      .order('created_at', { ascending: false })

    if (data) {
      // Group flags by review ID so we don't show duplicates
      const uniqueMap = {}
      data.forEach(flag => {
        if (!flag.reviews) return // Skip if review was already deleted
        const rId = flag.reviews.id
        if (!uniqueMap[rId]) {
          uniqueMap[rId] = { ...flag.reviews, flagCount: 0, flagIds: [] }
        }
        uniqueMap[rId].flagCount += 1
        uniqueMap[rId].flagIds.push(flag.id)
      })
      setFlaggedReviews(Object.values(uniqueMap))
    }
  }

  // --- MODERATION ACTIONS ---
  async function handleDeleteReview(reviewId) {
    if(!confirm("Delete this review permanently?")) return
    const { error } = await supabase.from('reviews').delete().eq('id', reviewId)
    if (!error) {
      toast.success("Review deleted")
      // Remove from UI
      setFlaggedReviews(prev => prev.filter(r => r.id !== reviewId))
      // Optional: Update stats if needed
    } else {
      toast.error("Error deleting review")
    }
  }

  // Dismiss Flags (Keep review, but clear reports)
async function handleDismissFlags(reviewId, flagIds) {
  // 1. Delete from DB
  const { error } = await supabase.from('review_flags').delete().in('id', flagIds)
  
  if (!error) {
    toast.success("Flags dismissed")
    
    // 2. Remove from UI instantly using the Review ID (Reliable!)
    setFlaggedReviews(prev => prev.filter(review => review.id !== reviewId))
  } else {
    toast.error("Error dismissing: " + error.message)
  }
}

  // --- FETCH REQUESTS ---
  const REQS_PER_PAGE = 6

  async function fetchRequests(isLoadMore = false) {
    const from = (isLoadMore ? reqPage : 0) * REQS_PER_PAGE
    const to = from + REQS_PER_PAGE - 1

    const { data, error } = await supabase
      .from('book_requests')
      .select('*, profiles(full_name, nickname)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) console.error("Req Error:", error)

    if (data) {
      if (data.length < REQS_PER_PAGE) setHasMoreReqs(false)
      
      if (!isLoadMore && !notifiedRef.current && data.length > 0) {
        toast(`🔔 You have ${data.length} pending book requests!`, {
          icon: '📬',
          duration: 5000,
          style: { border: '1px solid #7c3aed', padding: '16px', color: '#7c3aed' },
        })
        notifiedRef.current = true
      }

      setRequests(prev => isLoadMore ? [...prev, ...data] : data)
      if (isLoadMore) setReqPage(prev => prev + 1)
      else setReqPage(1)
    }
  }

  async function handleRequestAction(id, action) {
    const toastId = toast.loading('Updating request...')
    const { error } = await supabase
      .from('book_requests')
      .update({ status: action })
      .eq('id', id)

    if (error) {
      toast.error(error.message, { id: toastId })
    } else {
      toast.success(`Request marked as ${action}`, { id: toastId })
      setRequests(requests.filter(r => r.id !== id))
    }
  }

  // --- BOOK ACTIONS ---
  async function handleDelete(id, title) {
    if (!confirm(`Delete "${title}"?`)) return
    const toastId = toast.loading('Deleting...')
    const { error } = await supabase.from('novels').delete().eq('id', id)
    
    if (error) toast.error(error.message, { id: toastId })
    else {
      toast.success("Deleted successfully", { id: toastId })
      if (editingId === id) resetForm()
      fetchBooks()
    }
  }

  function handleEditClick(book) {
    setEditingId(book.id)
    setFormData({
      title: book.title, author: book.author, genre: book.genre || '', 
      description: book.description || '', series_name: book.series_name || '', series_order: book.series_order || ''
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForm() {
    setEditingId(null)
    setFormData({ title: '', author: '', genre: '', description: '', series_name: '', series_order: '' })
    if(document.getElementById('cover-input')) document.getElementById('cover-input').value = ''
    if(document.getElementById('pdf-input')) document.getElementById('pdf-input').value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setUploading(true)
    const toastId = toast.loading('Processing...')

    const form = e.target
    const coverFile = form.cover.files[0]
    const pdfFile = form.pdf.files[0]

    try {
      let updates = {
        title: formData.title, author: formData.author, genre: formData.genre,
        description: formData.description, series_name: formData.series_name || null,
        series_order: formData.series_order ? parseInt(formData.series_order) : null,
      }

      if (coverFile) {
        const fileName = `${Date.now()}-cover-${coverFile.name}`
        await supabase.storage.from('covers').upload(fileName, coverFile)
        const { data } = supabase.storage.from('covers').getPublicUrl(fileName)
        updates.cover_url = data.publicUrl
      }

      if (pdfFile) {
        const fileName = `${Date.now()}-pdf-${pdfFile.name}`
        await supabase.storage.from('pdfs').upload(fileName, pdfFile)
        const { data } = supabase.storage.from('pdfs').getPublicUrl(fileName)
        updates.pdf_url = data.publicUrl
      }

      if (editingId) {
        const { error } = await supabase.from('novels').update(updates).eq('id', editingId)
        if (error) throw error
        toast.success('Updated successfully!', { id: toastId })
      } else {
        if (!coverFile || !pdfFile) throw new Error("Cover and PDF are required.")
        const { error } = await supabase.from('novels').insert({ ...updates, cover_url: updates.cover_url, pdf_url: updates.pdf_url })
        if (error) throw error
        toast.success('Published successfully!', { id: toastId })
      }
      resetForm()
      fetchBooks()
    } catch (error) {
      toast.error(error.message, { id: toastId })
    } finally {
      setUploading(false)
    }
  }

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-12 transition-colors duration-300">
      
      {/* --- ANALYTICS DASHBOARD --- */}
      <div className="max-w-6xl mx-auto mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-transparent dark:border-gray-700 flex items-center">
          <div className="p-4 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full mr-4"><User className="w-8 h-8" /></div>
          <div><p className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase">Total Users</p><h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.users}</h3></div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-transparent dark:border-gray-700 flex items-center">
          <div className="p-4 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full mr-4"><BookOpen className="w-8 h-8" /></div>
          <div><p className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase">Total Books</p><h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.books}</h3></div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-transparent dark:border-gray-700 flex items-center">
          <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 rounded-full mr-4"><Star className="w-8 h-8" /></div>
          <div><p className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase">Total Reviews</p><h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.reviews}</h3></div>
        </div>
      </div>
      
      {/* --- BOOK REQUESTS SECTION --- */}
      {requests.length > 0 && (
        <div className="max-w-6xl mx-auto mb-12 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-transparent dark:border-gray-700 animate-fadeIn">
          <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white flex items-center">
            <BookPlus className="mr-2 text-purple-600" /> Pending Book Requests ({requests.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requests.map(req => (
              <div key={req.id} className="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-gray-800 dark:text-white text-lg">{req.title}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">by {req.author}</p>
                  <p className="text-xs text-purple-500 font-semibold mb-4">
                    Req by: {req.profiles?.nickname || 'User'}
                  </p>
                </div>
                <div className="flex gap-2 mt-auto">
                  <button onClick={() => handleRequestAction(req.id, 'completed')} className="flex-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 py-2 rounded-lg text-sm font-bold hover:bg-green-200 transition flex justify-center items-center"><Check className="w-4 h-4 mr-1" /> Done</button>
                  <button onClick={() => handleRequestAction(req.id, 'rejected')} className="flex-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 py-2 rounded-lg text-sm font-bold hover:bg-red-200 transition flex justify-center items-center"><X className="w-4 h-4 mr-1" /> Reject</button>
                </div>
              </div>
            ))}
          </div>
          {hasMoreReqs && (
            <div className="mt-6 text-center">
              <button onClick={() => fetchRequests(true)} className="text-purple-600 hover:text-purple-700 font-bold text-sm">Load More Requests</button>
            </div>
          )}
        </div>
      )}

      {/* --- MODERATION QUEUE (NEW) --- */}
      {flaggedReviews.length > 0 && (
        <div className="max-w-6xl mx-auto mb-12 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-red-100 dark:border-red-900/30">
          <h2 className="text-xl font-bold mb-4 text-red-600 dark:text-red-400 flex items-center">
            <Flag className="mr-2" /> Moderation Queue ({flaggedReviews.length})
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {flaggedReviews.map(item => (
              <div key={item.id} className="p-4 border border-red-100 dark:border-red-900/30 rounded-lg bg-red-50 dark:bg-red-900/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <p className="font-bold text-gray-800 dark:text-white">
                    "{item.comment}" 
                    <span className="text-xs font-normal text-gray-500 ml-2">by {item.profiles?.nickname || 'User'}</span>
                  </p>
                  <p className="text-xs text-red-500 font-bold mt-1">Reported {item.flagCount} times</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button 
                    onClick={() => handleDismissFlags(item.id, item.flagIds)}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-300 transition"
                  >
                  Ignore
                  </button>
                  <button 
                    onClick={() => handleDeleteReview(item.id)}
                    className="flex-1 md:flex-none px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
                  >
                    Delete Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- MAIN GRID (Upload & Manage) --- */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md h-fit relative border border-transparent dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center text-gray-900 dark:text-white">
              {editingId ? <><Pencil className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" /> Edit Novel</> : <><Plus className="w-6 h-6 mr-2 text-purple-600 dark:text-purple-400" /> Upload New</>}
            </h2>
            {editingId && <button onClick={resetForm} className="text-sm text-gray-500 hover:text-red-500 flex items-center"><X className="w-4 h-4 mr-1" /> Cancel</button>}
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <input name="title" value={formData.title} onChange={handleChange} placeholder="Book Title" required className="w-full p-3 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-purple-500" />
            <div className="grid grid-cols-2 gap-4">
              <input name="author" value={formData.author} onChange={handleChange} placeholder="Author" required className="w-full p-3 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-purple-500" />
              <select name="genre" value={formData.genre} onChange={handleChange} className="w-full p-3 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-purple-500" required>
                <option value="" disabled>Select Genre</option>
                <option value="Fantasy">Fantasy</option>
                <option value="Romance">Romance</option>
                <option value="Thriller">Thriller</option>
                <option value="Sci-Fi">Sci-Fi</option>
                <option value="Mystery">Mystery</option>
                <option value="Horror">Horror</option>
              </select>
            </div>
            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Synopsis..." className="w-full p-3 border rounded-lg h-32 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-purple-500" required></textarea>
            <div className="grid grid-cols-3 gap-4">
              <input name="series_name" value={formData.series_name} onChange={handleChange} placeholder="Series Name (Optional)" className="col-span-2 w-full p-3 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-purple-500" />
              <input name="series_order" type="number" value={formData.series_order} onChange={handleChange} placeholder="Vol #" className="w-full p-3 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
              <div><label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">{editingId ? 'Change Cover' : 'Cover Image'}</label><input id="cover-input" type="file" name="cover" accept="image/*" required={!editingId} className="text-sm w-full dark:text-gray-300" /></div>
              <div><label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">{editingId ? 'Change PDF' : 'PDF File'}</label><input id="pdf-input" type="file" name="pdf" accept="application/pdf" required={!editingId} className="text-sm w-full dark:text-gray-300" /></div>
            </div>
            <button disabled={uploading} className={`w-full text-white py-3 rounded-lg font-bold transition flex justify-center items-center ${editingId ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600' : 'bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700'}`}>{uploading ? <Loader2 className="animate-spin" /> : (editingId ? 'Save Changes' : 'Publish Novel')}</button>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md border border-transparent dark:border-gray-700 h-fit">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Manage Library ({books.length})</h2>
          <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
            {books.map(book => (
              <div key={book.id} className={`flex items-center justify-between p-4 border rounded-lg transition ${editingId === book.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                <div className="flex items-center space-x-4">
                  <img src={book.cover_url} className="w-12 h-16 object-cover rounded shadow-sm" alt="cover" />
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 dark:text-white truncate">{book.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{book.author}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => handleEditClick(book)} className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition"><Pencil className="w-5 h-5" /></button>
                  <button onClick={() => handleDelete(book.id, book.title)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}