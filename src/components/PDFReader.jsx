import { useState, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, Download, X, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Essential CSS for text selection and annotations
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// Configure the worker using CDN (Safer than local file)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function PDFReader({ fileUrl, bookId, userId, initialPage = 1, onClose }) {
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(initialPage)
  const [inputPage, setInputPage] = useState(initialPage) // Local state for input box
  const [saving, setSaving] = useState(false)

  // Sync input box when page changes via buttons
  useEffect(() => {
    setInputPage(pageNumber)
  }, [pageNumber])

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages)
  }

  // --- SAVE PROGRESS TO DB ---
  async function saveProgress(page) {
    if (!userId) return
    setSaving(true)
    
    // We use 'upsert' to handle both Insert (first read) and Update (continue reading)
    const { error } = await supabase
      .from('reading_progress')
      .upsert({ 
        user_id: userId, 
        book_id: bookId, 
        current_page: page,
        last_read: new Date() // Updates timestamp
      }, { onConflict: 'user_id, book_id' })

    if (error) console.error("Error saving progress:", error)
    setSaving(false)
  }

  // Handle Page Change
  async function changePage(offset) {
    const newPage = pageNumber + offset
    if (newPage >= 1 && newPage <= numPages) {
      setPageNumber(newPage)
      saveProgress(newPage)
    }
  }

  // Handle "Jump to Page" Input
  function handleInputKeyDown(e) {
    if (e.key === 'Enter') {
      const val = parseInt(inputPage)
      if (val >= 1 && val <= numPages) {
        setPageNumber(val)
        saveProgress(val)
        e.target.blur() // Remove focus after jumping
      } else {
        setInputPage(pageNumber) // Reset if invalid
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4 animate-fadeIn">
      
      {/* --- HEADER --- */}
      <div className="w-full max-w-6xl flex justify-between items-center text-white mb-4 px-4 bg-gray-900/50 p-3 rounded-xl border border-gray-800 backdrop-blur-sm">
        
        {/* Close Button */}
        <button onClick={onClose} className="flex items-center text-gray-400 hover:text-white transition group">
          <div className="p-1 bg-gray-800 rounded-full group-hover:bg-gray-700 mr-2">
            <X className="w-5 h-5" />
          </div>
          <span className="font-bold hidden sm:inline text-sm">Close</span>
        </button>

        {/* Page Controls (Jump to Page) */}
        <div className="flex items-center space-x-3 bg-gray-800 px-4 py-2 rounded-full border border-gray-700">
          <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Page</span>
          <input 
            type="number" 
            value={inputPage}
            onChange={(e) => setInputPage(e.target.value)}
            onKeyDown={handleInputKeyDown}
            className="w-12 bg-transparent text-center text-white font-bold border-b border-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
          />
          <span className="text-sm text-gray-400">/ {numPages || '--'}</span>
          
          {/* Saving Indicator */}
          {saving && (
            <span className="flex items-center text-xs text-green-400 ml-2 animate-pulse">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
              Saved
            </span>
          )}
        </div>

        {/* Download Button */}
        <a 
          href={fileUrl} 
          download 
          target="_blank" 
          rel="noreferrer"
          className="flex items-center text-gray-400 hover:text-purple-400 transition group"
          title="Download PDF"
        >
          <span className="font-bold hidden sm:inline mr-2 text-sm">Download</span>
          <div className="p-1 bg-gray-800 rounded-full group-hover:bg-gray-700">
            <Download className="w-5 h-5" />
          </div>
        </a>
      </div>

      {/* --- PDF VIEW --- */}
      <div className="flex-1 flex items-center gap-4 overflow-hidden w-full max-w-7xl justify-center relative">
        
        {/* Prev Button */}
        <button 
          onClick={() => changePage(-1)} 
          disabled={pageNumber <= 1}
          className="absolute left-2 z-10 md:static p-3 bg-gray-800/80 rounded-full hover:bg-purple-600 disabled:opacity-0 disabled:pointer-events-none transition shadow-lg backdrop-blur-sm border border-gray-700"
        >
          <ChevronLeft className="text-white w-6 h-6" />
        </button>

        {/* Document Render Container */}
        <div className="h-full w-full overflow-y-auto bg-gray-900 rounded-xl shadow-2xl flex justify-center border border-gray-800 p-4 custom-scrollbar">
          <Document 
            file={fileUrl} 
            onLoadSuccess={onDocumentLoadSuccess} 
            loading={
              <div className="flex flex-col items-center justify-center h-full text-white">
                <Loader2 className="animate-spin w-10 h-10 text-purple-500 mb-4" />
                <p className="animate-pulse">Loading Book...</p>
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center h-full text-red-400">
                <p>Failed to load PDF.</p>
                <a href={fileUrl} className="mt-2 text-white underline hover:text-purple-400">Try Downloading Instead</a>
              </div>
            }
            className="flex justify-center"
          >
            <Page 
              pageNumber={pageNumber} 
              scale={1.2} 
              renderTextLayer={false} 
              renderAnnotationLayer={false}
              className="shadow-2xl mb-4"
              width={window.innerWidth > 768 ? 600 : window.innerWidth * 0.9} // Responsive Width
            />
          </Document>
        </div>

        {/* Next Button */}
        <button 
          onClick={() => changePage(1)} 
          disabled={pageNumber >= numPages}
          className="absolute right-2 z-10 md:static p-3 bg-gray-800/80 rounded-full hover:bg-purple-600 disabled:opacity-0 disabled:pointer-events-none transition shadow-lg backdrop-blur-sm border border-gray-700"
        >
          <ChevronRight className="text-white w-6 h-6" />
        </button>
      </div>
    </div>
  )
}