import { useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  Bone, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial,
  Skeleton, SkinnedMesh, SphereGeometry, Uint16BufferAttribute,
} from 'three'
import type { JoyState } from './JoyMascot'

interface SceneProps { state: JoyState; encourageSignal: number; still: boolean }

/** Original procedural character. The body blends between hip and chest bones;
 * the face and limbs attach to bones. No remote assets or textures are needed.
 */
function createJoy() {
  const root = new Group()
  const lavender = new MeshStandardMaterial({ color: '#a89bd4', roughness: 0.55 })
  const peach = new MeshStandardMaterial({ color: '#f4c6a6', roughness: 0.7 })
  const ink = new MeshStandardMaterial({ color: '#3a3550', roughness: 0.5 })
  const sage = new MeshStandardMaterial({ color: '#8fb39b', roughness: 0.65 })
  const white = new MeshStandardMaterial({ color: '#fffaf5', roughness: 0.4 })
  const geometries: SphereGeometry[] = []
  function orb(parent: Group | Bone, material: MeshStandardMaterial, position: [number, number, number], scale: [number, number, number]) {
    const geometry = new SphereGeometry(1, 32, 24)
    geometries.push(geometry)
    const mesh = new Mesh(geometry, material)
    mesh.position.set(...position)
    mesh.scale.set(...scale)
    parent.add(mesh)
    return mesh
  }
  function joint(name: string, parent: Group | Bone, position: [number, number, number]) {
    const bone = new Bone()
    bone.name = name
    bone.position.set(...position)
    parent.add(bone)
    return bone
  }
  const hips = joint('hips', root, [0, 0.8, 0])
  const chest = joint('chest', hips, [0, 0.65, 0])
  const head = joint('head', chest, [0, 0.53, 0])
  const leftArm = joint('arm.L', chest, [-0.63, -0.02, 0])
  const rightArm = joint('arm.R', chest, [0.63, -0.02, 0])
  const leftFoot = joint('foot.L', hips, [-0.32, -0.48, 0.05])
  const rightFoot = joint('foot.R', hips, [0.32, -0.48, 0.05])
  const skeleton = new Skeleton([hips, chest, head, leftArm, rightArm, leftFoot, rightFoot])
  const bodyGeometry = new SphereGeometry(1, 40, 32)
  bodyGeometry.scale(0.72, 0.83, 0.53)
  bodyGeometry.translate(0, 1.06, 0)
  geometries.push(bodyGeometry)
  const positions = bodyGeometry.attributes.position
  const indices: number[] = []
  const weights: number[] = []
  for (let i = 0; i < positions.count; i++) {
    const chestWeight = Math.max(0, Math.min(1, (positions.getY(i) - 0.65) / 0.9))
    indices.push(0, 1, 0, 0)
    weights.push(1 - chestWeight, chestWeight, 0, 0)
  }
  bodyGeometry.setAttribute('skinIndex', new Uint16BufferAttribute(indices, 4))
  bodyGeometry.setAttribute('skinWeight', new Float32BufferAttribute(weights, 4))
  const body = new SkinnedMesh(bodyGeometry, lavender)
  root.add(body)
  root.updateMatrixWorld(true)
  body.bind(skeleton)
  body.frustumCulled = false

  orb(head, lavender, [0, 0, 0], [0.79, 0.7, 0.61])
  orb(leftArm, lavender, [-0.1, -0.27, 0], [0.19, 0.4, 0.21])
  orb(rightArm, lavender, [0.1, -0.27, 0], [0.19, 0.4, 0.21])
  orb(leftFoot, peach, [0, -0.08, 0.13], [0.25, 0.18, 0.36])
  orb(rightFoot, peach, [0, -0.08, 0.13], [0.25, 0.18, 0.36])
  const eyes = [-0.26, 0.26].map(x => {
    orb(head, peach, [x * 1.5, -0.16, 0.5], [0.15, 0.09, 0.055])
    const eye = orb(head, ink, [x, 0.08, 0.566], [0.065, 0.09, 0.045])
    orb(head, white, [x - 0.016, 0.106, 0.604], [0.018, 0.023, 0.012])
    return eye
  })
  const mouth = orb(head, ink, [0, -0.19, 0.59], [0.105, 0.035, 0.025])
  orb(head, sage, [-0.12, 0.68, 0], [0.24, 0.095, 0.11]).rotation.z = -0.45
  orb(head, sage, [0.12, 0.73, 0], [0.23, 0.1, 0.11]).rotation.z = 0.6
  return {
    root, chest, head, leftArm, rightArm, eyes, mouth,
    dispose() {
      geometries.forEach(geometry => geometry.dispose())
      ;[lavender, peach, ink, sage, white].forEach(material => material.dispose())
      skeleton.dispose()
    },
  }
}

function Character({ state, encourageSignal, still }: SceneProps) {
  const [rig] = useState(createJoy)
  const [motion] = useState(() => ({ time: 0, nodStart: -10, signal: encourageSignal }))
  const invalidate = useThree(s => s.invalidate)
  useEffect(() => () => rig.dispose(), [rig])
  useEffect(() => {
    if (motion.signal !== encourageSignal) {
      motion.signal = encourageSignal
      motion.nodStart = still ? -10 : motion.time
    }
    invalidate()
  }, [encourageSignal, state, still, motion, invalidate])
  useFrame((_, delta) => {
    // Local time prevents animation jumps when a demand loop resumes.
    if (!still) motion.time += Math.min(delta, 0.05)
    const t = motion.time
    const nodAge = t - motion.nodStart
    const nod = !still && nodAge < 0.85 ? Math.sin(nodAge / 0.85 * Math.PI) * 0.22 : 0
    const talking = state === 'speaking'
    rig.root.position.y = still ? 0 : Math.sin(t * 1.8) * 0.035
    rig.root.rotation.y = -0.12
    rig.chest.rotation.z = still ? 0 : Math.sin(t * 1.2) * 0.025
    rig.head.rotation.x = nod + (!still && talking ? Math.sin(t * 5) * 0.035 : 0)
    rig.head.rotation.z = state === 'listening' ? 0.09 : 0
    rig.head.rotation.y = !still && state === 'connecting' ? Math.sin(t * 1.6) * 0.13 : 0
    rig.leftArm.rotation.z = -0.12 + (!still && talking ? Math.sin(t * 3) * 0.13 : 0)
    rig.rightArm.rotation.z = state === 'ended' ? 2.1 : !still && talking ? 0.35 + Math.sin(t * 3 + 1) * 0.18 : 0.12
    rig.mouth.scale.y = talking ? (still ? 0.065 : 0.045 + (Math.sin(t * 17) + 1) * 0.035) : 0.035
    const blink = !still && t % 4.6 > 4.42 ? 0.14 : 1
    rig.eyes.forEach(eye => { eye.scale.y = 0.09 * blink })
  })
  return <primitive object={rig.root} dispose={null} />
}

export default function JoyScene(props: SceneProps) {
  return (
    <Canvas aria-hidden="true" camera={{ position: [0, 1.6, 6], fov: 34 }}
      dpr={[1, 1.5]} frameloop={props.still ? 'demand' : 'always'}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      fallback={<span className="joy-placeholder">Joy</span>}
      onCreated={({ camera, gl }) => {
        camera.lookAt(0, 1.45, 0)
        gl.setClearColor(0x000000, 0)
      }}>
      <ambientLight intensity={1.4} />
      <directionalLight position={[-3, 5, 4]} intensity={3} color="#fff3e3" />
      <directionalLight position={[3, 2, -2]} intensity={2} color="#d8cbff" />
      <Character {...props} />
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.48, 1]}>
        <circleGeometry args={[0.88, 48]} />
        <meshBasicMaterial color="#a89bd4" transparent opacity={0.15} />
      </mesh>
    </Canvas>
  )
}
