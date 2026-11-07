import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  AnimationClip,
  AnimationMixer,
  Bone,
  Float32BufferAttribute,
  Group,
  LoopRepeat,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  NumberKeyframeTrack,
  Skeleton,
  SkinnedMesh,
  SphereGeometry,
  Uint16BufferAttribute,
  InterpolateSmooth,
} from 'three'
import type { JoyState } from './JoyMascot'

interface SceneProps { state: JoyState; encourageSignal: number; still: boolean }

type Rig = ReturnType<typeof buildRig>

function buildRig() {
  const root = new Group()
  root.name = 'joyRoot'

  const lavender = new MeshStandardMaterial({ color: '#a89bd4', roughness: 0.55, metalness: 0.02 })
  const peach = new MeshStandardMaterial({ color: '#f4c6a6', roughness: 0.72, metalness: 0.0 })
  const ink = new MeshStandardMaterial({ color: '#3a3550', roughness: 0.48 })
  const sage = new MeshStandardMaterial({ color: '#8fb39b', roughness: 0.65 })
  const white = new MeshStandardMaterial({ color: '#fffaf5', roughness: 0.35 })
  const shadowMat = new MeshStandardMaterial({ color: '#a89bd4', roughness: 1, transparent: true, opacity: 0 })

  const geometries: SphereGeometry[] = []
  const materials = [lavender, peach, ink, sage, white]

  function orb(
    parent: Group | Bone,
    material: MeshStandardMaterial,
    position: [number, number, number],
    scale: [number, number, number],
    name?: string,
  ) {
    const g = new SphereGeometry(1, 32, 24)
    geometries.push(g)
    const m = new Mesh(g, material)
    m.position.set(...position)
    m.scale.set(...scale)
    if (name) m.name = name
    m.castShadow = false
    m.receiveShadow = false
    m.frustumCulled = false
    parent.add(m)
    return m
  }

  function joint(name: string, parent: Group | Bone, position: [number, number, number]) {
    const b = new Bone()
    b.name = name
    b.position.set(...position)
    parent.add(b)
    return b
  }

  const hips = joint('hips', root, [0, 0.8, 0])
  const chest = joint('chest', hips, [0, 0.65, 0])
  const head = joint('head', chest, [0, 0.56, 0])
  const leftArm = joint('arm.L', chest, [-0.62, 0.02, 0])
  const rightArm = joint('arm.R', chest, [0.62, 0.02, 0])
  const leftFoot = joint('foot.L', hips, [-0.32, -0.48, 0.05])
  const rightFoot = joint('foot.R', hips, [0.32, -0.48, 0.05])

  // Body — weighted between hips (0) and chest (1) for a soft sack torso.
  const skeleton = new Skeleton([hips, chest, head, leftArm, rightArm, leftFoot, rightFoot])
  const bodyGeo = new SphereGeometry(1, 44, 36)
  bodyGeo.scale(0.74, 0.88, 0.54)
  bodyGeo.translate(0, 1.08, 0)
  geometries.push(bodyGeo)

  const pos = bodyGeo.attributes.position
  const indices: number[] = []
  const weights: number[] = []
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    const t = MathUtils.clamp((y - 0.62) / 0.95, 0, 1)
    // smoothstep for nicer chest transition
    const cw = t * t * (3 - 2 * t)
    indices.push(0, 1, 0, 0)
    weights.push(1 - cw, cw, 0, 0)
  }
  bodyGeo.setAttribute('skinIndex', new Uint16BufferAttribute(indices, 4))
  bodyGeo.setAttribute('skinWeight', new Float32BufferAttribute(weights, 4))

  const body = new SkinnedMesh(bodyGeo, lavender)
  body.name = 'body'
  body.frustumCulled = false
  body.castShadow = false
  root.add(body)
  root.updateMatrixWorld(true)
  body.bind(skeleton)

  // Head volume
  const headMesh = orb(head, lavender, [0, 0, 0], [0.82, 0.72, 0.63], 'headMesh')

  // Feet
  orb(leftFoot, peach, [0, -0.08, 0.14], [0.26, 0.19, 0.38], 'foot.L.mesh')
  orb(rightFoot, peach, [0, -0.08, 0.14], [0.26, 0.19, 0.38], 'foot.R.mesh')

  // Arms — upper + hand as separate meshes parented to arm bones
  const leftUpper = orb(leftArm, lavender, [-0.08, -0.28, 0], [0.2, 0.42, 0.22], 'arm.L.upper')
  const rightUpper = orb(rightArm, lavender, [0.08, -0.28, 0], [0.2, 0.42, 0.22], 'arm.R.upper')
  const leftHand = orb(leftArm, peach, [-0.16, -0.73, 0.02], [0.16, 0.16, 0.16], 'hand.L')
  const rightHand = orb(rightArm, peach, [0.16, -0.73, 0.02], [0.16, 0.16, 0.16], 'hand.R')

  // Eyes: socket, iris, highlight, plus a covering lid that scales.
  const eyeSockets: Mesh[] = []
  const eyes: Mesh[] = []
  const highlights: Mesh[] = []
  const lids: Mesh[] = []
  const eyebrows: Mesh[] = []

  const sides: Array<{ x: number; name: string }> = [
    { x: -0.26, name: 'L' },
    { x: 0.26, name: 'R' },
  ]

  sides.forEach(({ x, name }) => {
    const socket = orb(head, peach, [x * 1.52, -0.14, 0.51], [0.16, 0.095, 0.06], `socket.${name}`)
    const eye = orb(head, ink, [x, 0.09, 0.58], [0.068, 0.092, 0.05], `eye.${name}`)
    const hl = orb(head, white, [x - 0.018, 0.118, 0.616], [0.019, 0.024, 0.012], `highlight.${name}`)
    // Lid sits just above eye; scaling Y down covers the eye.
    const lid = orb(head, lavender, [x, 0.22, 0.595], [0.14, 0.08, 0.06], `lid.${name}`)
    eyeSockets.push(socket)
    eyes.push(eye)
    highlights.push(hl)
    lids.push(lid)
  })

  // Eyebrows — sage, slight tilt, expressive.
  const browL = orb(head, sage, [-0.14, 0.7, 0.02], [0.25, 0.1, 0.11], 'brow.L')
  const browR = orb(head, sage, [0.14, 0.75, 0.02], [0.24, 0.105, 0.11], 'brow.R')
  browL.rotation.z = -0.45
  browR.rotation.z = 0.58
  eyebrows.push(browL, browR)

  // Mouth — single mesh whose scale-y drives open/close.
  const mouth = orb(head, ink, [0, -0.18, 0.605], [0.11, 0.036, 0.026], 'mouth')
  // Subtle cheek blush — adds warmth without texture.
  const blushL = orb(head, peach, [-0.32, -0.12, 0.45], [0.08, 0.05, 0.04], 'blush.L')
  const blushR = orb(head, peach, [0.32, -0.12, 0.45], [0.08, 0.05, 0.04], 'blush.R')
  blushL.material = peach.clone()
  blushR.material = peach.clone()
  ;(blushL.material as MeshStandardMaterial).transparent = true
  ;(blushL.material as MeshStandardMaterial).opacity = 0.42
  ;(blushR.material as MeshStandardMaterial).transparent = true
  ;(blushR.material as MeshStandardMaterial).opacity = 0.42
  materials.push(blushL.material as MeshStandardMaterial, blushR.material as MeshStandardMaterial)

  // ── Animation: procedural base breath as a clip (shows AnimationMixer usage) ──
  // Two tracks: chest breathes in z, head nods slightly with breath.
  //   Following the skill: track names are "boneName.property" and mixer root covers descendants.
  const breathTimes = [0, 1.25, 2.5]
  const chestBreath = [0, 0.028, 0]
  const headBreath = [0, 0.018, 0]

  const chestTrack = new NumberKeyframeTrack('chest.rotation[z]', breathTimes, chestBreath)
  const headTrack = new NumberKeyframeTrack('head.rotation[x]', breathTimes, headBreath)
  chestTrack.setInterpolation(InterpolateSmooth)
  headTrack.setInterpolation(InterpolateSmooth)

  const breatheClip = new AnimationClip('breathe', 2.5, [chestTrack, headTrack])
  breatheClip.optimize()

  const mixer = new AnimationMixer(root)
  const breatheAction = mixer.clipAction(breatheClip)
  breatheAction.setLoop(LoopRepeat, Infinity)
  breatheAction.play()
  breatheAction.setEffectiveWeight(1)

  return {
    root,
    hips,
    chest,
    head,
    leftArm,
    rightArm,
    leftFoot,
    rightFoot,
    body,
    headMesh,
    leftUpper,
    rightUpper,
    leftHand,
    rightHand,
    eyeSockets,
    eyes,
    highlights,
    lids,
    eyebrows,
    blush: [blushL, blushR],
    mouth,
    mixer,
    breatheAction,
    materials,
    geometries,
    shadowMat,
    skeleton,
    dispose() {
      try {
        mixer.stopAllAction()
        mixer.uncacheRoot(root)
      } catch {}
      geometries.forEach(g => {
        try { g.dispose() } catch {}
      })
      materials.forEach(m => {
        try { m.dispose() } catch {}
      })
      try { skeleton.dispose() } catch {}
    },
  }
}

function Character({ state, encourageSignal, still }: SceneProps) {
  const rig = useMemo(() => buildRig(), [])
  const motion = useRef({
    time: 0,
    nodStart: -100,
    nodSignal: encourageSignal,
    // blink state
    nextBlink: 1.5 + Math.random() * 1.5,
    blinkStart: -100,
    blinkDuration: 0.18,
    // smoothed values for damping
    cur: {
      rootY: 0,
      rootRotY: -0.12,
      rootRotX: 0,
      chestZ: 0,
      chestX: 0,
      headX: 0,
      headY: 0,
      headZ: 0,
      armLZ: -0.12,
      armRZ: 0.12,
      armLX: 0,
      armRX: 0,
      mouthY: 0.036,
      mouthX: 0.11,
      browLZ: -0.45,
      browRZ: 0.58,
    },
    // slight random drift so idle doesn't loop identically
    drift: Math.random() * Math.PI * 2,
  })
  const invalidate = useThree(s => s.invalidate)

  useEffect(() => () => rig.dispose(), [rig])

  useEffect(() => {
    if (motion.current.nodSignal !== encourageSignal) {
      motion.current.nodSignal = encourageSignal
      motion.current.nodStart = still ? -100 : motion.current.time
    }
    invalidate()
  }, [encourageSignal, state, still, invalidate])

  // Stop mixer when still, resume when motion returns
  useEffect(() => {
    rig.breatheAction.paused = still
    if (still) {
      rig.breatheAction.timeScale = 0
    } else {
      rig.breatheAction.timeScale = 1
      if (!rig.breatheAction.isRunning()) rig.breatheAction.play()
    }
  }, [still, rig.breatheAction])

  useFrame((_, delta) => {
    const m = motion.current
    const dt = Math.min(delta, 0.05)

    if (!still) m.time += dt
    const t = m.time
    const cur = m.cur

    // Mixer drives baseline breath on chest.z and head.x; we sample *after* mixer.update
    if (!still) rig.mixer.update(dt)

    // ── Nod envelope (encouraging) ──
    const nodAge = t - m.nodStart
    const nodActive = !still && nodAge >= 0 && nodAge < 0.85
    const nod = nodActive ? Math.sin((nodAge / 0.85) * Math.PI) * 0.26 : 0

    // ── Blink handling ──
    if (!still && t >= m.nextBlink && t - m.blinkStart > m.blinkDuration + 0.15) {
      m.blinkStart = t
      m.nextBlink = t + 3 + Math.random() * 2.7
    }
    const blinkAge = t - m.blinkStart
    const blinking = !still && blinkAge >= 0 && blinkAge < m.blinkDuration
    let blinkClosed = 0
    if (blinking) {
      const p = blinkAge / m.blinkDuration
      // ease: close fast, open fast — sin curve
      blinkClosed = Math.sin(p * Math.PI)
    }
    // also micro squint when listening hard
    const listenSquint = state === 'listening' ? 0.12 : 0

    // ── Target poses by state ──
    const isTalking = state === 'speaking'
    const isListening = state === 'listening'
    const isConnecting = state === 'connecting'
    const isEnded = state === 'ended'

    const targets = {
      rootY: still ? 0 : Math.sin(t * 1.1 + m.drift) * 0.02 + Math.sin(t * 2.2) * 0.012,
      rootRotY: -0.12 + (still ? 0 : Math.sin(t * 0.6 + m.drift) * 0.05 + (isConnecting ? Math.sin(t * 1.6) * 0.08 : 0)),
      rootRotX: isListening ? -0.04 : 0,
      chestZ: still ? 0 : Math.sin(t * 0.85) * 0.02 + (isListening ? 0.02 : 0),
      chestX: isListening ? -0.06 : isTalking ? -0.02 : 0,
      headX: nod + (isTalking && !still ? Math.sin(t * 5) * 0.04 + Math.sin(t * 12) * 0.015 : 0) + (isListening ? 0.06 : 0),
      headY: still ? 0 : isConnecting ? Math.sin(t * 1.4) * 0.16 : isTalking ? Math.sin(t * 1.0) * 0.12 : Math.sin(t * 0.42 + m.drift) * 0.14,
      headZ: isListening ? 0.11 : still ? 0 : Math.sin(t * 0.38) * 0.06,
      armLZ: isTalking && !still ? -0.12 + Math.sin(t * 2.4) * 0.18 + Math.sin(t * 3.7) * 0.06 : -0.12,
      armRZ: isEnded ? 2.05 : isTalking && !still ? 0.28 + Math.sin(t * 2.4 + 1) * 0.22 : 0.12,
      armLX: isListening ? 0.08 : isTalking ? 0.1 : 0,
      armRX: isEnded ? -0.4 : isListening ? -0.05 : 0,
      mouthY: isTalking ? (still ? 0.065 : 0.045 + (Math.sin(t * 17) + 1) * 0.045 + Math.sin(t * 8) * 0.015) : 0.036,
      mouthX: isTalking && !still ? 0.11 + Math.sin(t * 9) * 0.012 : 0.11,
      browLZ: isListening ? -0.22 : isTalking ? -0.52 : -0.45,
      browRZ: isListening ? 0.32 : isTalking ? 0.66 : 0.58,
    }

    // A demand loop may draw again for layout changes. Snap static poses so
    // those extra frames cannot continue a damped transition.
    if (still) Object.assign(cur, targets)

    // ── Damping (frame-rate independent exponential approach) ──
    // Higher lambda = faster snap. Values tuned for cozy, not twitchy.
    cur.rootY = MathUtils.damp(cur.rootY, targets.rootY, 3, dt)
    cur.rootRotY = MathUtils.damp(cur.rootRotY, targets.rootRotY, 4, dt)
    cur.rootRotX = MathUtils.damp(cur.rootRotX, targets.rootRotX, 5, dt)
    cur.chestZ = MathUtils.damp(cur.chestZ, targets.chestZ, 4, dt)
    cur.chestX = MathUtils.damp(cur.chestX, targets.chestX, 4, dt)
    cur.headX = MathUtils.damp(cur.headX, targets.headX, 10, dt)
    cur.headY = MathUtils.damp(cur.headY, targets.headY, 6, dt)
    cur.headZ = MathUtils.damp(cur.headZ, targets.headZ, 7, dt)
    cur.armLZ = MathUtils.damp(cur.armLZ, targets.armLZ, 7, dt)
    cur.armRZ = MathUtils.damp(cur.armRZ, targets.armRZ, 7, dt)
    cur.armLX = MathUtils.damp(cur.armLX, targets.armLX, 6, dt)
    cur.armRX = MathUtils.damp(cur.armRX, targets.armRX, 6, dt)
    cur.mouthY = MathUtils.damp(cur.mouthY, targets.mouthY, 18, dt)
    cur.mouthX = MathUtils.damp(cur.mouthX, targets.mouthX, 14, dt)
    cur.browLZ = MathUtils.damp(cur.browLZ, targets.browLZ, 8, dt)
    cur.browRZ = MathUtils.damp(cur.browRZ, targets.browRZ, 8, dt)

    // ── Apply — mixer first, then procedural overrides (skill rule) ──
    // Root bob (mixer does not touch root here; procedural handles it)
    rig.root.position.y = cur.rootY
    rig.root.rotation.y = cur.rootRotY
    rig.root.rotation.x = cur.rootRotX

    // Chest: mixer already set a baseline z; we add ours on top.
    // Preserve mixer contribution:
    const mixerChestZ = still ? 0 : rig.chest.rotation.z
    rig.chest.rotation.z = mixerChestZ + cur.chestZ * 0.6
    rig.chest.rotation.x = cur.chestX

    // Head: mixer contributed x (breath); add target X on top and set Y/Z procedurally.
    const mixerHeadX = still ? 0 : rig.head.rotation.x
    rig.head.rotation.x = mixerHeadX + cur.headX
    rig.head.rotation.y = cur.headY
    rig.head.rotation.z = cur.headZ

    rig.leftArm.rotation.z = cur.armLZ
    rig.leftArm.rotation.x = cur.armLX
    rig.rightArm.rotation.z = cur.armRZ
    rig.rightArm.rotation.x = cur.armRX

    // Eyebrows
    rig.eyebrows[0].rotation.z = cur.browLZ
    rig.eyebrows[1].rotation.z = cur.browRZ

    // Mouth
    rig.mouth.scale.y = cur.mouthY
    rig.mouth.scale.x = cur.mouthX

    // Eyes & lids — blink closes by shrinking eye scale y and expanding lid y.
    const openScale = 0.092
    const closedScale = 0.012
    const eyeScaleY = MathUtils.lerp(openScale, closedScale, MathUtils.clamp(blinkClosed + listenSquint, 0, 1))
    // Lids: when closed = 1, lid grows to cover eye
    const lidBase = 0.08
    const lidClosed = 0.22
    const lidScaleY = MathUtils.lerp(lidBase, lidClosed, blinkClosed)

    rig.eyes.forEach(eye => {
      eye.scale.y = eyeScaleY
    })
    rig.highlights.forEach((hl, i) => {
      // hide highlight when closed, keep subtle
      hl.visible = blinkClosed < 0.7
    })
    rig.eyes.forEach((eye, i) => {
      if (!still) {
        const baseX = i === 0 ? -0.26 : 0.26
        const lookX = isListening ? Math.sin(t * 0.7) * 0.025 : isTalking ? Math.sin(t * 0.9) * 0.012 : Math.sin(t * 0.3 + i) * 0.018
        const lookY = isListening ? 0.02 : isTalking ? Math.sin(t * 1.2 + i) * 0.006 : 0
        eye.position.x = baseX + lookX
        eye.position.y = 0.09 + lookY
        // highlight follows eye
        const h = rig.highlights[i]
        if (h) {
          h.position.x = eye.position.x - 0.018
          h.position.y = eye.position.y + 0.028
        }
      }
    })
    rig.lids.forEach(lid => {
      lid.scale.y = lidScaleY
      lid.position.y = MathUtils.lerp(0.22, 0.08, blinkClosed) // drop down to cover
      lid.visible = true
    })

    // Slight blush pulse when speaking
    const blushIntensity = isTalking && !still ? 0.42 + Math.sin(t * 3) * 0.08 : 0.42
    rig.blush.forEach((b: Mesh) => {
      const mat = b.material as MeshStandardMaterial
      if (mat.opacity !== undefined) mat.opacity = blushIntensity
    })
  })

  return <primitive object={rig.root} dispose={null} />
}

export default function JoyScene(props: SceneProps) {
  // When still, demand loop avoids a hot loop (skill: frameloop="demand" + invalidate)
  // dpr clamped for perf, alpha for soft mirror bg, low-power hint.
  return (
    <Canvas
      aria-hidden="true"
      camera={{ position: [0, 1.58, 5.8], fov: 34 }}
      dpr={[1, 1.5]}
      frameloop={props.still ? 'demand' : 'always'}
      shadows="percentage"
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      fallback={<span className="joy-placeholder">Joy</span>}
      onCreated={({ camera, gl, scene }) => {
        camera.lookAt(0, 1.45, 0)
        gl.setClearColor(0x000000, 0)
        // Mild environment-ish feel without external HDR (no downloads).
        scene.background = null
      }}
    >
      <ambientLight intensity={1.15} />
      <hemisphereLight args={['#fff5ea', '#c5b6e0', 0.65]} />
      <directionalLight position={[-3, 5, 4]} intensity={2.6} color="#fff3e3" castShadow={false} />
      <directionalLight position={[3, 2, -2]} intensity={1.4} color="#d8cbff" />
      <Character {...props} />
      {/* Soft contact shadow — circle, not requiring shadow map */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.5, 1]}>
        <circleGeometry args={[0.92, 48]} />
        <meshBasicMaterial color="#a89bd4" transparent opacity={0.16} />
      </mesh>
    </Canvas>
  )
}
