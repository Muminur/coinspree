import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

// Replace this HTML section:
// <div class="hidden md:flex items-center gap-3">
//   <div class="flex items-center gap-2">
//     <a class="btn-secondary px-3 py-1.5 text-sm" href="/login">Login</a>
//     <a class="btn-primary px-3 py-1.5 text-sm" href="/register">Sign Up</a>
//   </div>
// </div>

// With this React component:

export function AuthSection() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="hidden md:flex items-center gap-3">
        <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" />
      </div>
    )
  }

  return (
    <div className="hidden md:flex items-center gap-3">
      {user ? (
        // Show logout when logged in
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{user.email}</span>
          <button
            onClick={() => {
              fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
                .then(() => {
                  alert('Successfully logged out!')
                  window.location.href = '/'
                })
                .catch(() => {
                  alert('Logout failed. Please try again.')
                })
            }}
            className="btn-secondary px-3 py-1.5 text-sm"
          >
            Logout
          </button>
        </div>
      ) : (
        // Show login/register when not logged in
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-secondary px-3 py-1.5 text-sm">
            Login
          </Link>
          <Link href="/register" className="btn-primary px-3 py-1.5 text-sm">
            Sign Up
          </Link>
        </div>
      )}
    </div>
  )
}

// Alternative: If you need to modify existing HTML directly, use this JavaScript:
/*
<script>
// Check if user is logged in (replace with your actual auth check)
const isLoggedIn = localStorage.getItem('user') || document.cookie.includes('session=');
const userEmail = localStorage.getItem('userEmail') || 'user@example.com';

const authSection = document.querySelector('.auth-section'); // Add this class to your div

if (isLoggedIn) {
  // Hide login/register buttons and show logout
  authSection.innerHTML = `
    <div class="flex items-center gap-2">
      <span class="text-sm text-gray-600">${userEmail}</span>
      <button class="btn-secondary px-3 py-1.5 text-sm" onclick="handleLogout()">
        Logout
      </button>
    </div>
  `;
} else {
  // Show login/register buttons
  authSection.innerHTML = `
    <div class="flex items-center gap-2">
      <a class="btn-secondary px-3 py-1.5 text-sm" href="/login">Login</a>
      <a class="btn-primary px-3 py-1.5 text-sm" href="/register">Sign Up</a>
    </div>
  `;
}

function handleLogout() {
  fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    .then(() => {
      alert('Successfully logged out!');
      window.location.href = '/';
    })
    .catch(() => {
      alert('Logout failed. Please try again.');
    });
}
</script>
*/