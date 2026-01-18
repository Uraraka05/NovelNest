export default function BookCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-transparent dark:border-gray-700 flex flex-col animate-pulse h-full">
      {/* Cover Placeholder */}
      <div className="h-64 bg-gray-200 dark:bg-gray-700 w-full" />
      
      {/* Content Placeholders */}
      <div className="p-4 flex-1 flex flex-col space-y-4">
        {/* Title Line */}
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        
        {/* Author Line */}
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        
        {/* Rating Row */}
        <div className="flex items-center space-x-2">
           <div className="h-4 w-10 bg-gray-200 dark:bg-gray-700 rounded" />
           <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>

        {/* Button Placeholder */}
        <div className="mt-auto pt-3">
           <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-full" />
        </div>
      </div>
    </div>
  )
}