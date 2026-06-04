import { useAuth } from './hooks/useAuth'
import { LoginPage } from './components/auth/LoginPage'
import { BoardLayout } from './components/board/BoardLayout'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-dark-tan border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading PK1...</p>
        </div>
      </div>
    )
  }

  return user ? <BoardLayout /> : <LoginPage />
}

export default App
