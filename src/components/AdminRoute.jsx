import { Navigate } from 'react-router-dom'

export default function AdminRoute({ session, children }) {
  // 1. If not logged in, go to Login
  if (!session) {
    return <Navigate to="/login" replace />
  }

  // 2. If logged in but NOT the specific admin email, go Home
  // (Make sure this matches your exact admin email)
  const ADMIN_EMAIL = 'madhumithakarthikeyan2005@gmail.com'

  if (session.user.email !== ADMIN_EMAIL) {
    return <Navigate to="/" replace />
  }

  // 3. If Admin, show the page
  return children
}