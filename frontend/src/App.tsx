import Capture from '@/pages/Capture'
import Community from '@/pages/Community'
import DreamDetail from '@/pages/DreamDetail'
import Journal from '@/pages/Journal'
import Me from '@/pages/Me'
import Patterns from '@/pages/Patterns'
import Styleguide from '@/pages/Styleguide'
import { usePath } from '@/lib/router'

function App() {
  const path = usePath()

  const dream = path.match(/^\/dream\/(\d+)$/)
  if (dream) return <DreamDetail key={dream[1]} number={Number(dream[1])} />

  switch (path) {
    case '/styleguide':
      return <Styleguide />
    case '/patterns':
      return <Patterns />
    case '/capture':
      return <Capture />
    case '/community':
      return <Community />
    case '/me':
      return <Me />
    default:
      return <Journal />
  }
}

export default App
