import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { User, LogOut, Save, Loader2, Lock, Key, Camera, Trash2, Star, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Profile({ session }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  // Password State
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [reviews, setReviews] = useState([])
  
  // Profile State
  const [fullName, setFullName] = useState('')
  const [nickname, setNickname] = useState('')
  const [dob, setDob] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [role, setRole] = useState('user') // New: Store User Role

  // Admin Request State
  const [requestStatus, setRequestStatus] = useState(null)

  useEffect(() => {
    if (session) {
      fetchProfile()
      fetchReviews()
      checkRequestStatus() // New: Check status on load
    }
  }, [session])

  async function fetchProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (data) {
      setFullName(data.full_name || '')
      setNickname(data.nickname || '')
      setDob(data.date_of_birth || '')
      setAvatarUrl(data.avatar_url)
      setRole(data.role || 'user') // Set Role
    }
  }

  // --- NEW: CHECK & REQUEST ADMIN ACCESS ---
  async function checkRequestStatus() {
    // Use maybeSingle() to avoid errors if no request exists yet
    const { data } = await supabase.from('admin_requests').select('status').eq('user_id', session.user.id).maybeSingle()
    if (data) setRequestStatus(data.status)
  }

  async function requestAdminAccess() {
    const { error } = await supabase.from('admin_requests').insert({ user_id: session.user.id })
    if (!error) {
      toast.success("Request sent to Super Admin!")
      setRequestStatus('pending')
    } else {
      // Handle duplicate requests gracefully
      if (error.code === '23505') toast.error("Request already pending.")
      else toast.error("Error sending request")
    }
  }

  async function fetchReviews() {
    const { data } = await supabase.from('reviews').select('*, novels(title)').eq('user_id', session.user.id).order('created_at', { ascending: false })
    setReviews(data || [])
    setLoading(false)
  }

  async function uploadAvatar(event) {
    try {
      setUploading(true)
      const file = event.target.files[0]
      if (!file) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}` // Fixed Math.now to Date.now()
      const filePath = fileName

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const publicUrl = data.publicUrl

      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id)
      if (updateError) throw updateError

      setAvatarUrl(publicUrl)
      toast.success('Avatar updated!')
      // Optional: reload to ensure image cache clears, or just rely on state
      // setTimeout(() => window.location.reload(), 1000) 

    } catch (error) {
      toast.error("Error uploading: " + error.message)
    } finally {
      setUploading(false)
    }
  }

  async function handlePasswordUpdate(e) {
    e.preventDefault()
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match")
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters")

    setPasswordLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    
    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Password updated successfully!")
      setNewPassword('')
      setConfirmPassword('')
    }
    setPasswordLoading(false)
  }

  async function deleteReview(reviewId) {
    if (!confirm("Delete this review?")) return
    const { error } = await supabase.from('reviews').delete().eq('id', reviewId)
    if (!error) setReviews(reviews.filter(r => r.id !== reviewId))
  }

  async function handleUpdateProfile(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('profiles').upsert({
        id: session.user.id,
        full_name: fullName,
        nickname: nickname,
        date_of_birth: dob || null,
    })
    if (!error) toast.success("Profile updated!")
    setSaving(false)
  }

  async function handleLogout() {
    localStorage.clear()
    try {
      await supabase.auth.signOut() 
    } catch (error) {
      console.warn("Server logout failed, but local session cleared.")
    }
    window.location.href = '/'
  }

  if (!session) return <div className="p-10 text-center dark:text-white">Please log in.</div>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-12 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-transparent dark:border-gray-700 transition-colors gap-4">
          <div className="flex flex-col md:flex-row items-center text-center md:text-left space-y-3 md:space-y-0 md:space-x-4">
            <div className="relative group">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-900/50 border-2 border-purple-200 dark:border-purple-700">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-purple-600 dark:text-purple-300">
                    <User className="w-8 h-8" />
                  </div>
                )}
              </div>
              <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <Camera className="w-6 h-6 text-white" />
                <input type="file" accept="image/*" onChange={uploadAvatar} className="hidden" disabled={uploading} />
              </label>
              {uploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-full"><Loader2 className="w-6 h-6 animate-spin text-purple-600" /></div>}
            </div>
            
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">My Profile</h1>
              <p className="text-gray-500 dark:text-gray-400 break-all">{session.user.email}</p>
              <span className={`text-xs px-2 py-0.5 rounded uppercase font-bold ${role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                {role}
              </span>
            </div>
          </div>

          <button onClick={handleLogout} className="w-full md:w-auto text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-lg transition flex items-center justify-center">
            <LogOut className="w-5 h-5 mr-2" /> Logout
          </button>
        </div>

        {/* --- PERSONAL DETAILS FORM --- */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-transparent dark:border-gray-700 transition-colors">
          <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Personal Details</h2>
          <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Real Name</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-3 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nickname</label>
              <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} className="w-full p-3 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Date of Birth</label>
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full p-3 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 dark:[color-scheme:dark]" />
            </div>
            <div className="md:col-span-2 flex justify-end mt-4">
              <button disabled={saving} className="bg-purple-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-purple-700 transition flex items-center">
                {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />} Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* --- NEW: AUTHOR ACCESS REQUEST --- */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-transparent dark:border-gray-700 transition-colors">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center">
             <Shield className="w-5 h-5 mr-2 text-purple-600" /> Author Access
          </h2>
          {role === 'user' ? (
            requestStatus === 'pending' ? (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-lg border border-yellow-100 dark:border-yellow-900/50">
                <strong>Request Pending:</strong> Your application to become an Author is under review by the Admin.
              </div>
            ) : requestStatus === 'rejected' ? (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-900/50">
                <strong>Request Rejected:</strong> Your application was not approved.
              </div>
            ) : (
              <div className="flex items-center justify-between flex-wrap gap-4">
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Want to publish your own novels on NovelNest? Request author privileges to access the Admin Dashboard.
                </p>
                <button onClick={requestAdminAccess} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-bold whitespace-nowrap">
                  Request to become an Author
                </button>
              </div>
            )
          ) : (
             <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg border border-green-100 dark:border-green-900/50">
               <strong>Access Granted:</strong> You are currently an {role.charAt(0).toUpperCase() + role.slice(1)}. You have full access to the Admin Dashboard.
             </div>
          )}
        </div>

        {/* --- SECURITY / CHANGE PASSWORD SECTION --- */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-transparent dark:border-gray-700 transition-colors">
          <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white flex items-center">
            <Lock className="w-5 h-5 mr-2 text-purple-600" /> Security
          </h2>
          <form onSubmit={handlePasswordUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Min 6 characters"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Confirm Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Re-type password"
                />
              </div>
            </div>
            <div className="md:col-span-2 flex justify-end mt-4">
              <button disabled={passwordLoading} className="bg-gray-900 dark:bg-gray-700 text-white px-8 py-3 rounded-lg font-bold hover:bg-black dark:hover:bg-gray-600 transition flex items-center">
                {passwordLoading ? <Loader2 className="animate-spin mr-2" /> : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* --- MY REVIEWS --- */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-transparent dark:border-gray-700 transition-colors">
           <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">My Reviews ({reviews.length})</h2>
           <div className="space-y-4">
             {reviews.map(review => (
               <div key={review.id} className="border dark:border-gray-700 p-4 rounded-lg flex justify-between items-start hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                 <div className="flex-1">
                   <h3 className="font-bold text-lg text-purple-600 dark:text-purple-400 mb-1">{review.novels?.title || "Unknown Book"}</h3>
                   <div className="flex text-yellow-400 text-sm mb-2">{[...Array(5)].map((_, i) => (<Star key={i} className={`w-4 h-4 ${i < review.rating ? "fill-current" : "text-gray-300 dark:text-gray-600"}`} />))}</div>
                   <p className="text-gray-700 dark:text-gray-300">{review.comment}</p>
                 </div>
                 <button onClick={() => deleteReview(review.id)} className="text-gray-400 hover:text-red-500 p-2 transition ml-4"><Trash2 className="w-5 h-5" /></button>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  )
}
