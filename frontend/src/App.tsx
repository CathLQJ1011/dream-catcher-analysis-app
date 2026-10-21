import Styleguide from '@/pages/Styleguide'
import { DreamOrb } from '@/components/dream/DreamOrb'

// No router yet: one path check is enough until real screens exist.
function App() {
  if (window.location.pathname === '/styleguide') return <Styleguide />

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 bg-night px-4 text-center">
      <DreamOrb emotion="lucid" size={160} />
      <h1 className="font-serif text-title">
        Dream Catcher
        <br />
        <em className="text-fg-secondary">Screens coming soon.</em>
      </h1>
      <a href="/styleguide" className="font-mono text-meta uppercase text-accent-soft hover:text-fg">
        [ Open styleguide ]
      </a>
    </main>
  )
}

export default App
