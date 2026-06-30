import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import CreateRoomPage from './pages/CreateRoomPage'
import HomePage from './pages/HomePage'
import JoinRoomPage from './pages/JoinRoomPage'
import NotFoundPage from './pages/NotFoundPage'
import RoomPage from './pages/RoomPage'

function parseRoute(pathname) {
  const cleanPath = pathname.replace(/\/+$/, '') || '/'

  if (cleanPath === '/') {
    return { name: 'home' }
  }

  if (cleanPath === '/create') {
    return { name: 'create' }
  }

  if (cleanPath === '/join') {
    return { name: 'join' }
  }

  const roomMatch = cleanPath.match(/^\/room\/([^/]+)$/)
  if (roomMatch) {
    return { name: 'room', roomId: decodeURIComponent(roomMatch[1]) }
  }

  return { name: 'not-found' }
}

function App() {
  const [locationKey, setLocationKey] = useState(() => window.location.pathname)

  useEffect(() => {
    function handlePopState() {
      setLocationKey(window.location.pathname)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = useCallback((path) => {
    window.history.pushState({}, '', path)
    setLocationKey(window.location.pathname)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const route = useMemo(() => parseRoute(locationKey), [locationKey])

  if (route.name === 'create') {
    return <CreateRoomPage navigate={navigate} />
  }

  if (route.name === 'join') {
    return <JoinRoomPage navigate={navigate} />
  }

  if (route.name === 'room') {
    return <RoomPage navigate={navigate} roomId={route.roomId} />
  }

  if (route.name === 'not-found') {
    return <NotFoundPage navigate={navigate} />
  }

  return <HomePage navigate={navigate} />
}

export default App
