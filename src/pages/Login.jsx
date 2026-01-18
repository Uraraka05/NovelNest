import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Loader2, BookOpen, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleAuth(e) {
    e.preventDefault()
    setLoading(true)
    
    let loadingMsg = "Signing in..."
    if (isSignUp) loadingMsg = "Creating account..."
    if (isForgotPassword) loadingMsg = "Sending reset link..."
    
    const toastId = toast.loading(loadingMsg)

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/profile', 
        })
        if (error) throw error
        toast.success("Reset link sent! Check your email.", { id: toastId })
        setIsForgotPassword(false)
        setLoading(false)
        return
      }

      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        toast.success("Account created! Welcome to NovelNest.", { id: toastId })
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        toast.success("Welcome back!", { id: toastId })
        navigate('/')
      }
    } catch (error) {
      toast.error(error.message, { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  const getTitle = () => {
    if (isForgotPassword) return 'Reset Password'
    if (isSignUp) return 'Join NovelNest'
    return 'Welcome Back'
  }

  const getSubtitle = () => {
    if (isForgotPassword) return 'Enter your email to receive a secure link.'
    if (isSignUp) return 'Start your reading journey today.'
    return 'Enter your details to access your library.'
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      
      {/* --- BACKGROUND IMAGE & OVERLAY --- */}
      {/* High-quality dark library image from Unsplash */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transform scale-105"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1507842217121-9e93c8aaf27c?q=80&w=2670&auto=format&fit=crop')" }}
      ></div>
      {/* Dark Purple/Black Gradient Overlay to ensure text readability */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-gray-900/90 via-purple-900/80 to-black/90"></div>

      {/* --- GLASS CARD --- */}
      <div className="relative z-10 w-full max-w-md">
        
        {/* Logo Animation (Optional floating icon) */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-full shadow-2xl ring-1 ring-white/20 animate-pulse">
            <BookOpen className="w-10 h-10 text-purple-300" />
          </div>
        </div>

        <div className="bg-gray-900/60 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl">
          <h2 className="text-3xl font-serif font-bold text-white mb-2 text-center tracking-wide">
            {getTitle()}
          </h2>
          <p className="text-gray-300 text-center mb-8 text-sm">
            {getSubtitle()}
          </p>

          <form onSubmit={handleAuth} className="space-y-5">
            {/* Email Field */}
            <div className="group">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                </div>
                <input 
                  type="email" 
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            {!isForgotPassword && (
              <div className="group">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                  </div>
                  <input 
                    type="password" 
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>
            )}

            {/* Forgot Password Link */}
            {!isSignUp && !isForgotPassword && (
              <div className="flex justify-end">
                <button 
                  type="button" 
                  onClick={() => setIsForgotPassword(true)} 
                  className="text-sm text-purple-300 hover:text-white transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Action Button */}
            <button 
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all transform hover:-translate-y-0.5 flex justify-center items-center"
            >
              {loading ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                <>
                  {isForgotPassword ? 'Send Reset Link' : (isSignUp ? 'Create Account' : 'Sign In')}
                  {!isForgotPassword && <ArrowRight className="w-5 h-5 ml-2" />}
                </>
              )}
            </button>
          </form>

          {/* Toggle Links */}
          <div className="mt-8 text-center text-sm text-gray-400">
            {isForgotPassword ? (
              <button onClick={() => setIsForgotPassword(false)} className="text-white hover:underline font-semibold">
                Back to Login
              </button>
            ) : isSignUp ? (
              <p>
                Already have an account?{' '}
                <button onClick={() => setIsSignUp(false)} className="text-purple-300 hover:text-white font-bold hover:underline transition-colors">
                  Sign In
                </button>
              </p>
            ) : (
              <p>
                New here?{' '}
                <button onClick={() => setIsSignUp(true)} className="text-purple-300 hover:text-white font-bold hover:underline transition-colors">
                  Create an Account
                </button>
              </p>
            )}
          </div>
        </div>
        
        {/* Footer Link */}
        <div className="mt-8 text-center">
          <Link to="/" className="text-gray-500 hover:text-white text-xs transition-colors">
            &larr; Back to Library
          </Link>
        </div>

      </div>
    </div>
  )
}