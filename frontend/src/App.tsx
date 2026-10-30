import { useEffect } from 'react'
import Capture from '@/pages/Capture'
import Community from '@/pages/Community'
import DreamDetail from '@/pages/DreamDetail'
import Journal from '@/pages/Journal'
import ManageDreams from '@/pages/ManageDreams'
import Me from '@/pages/Me'
import Patterns from '@/pages/Patterns'
import SignIn from '@/pages/SignIn'
import Styleguide from '@/pages/Styleguide'
import { usePath } from '@/lib/router'
import { loadSession, useSession } from '@/lib/session'

function App() {
  const path = usePath()
  const session = useSession()

  useEffect(() => {
    loadSession()
  }, [])

  if (path === '/styleguide') return <Styleguide />
  // Blank night sky for the moment it takes to check the login.
  if (session === 'loading') return <div className="min-h-screen bg-night" />
  if (session === null) return <SignIn />

  const dream = path.match(/^\/dream\/(\d+)$/)
  if (dream) return <DreamDetail key={dream[1]} id={Number(dream[1])} />

  switch (path) {
    case '/patterns':
      return <Patterns />
    case '/capture':
      return <Capture />
    case '/community':
      return <Community />
    case '/me':
      return <Me />
    case '/me/dreams':
      return <ManageDreams />
    default:
      return <Journal />
  }
}

export default App
