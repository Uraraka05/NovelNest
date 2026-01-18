import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import { Search, Filter, Bookmark, BookmarkCheck, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import BookCardSkeleton from '../components/BookCardSkeleton' // Import Skeleton

export default function Home({ session }) {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [sortBy, setSortBy] = useState('newest') 
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set())

  // Pagination State
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const BOOKS_PER_PAGE = 10

  useEffect(() => {
    // Reset everything when filters change
    setPage(0)
    // Optional: setBooks([]) here if you want to clear the grid immediately on filter change
    // setBooks([]) 
    setHasMore(true)
    fetchBooks(false)
    if (session) fetchBookmarks()
  }, [session, sortBy, selectedGenre, searchTerm])

  async function fetchBooks(isLoadMore = false) {
    // Only show full skeleton loading on initial fetch or filter change
    if (!isLoadMore) setLoading(true)
    
    const currentPage = isLoadMore ? page : 0
    const from = currentPage * BOOKS_PER_PAGE
    const to = from + BOOKS_PER_PAGE - 1

    let query = supabase
      .from('novels')
      .select(`*, reviews (rating)`)
    
    // Search Filter
    if (searchTerm) {
      query = query.or(`title.ilike.%${searchTerm}%,author.ilike.%${searchTerm}%`)
    }

    // Genre Filter
    if (selectedGenre !== 'All') {
      query = query.eq('genre', selectedGenre)
    }

    // Sorting Logic
    if (sortBy === 'newest') query = query.order('created_at', { ascending: false })
    else if (sortBy === 'oldest') query = query.order('created_at', { ascending: true })
    else if (sortBy === 'top_rated') query = query.order('avg_rating', { ascending: false, nullsFirst: false }) // Assuming you have an avg_rating column or view
    else if (sortBy === 'alphabetical') query = query.order('title', { ascending: true })

    const { data, error } = await query.range(from, to)

    if (data) {
      if (data.length < BOOKS_PER_PAGE) setHasMore(false)

      // Calculate Ratings locally if needed
      const processed = data.map(book => {
        const totalRating = book.reviews.reduce((sum, r) => sum + r.rating, 0)
        const avgRating = book.reviews.length > 0 
          ? (totalRating / book.reviews.length).toFixed(1) 
          : null
        return { ...book, avgRating, reviewCount: book.reviews.length }
      })

      // If loading more, append. If new filter/sort, replace.
      setBooks(prev => isLoadMore ? [...prev, ...processed] : processed)
      
      // Prepare next page index
      setPage(prev => isLoadMore ? prev + 1 : 1)
    }
    setLoading(false)
  }

  async function fetchBookmarks() {
    if (!session) return
    const { data } = await supabase.from('bookmarks').select('book_id').eq('user_id', session.user.id)
    if (data) setBookmarkedIds(new Set(data.map(b => b.book_id)))
  }

  async function toggleBookmark(e, bookId) {
    e.preventDefault()
    if (!session) {
      toast.error("Please login to library!")
      return
    }

    const isBookmarked = bookmarkedIds.has(bookId)
    const newBookmarks = new Set(bookmarkedIds)
    if (isBookmarked) newBookmarks.delete(bookId)
    else newBookmarks.add(bookId)
    setBookmarkedIds(newBookmarks)

    if (isBookmarked) {
      await supabase.from('bookmarks').delete().eq('user_id', session.user.id).eq('book_id', bookId)
      toast.success("Removed from Library")
    } else {
      await supabase.from('bookmarks').insert({ user_id: session.user.id, book_id: bookId })
      toast.success("Added to Library")
    }
  }

  const genres = ['All', 'Fantasy', 'Romance', 'Thriller', 'Sci-Fi', 'Mystery', 'Horror']

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-8 transition-colors duration-300">
      
      {/* HEADER & FILTERS */}
      <div className="max-w-7xl mx-auto mb-10 space-y-6">
        <h1 className="text-4xl font-serif font-bold text-gray-800 dark:text-white">Browse Library</h1>
        
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search title, author..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border rounded-xl shadow-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white transition-colors"
            />
          </div>

          {/* Genre Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-3.5 text-gray-400 w-5 h-5" />
            <select 
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="pl-10 pr-8 py-3 border rounded-xl shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none cursor-pointer appearance-none w-full md:w-48 transition-colors"
            >
              {genres.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
             <select 
               value={sortBy}
               onChange={(e) => setSortBy(e.target.value)}
               className="px-4 py-3 border rounded-xl shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none cursor-pointer appearance-none transition-colors"
             >
               <option value="newest">Newest First</option>
               <option value="oldest">Oldest First</option>
               <option value="top_rated">Top Rated</option>
               <option value="alphabetical">A-Z</option>
             </select>
          </div>
        </div>
      </div>
      
      {/* BOOK GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
        
        {/* SKELETON LOADING STATE */}
        {loading ? (
           [...Array(10)].map((_, i) => <BookCardSkeleton key={i} />)
        ) : books.length > 0 ? (
          books.map((book) => {
            const isBookmarked = bookmarkedIds.has(book.id)
            
            return (
              <div key={book.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:-translate-y-2 transition duration-300 group relative flex flex-col border border-transparent dark:border-gray-700">
                
                {/* COVER */}
                <div className="relative h-64 overflow-hidden">
                  <img src={book.cover_url} alt={book.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  
                  <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] uppercase tracking-wider px-2 py-1 rounded backdrop-blur-md">
                    {book.genre || 'Novel'}
                  </span>

                  <button
                    onClick={(e) => toggleBookmark(e, book.id)}
                    className="absolute top-2 left-2 p-2 rounded-full bg-white/20 backdrop-blur-md hover:bg-white transition shadow-sm group/btn"
                  >
                    {isBookmarked ? <BookmarkCheck className="w-5 h-5 text-purple-500 fill-current" /> : <Bookmark className="w-5 h-5 text-white group-hover/btn:text-purple-600" />}
                  </button>
                </div>
                
                {/* DETAILS */}
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-gray-900 dark:text-white truncate">{book.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm truncate">{book.author}</p>
                  {book.series_name && (
                    <p className="text-xs text-purple-600 dark:text-purple-400 font-bold mt-1 truncate">
                    {book.series_name} #{book.series_order}
                    </p>
                  )}
                  
                  <div className="flex items-center mt-2 space-x-2">
                    <div className="flex items-center bg-yellow-50 dark:bg-yellow-900/30 px-2 py-0.5 rounded text-yellow-700 dark:text-yellow-400 text-xs font-bold border border-yellow-100 dark:border-yellow-900">
                      <Star className="w-3 h-3 fill-current mr-1" />
                      {book.avgRating ? book.avgRating : 'New'}
                    </div>
                    {book.reviewCount > 0 && <span className="text-xs text-gray-400">({book.reviewCount})</span>}
                  </div>

                  <div className="mt-auto pt-3">
                    <Link to={`/book/${book.id}`} className="block w-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-center py-2 rounded-lg text-sm font-bold hover:bg-purple-100 dark:hover:bg-purple-900/50 transition">
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="col-span-full text-center py-20 text-gray-500 dark:text-gray-400">
            No books found matching criteria.
          </div>
        )}
      </div>

      {/* LOAD MORE BUTTON */}
      {!loading && hasMore && books.length > 0 && (
        <div className="text-center mt-12 pb-8">
          <button 
            onClick={() => fetchBooks(true)} 
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-8 py-3 rounded-full font-bold shadow-md hover:scale-105 transition border border-gray-200 dark:border-gray-700"
          >
            Load More Books
          </button>
        </div>
      )}
    </div>
  )
}
