import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PDFReader from '../components/PDFReader'
import { Bookmark, BookmarkCheck, Share2, Star, BookOpen, ThumbsUp, Loader2, Flag } from 'lucide-react'
import toast from 'react-hot-toast'

export default function BookDetails({ session }) {
  const { id } = useParams()
  
  // --- STATE MANAGEMENT ---
  const [book, setBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reading, setReading] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [savedPage, setSavedPage] = useState(1)

  // Feature 2: Recommendations State
  const [relatedBooks, setRelatedBooks] = useState([]) 
  
  // NEW: Series State
  const [seriesBooks, setSeriesBooks] = useState([])

  // Feature 4: Advanced Reviews State (Pagination + Likes)
  const [reviews, setReviews] = useState([])
  const [reviewPage, setReviewPage] = useState(0)
  const [hasMoreReviews, setHasMoreReviews] = useState(true)
  const [likedReviews, setLikedReviews] = useState(new Set())
  const [loadingReviews, setLoadingReviews] = useState(false)

  // Review Form State
  const [newComment, setNewComment] = useState('')
  const [newRating, setNewRating] = useState(5)
  const [submittingReview, setSubmittingReview] = useState(false)

  const REVIEWS_PER_PAGE = 5

  // --- INITIAL DATA FETCHING ---
  useEffect(() => {
    window.scrollTo(0, 0)
    fetchBookData()
  }, [id, session])

  async function fetchBookData() {
    setLoading(true)
    
    // 1. Fetch Current Book
    const { data: bookData } = await supabase.from('novels').select('*').eq('id', id).single()
    setBook(bookData)

    if (bookData) {
      // 2a. NEW: Fetch Series Books
      if (bookData.series_name) {
        const { data: sBooks } = await supabase
          .from('novels')
          .select('id, title, cover_url, series_order, series_name')
          .eq('series_name', bookData.series_name)
          .neq('id', id) // Don't show current book
          .order('series_order', { ascending: true })

        setSeriesBooks(sBooks || [])
      }

      // 2b. Fetch Related Books (Recommendations) - Same Genre, different series usually preferred, but simple genre match here
      const { data: related } = await supabase
        .from('novels')
        .select('id, title, cover_url, author')
        .eq('genre', bookData.genre) 
        .neq('id', id)              
        .limit(4)                   
      setRelatedBooks(related || [])
    }

    // 3. Fetch Initial Reviews
    fetchReviews(false)

    // 4. Check Bookmark & Progress
    if (session?.user) {
      const { data: bm } = await supabase.from('bookmarks').select('*').eq('user_id', session.user.id).eq('book_id', id).maybeSingle()
      setIsBookmarked(!!bm)
      
      const { data: prog } = await supabase.from('reading_progress').select('current_page').eq('user_id', session.user.id).eq('book_id', id).maybeSingle()
      if (prog) setSavedPage(prog.current_page)
    }
    setLoading(false)
  }

  // --- REVIEW FETCHING LOGIC ---
  async function fetchReviews(isLoadMore = false) {
    if (!isLoadMore) {
       setReviews([])
       setReviewPage(0)
    }
    setLoadingReviews(true)

    const from = (isLoadMore ? reviewPage : 0) * REVIEWS_PER_PAGE
    const to = from + REVIEWS_PER_PAGE - 1

    const { data } = await supabase
      .from('reviews')
      .select(`
        *, 
        profiles(nickname, full_name, avatar_url),
        review_likes(count)
      `)
      .eq('book_id', id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (data) {
      if (data.length < REVIEWS_PER_PAGE) setHasMoreReviews(false)
      else setHasMoreReviews(true)

      if (session) {
        const reviewIds = data.map(r => r.id)
        if (reviewIds.length > 0) {
          const { data: myLikes } = await supabase
            .from('review_likes')
            .select('review_id')
            .eq('user_id', session.user.id)
            .in('review_id', reviewIds)
          
          const newLikedSet = new Set(isLoadMore ? likedReviews : [])
          myLikes?.forEach(l => newLikedSet.add(l.review_id))
          setLikedReviews(newLikedSet)
        }
      }

      setReviews(prev => isLoadMore ? [...prev, ...data] : data)
      if (isLoadMore) setReviewPage(prev => prev + 1)
      else setReviewPage(1)
    }
    setLoadingReviews(false)
  }

  // --- ACTIONS ---

  async function toggleReviewLike(reviewId) {
    if (!session) return toast.error("Login to like reviews")
    
    const isLiked = likedReviews.has(reviewId)
    const newSet = new Set(likedReviews)
    if (isLiked) newSet.delete(reviewId)
    else newSet.add(reviewId)
    setLikedReviews(newSet)

    if (isLiked) {
      await supabase.from('review_likes').delete().eq('user_id', session.user.id).eq('review_id', reviewId)
    } else {
      await supabase.from('review_likes').insert({ user_id: session.user.id, review_id: reviewId })
    }
    fetchReviews(false) 
  }

  async function handleFlagReview(reviewId) {
    if (!session) return toast.error("Login to report reviews")
    if (!confirm("Report this review as inappropriate?")) return
  
    const { error } = await supabase.from('review_flags').insert({
      user_id: session.user.id,
      review_id: reviewId
    })
  
    if (error) {
      if (error.code === '23505') toast.error("You already reported this.")
      else toast.error("Error reporting review")
    } else {
      toast.success("Review reported to Admin")
    }
  }

  function handleShare() { 
    navigator.clipboard.writeText(window.location.href)
    toast.success("Link copied!") 
  }

  async function toggleBookmark() {
     if (!session) return toast.error("Please login!")
     const newStatus = !isBookmarked
     setIsBookmarked(newStatus)
     
     if (newStatus) { 
       await supabase.from('bookmarks').insert({ user_id: session.user.id, book_id: book.id })
       toast.success("Added to Library") 
     } else { 
       await supabase.from('bookmarks').delete().eq('user_id', session.user.id).eq('book_id', book.id)
       toast.success("Removed from Library") 
     }
  }

  async function handlePostReview(e) {
    e.preventDefault()
    if (!session) return toast.error("Login to review!")
    setSubmittingReview(true)
    
    const { error } = await supabase.from('reviews').insert({ 
      book_id: id, 
      user_id: session.user.id, 
      rating: newRating, 
      comment: newComment 
    })
    
    if (!error) { 
      toast.success("Posted!")
      setNewComment('')
      fetchReviews(false) 
    } else {
      toast.error(error.message)
    }
    setSubmittingReview(false)
  }

  if (loading) return <div className="p-20 text-center dark:text-white">Loading...</div>
  if (!book) return <div className="p-20 text-center dark:text-white">Book not found.</div>

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-12">
      {reading && (
        <PDFReader 
          fileUrl={book.pdf_url} 
          bookId={book.id} 
          userId={session?.user?.id} 
          initialPage={savedPage} 
          onClose={() => { setReading(false); fetchBookData() }} 
        />
      )}

      {/* --- TOP SECTION: DETAILS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
        <div className="relative group">
          <img src={book.cover_url} className="w-full rounded-lg shadow-2xl transition transform group-hover:scale-105 duration-500" alt={book.title} />
        </div>
        <div className="md:col-span-2 space-y-6 text-gray-900 dark:text-gray-100">
          <div>
            <span className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
              {book.genre}
            </span>
            <h1 className="text-4xl md:text-5xl font-bold mt-4 font-serif leading-tight">{book.title}</h1>
            <p className="text-xl text-gray-500 dark:text-gray-400 mt-2">{book.author}</p>
            
            {/* CLICKABLE SERIES NAME */}
            {book.series_name && (
              <Link to={`/?search=${book.series_name}`} className="text-purple-600 dark:text-purple-400 font-semibold hover:underline block mt-1">
                {book.series_name} Series, Vol {book.series_order}
              </Link>
            )}
          </div>

          <div className="flex space-x-4 py-4 border-y dark:border-gray-700">
            {session ? (
              <button 
                onClick={() => setReading(!reading)} 
                className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-purple-700 transition shadow-lg"
              >
                {savedPage > 1 ? `Continue (Page ${savedPage})` : 'Start Reading'}
              </button>
            ) : (
              <Link to="/login" className="flex-1 bg-gray-900 dark:bg-gray-700 text-white px-6 py-3 rounded-lg font-bold hover:bg-black text-center">
                Login to Read
              </Link>
            )}
            
            <button 
              onClick={toggleBookmark} 
              className={`p-3 rounded-lg border-2 transition ${isBookmarked ? 'bg-purple-100 dark:bg-purple-900 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-200' : 'border-gray-200 dark:border-gray-700 hover:border-purple-500'}`}
            >
              {isBookmarked ? <BookmarkCheck /> : <Bookmark />}
            </button>
            
            <button 
              onClick={handleShare} 
              className="p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition"
            >
              <Share2 />
            </button>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-2">Synopsis</h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">{book.description}</p>
          </div>
        </div>
      </div>

      {/* --- NEW: SERIES SHELF --- */}
      {book.series_name && seriesBooks.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-serif font-bold text-gray-800 dark:text-white">
              More in the <Link to={`/?search=${book.series_name}`} className="text-purple-600 hover:underline">{book.series_name}</Link> Series
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {seriesBooks.map(sBook => (
              <Link key={sBook.id} to={`/book/${sBook.id}`} className="group block">
                <div className="relative overflow-hidden rounded-lg shadow-md mb-2 aspect-[2/3]">
                  <img src={sBook.cover_url} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" alt={sBook.title} />
                  <span className="absolute top-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm">
                    #{sBook.series_order}
                  </span>
                </div>
                <h4 className="font-bold text-gray-800 dark:text-gray-100 truncate text-sm">{sBook.title}</h4>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* --- RECOMMENDATIONS SECTION --- */}
      {relatedBooks.length > 0 && (
        <div className="mb-16">
          <h3 className="text-2xl font-bold mb-6 flex items-center dark:text-white">
            <BookOpen className="mr-2 text-purple-600" /> You May Also Like
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {relatedBooks.map(rel => (
              <Link key={rel.id} to={`/book/${rel.id}`} className="group block">
                <div className="overflow-hidden rounded-lg shadow-md mb-3">
                  <img src={rel.cover_url} className="w-full h-48 object-cover group-hover:scale-110 transition duration-500" alt={rel.title} />
                </div>
                <h4 className="font-bold text-gray-800 dark:text-gray-100 truncate">{rel.title}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">{rel.author}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* --- REVIEWS SECTION --- */}
      <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-2xl">
        <h3 className="text-2xl font-bold mb-8 dark:text-white">Reader Reviews</h3>
        
        {session && (
          <form onSubmit={handlePostReview} className="mb-10 bg-white dark:bg-gray-700 p-6 rounded-xl shadow-sm">
             <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-3">Leave a Review</h4>
             <div className="flex space-x-2 mb-4">
                {[1, 2, 3, 4, 5].map(star => (
                  <button 
                    key={star} 
                    type="button" 
                    onClick={() => setNewRating(star)} 
                    className={`text-2xl transition ${star <= newRating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-500'}`}
                  >
                    ★
                  </button>
                ))}
             </div>
             <textarea 
               value={newComment} 
               onChange={(e) => setNewComment(e.target.value)} 
               className="w-full p-3 border rounded bg-transparent dark:text-white dark:border-gray-600" 
               placeholder="Write a review..." 
               required 
             />
             <button disabled={submittingReview} className="mt-2 bg-purple-600 text-white px-4 py-2 rounded">
               {submittingReview ? 'Posting...' : 'Post'}
             </button>
          </form>
        )}

        <div className="space-y-6">
          {reviews.map((review) => {
            const displayName = review.profiles?.nickname || review.profiles?.full_name || 'Anonymous'
            const avatar = review.profiles?.avatar_url
            const likeCount = review.review_likes?.[0]?.count || 0 
            const isLiked = likedReviews.has(review.id)

            return (
              <div key={review.id} className="border-b dark:border-gray-700 pb-6 last:border-0">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full overflow-hidden mr-3 bg-gray-200 dark:bg-gray-600">
                      {avatar ? (
                        <img src={avatar} className="w-full h-full object-cover" alt="avatar" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-gray-500">
                          {displayName[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-gray-900 dark:text-white block">{displayName}</span>
                      <div className="flex text-yellow-400 text-xs">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < review.rating ? "fill-current" : "text-gray-300 dark:text-gray-600"}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</span>
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 pl-13 ml-12 mb-3">{review.comment}</p>
                
                <div className="ml-12 flex items-center space-x-4">
                  {/* LIKE BUTTON */}
                  <button 
                    onClick={() => toggleReviewLike(review.id)} 
                    className={`flex items-center text-sm font-medium transition ${isLiked ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <ThumbsUp className={`w-4 h-4 mr-1 ${isLiked ? 'fill-current' : ''}`} /> {likeCount} Likes
                  </button>

                  {/* FLAG/REPORT BUTTON */}
                  <button 
                    onClick={() => handleFlagReview(review.id)}
                    className="flex items-center text-sm font-medium text-gray-400 hover:text-red-500 transition"
                    title="Report Abuse"
                  >
                    <Flag className="w-4 h-4 mr-1" /> Report
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {hasMoreReviews && (
           <button 
             onClick={() => fetchReviews(true)} 
             disabled={loadingReviews} 
             className="mt-6 w-full py-2 text-purple-600 font-bold hover:bg-purple-50 dark:hover:bg-gray-700 rounded-lg border border-transparent dark:border-gray-600"
           >
             {loadingReviews ? <Loader2 className="animate-spin mx-auto"/> : 'Load More Reviews'}
           </button>
        )}
      </div>
    </div>
  )
}
