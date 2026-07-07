import { useEffect } from 'react'
import { useAuth } from './store/useAuth'
import { Background } from './components/Background'
import { Splash } from './components/Splash'
import { LoginGate } from './components/LoginGate'
import { Board } from './components/Board'

function App() {
  const status = useAuth((s) => s.status)
  const check = useAuth((s) => s.check)

  useEffect(() => {
    void check()
  }, [check])

  return (
    <>
      <Background />
      {status === 'checking' && <Splash />}
      {status === 'anon' && <LoginGate />}
      {status === 'authed' && <Board />}
    </>
  )
}

export default App
