import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import Lenis from 'lenis'
import SceneBackground from './SceneBackground'

export default function ExperienceShell({ children, routeKey }) {
  const cursorRef = useRef(null)

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      smoothWheel: true,
      wheelMultiplier: 0.9,
    })
    let frameId

    function raf(time) {
      lenis.raf(time)
      frameId = requestAnimationFrame(raf)
    }

    frameId = requestAnimationFrame(raf)
    return () => {
      cancelAnimationFrame(frameId)
      lenis.destroy()
    }
  }, [])

  useEffect(() => {
    const cursor = cursorRef.current
    if (!cursor) return undefined

    gsap.set(cursor, { xPercent: -50, yPercent: -50 })
    const xTo = gsap.quickTo(cursor, 'x', { duration: 0.32, ease: 'power3.out' })
    const yTo = gsap.quickTo(cursor, 'y', { duration: 0.32, ease: 'power3.out' })

    function moveCursor(event) {
      xTo(event.clientX)
      yTo(event.clientY)
    }

    function setActive(event) {
      const target = event.target
      const isInteractive = target.closest('button, a, input, textarea')
      cursor.dataset.active = isInteractive ? 'true' : 'false'
    }

    window.addEventListener('pointermove', moveCursor)
    window.addEventListener('pointerover', setActive)
    return () => {
      window.removeEventListener('pointermove', moveCursor)
      window.removeEventListener('pointerover', setActive)
    }
  }, [])

  useEffect(() => {
    gsap.fromTo(
      '.motion-in',
      { y: 36, opacity: 0, rotate: -0.8 },
      { y: 0, opacity: 1, rotate: 0, duration: 0.9, stagger: 0.08, ease: 'power4.out' },
    )
    gsap.fromTo(
      '.transition-overlay',
      { yPercent: 0 },
      { yPercent: -105, duration: 0.75, stagger: 0.055, ease: 'power4.inOut' },
    )
  }, [routeKey])

  return (
    <>
      <SceneBackground />
      <div className="transition" aria-hidden="true">
        <div className="transition-overlay overlay-1" />
        <div className="transition-overlay overlay-2" />
        <div className="transition-overlay overlay-3" />
        <div className="transition-overlay overlay-4" />
        <div className="transition-overlay overlay-5" />
      </div>
      <div ref={cursorRef} className="cursor-circle" aria-hidden="true" />
      {children}
    </>
  )
}
