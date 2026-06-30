import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function SceneBackground() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.z = 7

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8))
    renderer.setSize(window.innerWidth, window.innerHeight)
    mount.appendChild(renderer.domElement)

    const group = new THREE.Group()
    scene.add(group)

    const torus = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.28, 0.18, 180, 18),
      new THREE.MeshStandardMaterial({
        color: 0xe8efdf,
        roughness: 0.42,
        metalness: 0.25,
        emissive: 0x07140f,
      }),
    )
    torus.position.set(2.5, -0.2, -0.8)
    group.add(torus)

    const particles = new THREE.BufferGeometry()
    const count = 820
    const positions = new Float32Array(count * 3)
    for (let index = 0; index < count * 3; index += 3) {
      positions[index] = (Math.random() - 0.5) * 15
      positions[index + 1] = (Math.random() - 0.5) * 9
      positions[index + 2] = (Math.random() - 0.5) * 10
    }
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const points = new THREE.Points(
      particles,
      new THREE.PointsMaterial({
        color: 0xf3f0df,
        size: 0.018,
        transparent: true,
        opacity: 0.55,
      }),
    )
    group.add(points)

    scene.add(new THREE.AmbientLight(0xf6f1df, 0.55))
    const keyLight = new THREE.PointLight(0xf3d35d, 2.1, 22)
    keyLight.position.set(-3, 3, 4)
    scene.add(keyLight)
    const coolLight = new THREE.PointLight(0x44b9ff, 1.2, 18)
    coolLight.position.set(4, -2, 3)
    scene.add(coolLight)

    const pointer = { x: 0, y: 0 }
    function handlePointer(event) {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 0.35
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 0.35
    }

    function handleResize() {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    let frameId
    function animate() {
      frameId = requestAnimationFrame(animate)
      group.rotation.y += 0.0025
      group.rotation.x += 0.0009
      torus.rotation.x += 0.006
      torus.rotation.y += 0.004
      camera.position.x += (pointer.x - camera.position.x) * 0.025
      camera.position.y += (-pointer.y - camera.position.y) * 0.025
      camera.lookAt(0, 0, 0)
      renderer.render(scene, camera)
    }

    window.addEventListener('pointermove', handlePointer)
    window.addEventListener('resize', handleResize)
    animate()

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('pointermove', handlePointer)
      window.removeEventListener('resize', handleResize)
      mount.removeChild(renderer.domElement)
      renderer.dispose()
      torus.geometry.dispose()
      torus.material.dispose()
      particles.dispose()
      points.material.dispose()
    }
  }, [])

  return <div ref={mountRef} className="scene-background" aria-hidden="true" />
}
