import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  AnimationClip,
  AnimationMixer,
  Bone,
  BufferAttribute,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  InterpolateSmooth,
  LatheGeometry,
  LoopRepeat,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NumberKeyframeTrack,
  Skeleton,
  SkinnedMesh,
  SphereGeometry,
  SplineCurve,
  Uint16BufferAttribute,
  Vector2,
  VectorKeyframeTrack,
} from 'three'
import type { JoyState } from './JoyMascot'

interface SceneProps { state: JoyState; encourageSignal: number; still: boolean }

/* ──────────────────────────────────────────────────────────────────────────
 *  1. Necked Lathe Torso (3-bone smoothstep skinning)
 *  from user-provided drop-in, extended with geometries tracking & translate
 * ──────────────────────────────────────────────────────────────────────── */
export interface TorsoBuildConfig {
  hipsBoneIndex: number
  chestBoneIndex: number
  neckBoneIndex: number
  geometries: BufferGeometry[]
}

export function createNeckedTorsoGeometry(config: TorsoBuildConfig): LatheGeometry {
  const { hipsBoneIndex, chestBoneIndex, neckBoneIndex, geometries } = config

  const profilePoints = [
    new Vector2(0.001, -0.55),
    new Vector2(0.32, -0.50),
    new Vector2(0.46, -0.28),
    new Vector2(0.42, 0.02),
    new Vector2(0.44, 0.22),
    new Vector2(0.31, 0.38),
    new Vector2(0.18, 0.46),
    new Vector2(0.17, 0.58),
    new Vector2(0.001, 0.60),
  ]

  const spline = new SplineCurve(profilePoints)
  const sampled = spline.getPoints(32)
  const geo = new LatheGeometry(sampled, 36)
  geo.computeVertexNormals()

  const pos = geo.attributes.position
  const vertexCount = pos.count
  const skinIndices = new Uint16Array(vertexCount * 4)
  const skinWeights = new Float32Array(vertexCount * 4)

  const yMin = -0.55
  const yMax = 0.60
  const ySpan = yMax - yMin

  const smoothstep = (t: number) => {
    const c = MathUtils.clamp(t, 0, 1)
    return c * c * (3 - 2 * c)
  }

  for (let i = 0; i < vertexCount; i++) {
    const y = pos.getY(i)
    const normY = (y - yMin) / ySpan

    let wHips = 0
    let wChest = 0
    let wNeck = 0

    if (normY < 0.68) {
      const t = smoothstep((normY - 0.15) / 0.45)
      wHips = 1 - t
      wChest = t
    } else {
      const t = smoothstep((normY - 0.68) / 0.25)
      wChest = 1 - t
      wNeck = t
    }

    const idx4 = i * 4
    skinIndices[idx4] = hipsBoneIndex
    skinIndices[idx4 + 1] = chestBoneIndex
    skinIndices[idx4 + 2] = neckBoneIndex
    skinIndices[idx4 + 3] = 0

    skinWeights[idx4] = wHips
    skinWeights[idx4 + 1] = wChest
    skinWeights[idx4 + 2] = wNeck
    skinWeights[idx4 + 3] = 0
  }

  geo.setAttribute('skinIndex', new BufferAttribute(skinIndices, 4))
  geo.setAttribute('skinWeight', new BufferAttribute(skinWeights, 4))

  geometries.push(geo)
  return geo
}

/* ──────────────────────────────────────────────────────────────────────────
 *  2. Procedural Morph-Target Mouth
 * ──────────────────────────────────────────────────────────────────────── */
export interface MouthMorphRig {
  mesh: Mesh
  setSmile: (v: number) => void
  setOpen: (v: number) => void
  setOoh: (v: number) => void
}

export function createProceduralMorphMouth(
  material: MeshStandardMaterial | MeshPhysicalMaterial,
  geometries: BufferGeometry[],
  headRadius = 0.48,
): MouthMorphRig {
  const baseGeo = new SphereGeometry(1, 28, 20)
  const pos = baseGeo.attributes.position as Float32BufferAttribute
  const count = pos.count

  const halfWidth = 0.068
  const halfHeight = 0.022
  const halfDepth = 0.018

  for (let i = 0; i < count; i++) {
    const ux = pos.getX(i)
    const uy = pos.getY(i)
    const uz = pos.getZ(i)

    const x = ux * halfWidth
    const cornerTaper = 1 - 0.35 * (ux * ux)
    const y = uy * halfHeight * cornerTaper
    const surfaceWrapZ = -((x * x) / (2 * headRadius))
    const z = uz * halfDepth + surfaceWrapZ

    pos.setXYZ(i, x, y, z)
  }

  const smilePositions = new Float32Array(count * 3)
  const openPositions = new Float32Array(count * 3)
  const oohPositions = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)

    const normX = x / halfWidth
    const normY = y / halfHeight
    const x2 = normX * normX

    const smileLift = x2 * 0.026 + (normY > 0 ? -0.003 : 0.004) * (1 - x2)
    const smileX = x * 1.16
    const smileY = y + smileLift
    const smileZ = z - x2 * 0.006

    smilePositions[i * 3] = smileX
    smilePositions[i * 3 + 1] = smileY
    smilePositions[i * 3 + 2] = smileZ

    const centerWeight = Math.max(0, 1 - x2)
    const openSpread = normY >= 0 ? normY * 0.022 * centerWeight : normY * 0.048 * centerWeight
    const openX = x * 0.94
    const openY = y + openSpread
    const openZ = z + (normY < 0 ? -0.005 * centerWeight : 0)

    openPositions[i * 3] = openX
    openPositions[i * 3 + 1] = openY
    openPositions[i * 3 + 2] = openZ

    const oohX = x * 0.52
    const oohY = y * 1.45 + normY * 0.012 * centerWeight
    const oohZ = z + 0.012 * centerWeight

    oohPositions[i * 3] = oohX
    oohPositions[i * 3 + 1] = oohY
    oohPositions[i * 3 + 2] = oohZ
  }

  baseGeo.morphAttributes.position = [
    new BufferAttribute(smilePositions, 3),
    new BufferAttribute(openPositions, 3),
    new BufferAttribute(oohPositions, 3),
  ]

  baseGeo.computeVertexNormals()
  geometries.push(baseGeo)

  const mesh = new Mesh(baseGeo, material)
  mesh.frustumCulled = false
  mesh.updateMorphTargets()

  return {
    mesh,
    setSmile: (v: number) => {
      if (mesh.morphTargetInfluences) mesh.morphTargetInfluences[0] = v
    },
    setOpen: (v: number) => {
      if (mesh.morphTargetInfluences) mesh.morphTargetInfluences[1] = v
    },
    setOoh: (v: number) => {
      if (mesh.morphTargetInfluences) mesh.morphTargetInfluences[2] = v
    },
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 *  3. Saccadic Eye, Blink & Asymmetric Brow Controller (adapted)
 * ──────────────────────────────────────────────────────────────────────── */
type SimpleJoyState = 'idle' | 'listening' | 'speaking'
interface Rest {
  eyeLX: number
  eyeRX: number
  eyeY: number
  lidY: number
  browY: number
}
interface FaceNodes {
  eyeL: Mesh
  eyeR: Mesh
  highlightL: Mesh
  highlightR: Mesh
  lidL: Mesh
  lidR: Mesh
  browL: Mesh
  browR: Mesh
  blushMats: (MeshStandardMaterial | MeshPhysicalMaterial)[]
  mouth: MouthMorphRig
  rest: Rest
}

class ExpressiveFaceController {
  private nextBlinkTime = 2.4
  private blinkStart = -1
  private readonly blinkDuration = 0.17

  private nextSaccadeTime = 0.8
  private targetGazeX = 0
  private targetGazeY = 0
  private curGazeX = 0
  private curGazeY = 0

  private curSmile = 0.55
  private curOpen = 0
  private curOoh = 0
  private curSquint = 0

  private curBrowRaiseL = 0
  private curBrowRaiseR = 0
  private curBrowTiltL = 0
  private curBrowTiltR = 0

  public update(
    t: number,
    dt: number,
    state: SimpleJoyState,
    nodes: FaceNodes,
    pointer?: { x: number; y: number },
    still = false,
  ): number {
    const damp = MathUtils.damp
    if (still) {
      // freeze but keep a gentle smile
      nodes.mouth.setSmile(0.62)
      nodes.mouth.setOpen(0.02)
      nodes.mouth.setOoh(0)
      return 0
    }

    let blinkEnv = 0

    // ── Saccades
    if (t >= this.nextSaccadeTime) {
      if (state === 'listening') {
        this.targetGazeX = (Math.random() - 0.5) * 0.016
        this.targetGazeY = (Math.random() - 0.5) * 0.01
        this.nextSaccadeTime = t + 1.4 + Math.random() * 2.2
      } else if (state === 'speaking') {
        const glanceAway = Math.random() < 0.28
        this.targetGazeX = glanceAway ? (Math.random() - 0.5) * 0.048 : (Math.random() - 0.5) * 0.018
        this.targetGazeY = glanceAway ? 0.018 + Math.random() * 0.015 : (Math.random() - 0.5) * 0.012
        this.nextSaccadeTime = t + 0.65 + Math.random() * 1.4
      } else {
        this.targetGazeX = (Math.random() - 0.5) * 0.042
        this.targetGazeY = (Math.random() - 0.5) * 0.024
        this.nextSaccadeTime = t + 1.2 + Math.random() * 2.6
      }
    }

    const ptrX = pointer ? MathUtils.clamp(pointer.x * 0.018, -0.02, 0.02) : 0
    const ptrY = pointer ? MathUtils.clamp(pointer.y * 0.014, -0.015, 0.015) : 0

    this.curGazeX = damp(this.curGazeX, this.targetGazeX + ptrX, 22, dt)
    this.curGazeY = damp(this.curGazeY, this.targetGazeY + ptrY, 22, dt)

    nodes.eyeL.position.x = nodes.rest.eyeLX + this.curGazeX
    nodes.eyeR.position.x = nodes.rest.eyeRX + this.curGazeX
    nodes.eyeL.position.y = nodes.rest.eyeY + this.curGazeY
    nodes.eyeR.position.y = nodes.rest.eyeY + this.curGazeY
    nodes.highlightL.position.x = nodes.eyeL.position.x - 0.018
    nodes.highlightR.position.x = nodes.eyeR.position.x - 0.018
    nodes.highlightL.position.y = nodes.eyeL.position.y + 0.028
    nodes.highlightR.position.y = nodes.eyeR.position.y + 0.028

    // ── Blink + friendly tilt
    if (t >= this.nextBlinkTime && this.blinkStart < 0) {
      this.blinkStart = t
      const isDoubleBlink = Math.random() < 0.15
      this.nextBlinkTime = t + (isDoubleBlink ? 0.26 : 2.8 + Math.random() * 3.2)
    }

    if (this.blinkStart >= 0) {
      const p = (t - this.blinkStart) / this.blinkDuration
      if (p >= 1) this.blinkStart = -1
      else blinkEnv = Math.sin(p * Math.PI)
    }

    const targetSquint = state === 'listening' ? 0.14 : state === 'speaking' ? 0.06 : 0.0
    this.curSquint = damp(this.curSquint, targetSquint, 10, dt)

    const lidClosure = Math.min(1, blinkEnv + this.curSquint)
    const lidScaleY = MathUtils.lerp(0.075, 0.22, lidClosure)
    const eyeScaleY = MathUtils.lerp(0.092, 0.012, blinkEnv)

    nodes.lidL.scale.y = lidScaleY
    nodes.lidR.scale.y = lidScaleY
    nodes.lidL.position.y = nodes.rest.lidY - lidClosure * 0.032 + this.curGazeY * 0.35
    nodes.lidR.position.y = nodes.rest.lidY - lidClosure * 0.032 + this.curGazeY * 0.35
    nodes.lidL.rotation.z = 0.06
    nodes.lidR.rotation.z = -0.06

    nodes.eyeL.scale.y = eyeScaleY
    nodes.eyeR.scale.y = eyeScaleY
    nodes.highlightL.visible = blinkEnv < 0.65
    nodes.highlightR.visible = blinkEnv < 0.65

    // ── Brows asymmetric
    let targetBrowRaiseL = 0.008
    let targetBrowRaiseR = 0.008
    let targetBrowTiltL = 0.12
    let targetBrowTiltR = -0.12

    if (state === 'listening') {
      targetBrowRaiseL = 0.024
      targetBrowRaiseR = 0.015
      targetBrowTiltL = 0.20
      targetBrowTiltR = -0.14
    } else if (state === 'speaking') {
      const cadencePulse = Math.sin(t * 4.2) * 0.012 + Math.sin(t * 2.1) * 0.008
      targetBrowRaiseL = 0.018 + cadencePulse * 1.15
      targetBrowRaiseR = 0.016 + cadencePulse * 0.85
      targetBrowTiltL = 0.16
      targetBrowTiltR = -0.16
    }

    this.curBrowRaiseL = damp(this.curBrowRaiseL, targetBrowRaiseL, 9, dt)
    this.curBrowRaiseR = damp(this.curBrowRaiseR, targetBrowRaiseR, 9, dt)
    this.curBrowTiltL = damp(this.curBrowTiltL, targetBrowTiltL, 8, dt)
    this.curBrowTiltR = damp(this.curBrowTiltR, targetBrowTiltR, 8, dt)

    nodes.browL.position.y = nodes.rest.browY + this.curBrowRaiseL
    nodes.browR.position.y = nodes.rest.browY + this.curBrowRaiseR
    nodes.browL.rotation.z = this.curBrowTiltL
    nodes.browR.rotation.z = this.curBrowTiltR

    // ── Mouth morphs
    let targetSmile = 0.62
    let targetOpen = 0.0
    let targetOoh = 0.0

    if (state === 'listening') {
      targetSmile = 0.78
      targetOpen = 0.04
    } else if (state === 'speaking') {
      const syllableWave = Math.max(0, Math.sin(t * 15.5) * 0.65 + Math.sin(t * 7.3) * 0.45)
      const vowelAlternation = Math.max(0, Math.sin(t * 3.8))
      targetSmile = 0.42 + (1 - vowelAlternation) * 0.35
      targetOpen = syllableWave * (0.85 - vowelAlternation * 0.3)
      targetOoh = syllableWave * vowelAlternation * 0.65
    }

    this.curSmile = damp(this.curSmile, targetSmile, 12, dt)
    this.curOpen = damp(this.curOpen, targetOpen, 18, dt)
    this.curOoh = damp(this.curOoh, targetOoh, 14, dt)

    nodes.mouth.setSmile(this.curSmile)
    nodes.mouth.setOpen(this.curOpen)
    nodes.mouth.setOoh(this.curOoh)

    const targetBlush = state === 'speaking' ? 0.44 + Math.sin(t * 3.0) * 0.08 : state === 'listening' ? 0.48 : 0.36
    nodes.blushMats.forEach(m => {
      ;(m as any).opacity = damp((m as any).opacity, targetBlush, 6, dt)
    })

    return blinkEnv
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Main Rig — 11 bones: hips, spine, chest, neck, head, upper L/R, forearm L/R, foot L/R
 * ──────────────────────────────────────────────────────────────────────── */
function buildRig() {
  const root = new Group()
  root.name = 'joyRoot'

  // Materials — physical with sheen for faux subsurface (zero download)
  const lavender = new MeshPhysicalMaterial({
    color: '#a89bd4',
    roughness: 0.58,
    metalness: 0.02,
    sheen: 0.45,
    sheenRoughness: 0.5,
    sheenColor: new Color('#ffd6cc'),
  })
  const peach = new MeshPhysicalMaterial({
    color: '#f4c6a6',
    roughness: 0.65,
    sheen: 0.35,
    sheenRoughness: 0.6,
    sheenColor: new Color('#ffccbb'),
    transparent: false,
  })
  const ink = new MeshStandardMaterial({ color: '#3a3550', roughness: 0.48 })
  const sage = new MeshStandardMaterial({ color: '#8fb39b', roughness: 0.65 })
  const white = new MeshStandardMaterial({ color: '#fffaf5', roughness: 0.35 })

  const geometries: BufferGeometry[] = []
  const materials: (MeshStandardMaterial | MeshPhysicalMaterial)[] = [lavender, peach, ink, sage, white]

  function orb(
    parent: Group | Bone,
    material: MeshStandardMaterial | MeshPhysicalMaterial,
    position: [number, number, number],
    scale: [number, number, number],
    name?: string,
  ) {
    const g = new SphereGeometry(1, 28, 22)
    geometries.push(g)
    const m = new Mesh(g, material)
    m.position.set(...position)
    m.scale.set(...scale)
    if (name) m.name = name
    m.frustumCulled = false
    parent.add(m)
    return m as Mesh
  }

  function joint(name: string, parent: Group | Bone, position: [number, number, number]) {
    const b = new Bone()
    b.name = name
    b.position.set(...position)
    parent.add(b)
    return b
  }

  // ── 11 bones ──
  const hips = joint('hips', root, [0, 0.62, 0])
  const spine = joint('spine', hips, [0, 0.30, 0])
  const chest = joint('chest', spine, [0, 0.30, 0])
  const neck = joint('neck', chest, [0, 0.34, 0])
  const head = joint('head', neck, [0, 0.18, 0])
  const upperArmL = joint('upperArm.L', chest, [-0.44, -0.04, 0])
  const forearmL = joint('forearm.L', upperArmL, [0, -0.36, 0])
  const upperArmR = joint('upperArm.R', chest, [0.44, -0.04, 0])
  const forearmR = joint('forearm.R', upperArmR, [0, -0.36, 0])
  const footL = joint('foot.L', hips, [-0.30, -0.46, 0.05])
  const footR = joint('foot.R', hips, [0.30, -0.46, 0.05])

  const skeleton = new Skeleton([hips, spine, chest, neck, head, upperArmL, forearmL, upperArmR, forearmR, footL, footR])

  // ── Torso: lathe silhouette hips→neck ──
  const torsoGeo = createNeckedTorsoGeometry({ hipsBoneIndex: 0, chestBoneIndex: 2, neckBoneIndex: 3, geometries })
  // Position raw profile (-0.55..0.60) to sit between hips and neck
  torsoGeo.translate(0, 1.06, 0)
  const torsoMesh = new SkinnedMesh(torsoGeo, lavender)
  torsoMesh.name = 'torso'
  torsoMesh.frustumCulled = false
  root.add(torsoMesh)
  root.updateMatrixWorld(true)
  torsoMesh.bind(skeleton)

  // Head volume (slightly bigger, friendly)
  const headMesh = orb(head, lavender, [0, 0, 0], [0.84, 0.74, 0.66], 'headMesh')

  // Feet
  orb(footL, peach, [0, -0.08, 0.13], [0.26, 0.19, 0.37], 'foot.L')
  orb(footR, peach, [0, -0.08, 0.13], [0.26, 0.19, 0.37], 'foot.R')

  // Segmented arms — elbow bends
  const leftUpper = orb(upperArmL, lavender, [0, -0.14, 0], [0.18, 0.30, 0.18], 'upper.L')
  const leftFore = orb(forearmL, lavender, [0, -0.14, 0], [0.15, 0.28, 0.15], 'fore.L')
  const rightUpper = orb(upperArmR, lavender, [0, -0.14, 0], [0.18, 0.30, 0.18], 'upper.R')
  const rightFore = orb(forearmR, lavender, [0, -0.14, 0], [0.15, 0.28, 0.15], 'fore.R')

  const leftHand = orb(forearmL, peach, [0, -0.44, 0.02], [0.14, 0.14, 0.14], 'hand.L')
  const rightHand = orb(forearmR, peach, [0, -0.44, 0.02], [0.14, 0.14, 0.14], 'hand.R')

  // Eyes, lids, brows, blush
  const eyes: Mesh[] = []
  const highlights: Mesh[] = []
  const lids: Mesh[] = []
  const brows: Mesh[] = []

  // Use spherical patches for blush that hug head curvature
  const blushMats: MeshPhysicalMaterial[] = []
  const blushMeshes: Mesh[] = []
  ;[-0.32, 0.32].forEach((x, idx) => {
    const mat = new MeshPhysicalMaterial({
      color: '#f4c6a6',
      roughness: 0.8,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    })
    blushMats.push(mat)
    materials.push(mat)
    const g = new SphereGeometry(0.09, 16, 12, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.45)
    geometries.push(g)
    const m = new Mesh(g, mat)
    m.position.set(x, -0.10, 0.52)
    m.rotation.y = x > 0 ? -0.6 : 0.6
    m.rotation.x = 0.12
    m.scale.set(0.9, 0.6, 0.5)
    m.name = `blush.${idx === 0 ? 'L' : 'R'}`
    m.frustumCulled = false
    head.add(m)
    blushMeshes.push(m)
  })

  const sides: Array<{ x: number; name: string }> = [
    { x: -0.26, name: 'L' },
    { x: 0.26, name: 'R' },
  ]

  sides.forEach(({ x, name }) => {
    orb(head, peach, [x * 1.5, -0.12, 0.50], [0.15, 0.088, 0.055], `socket.${name}`)
    const eye = orb(head, ink, [x, 0.10, 0.58], [0.069, 0.093, 0.05], `eye.${name}`)
    const hl = orb(head, white, [x - 0.018, 0.128, 0.615], [0.019, 0.024, 0.011], `hl.${name}`)
    // Lid as spherical patch hugging head
    const lidGeo = new SphereGeometry(0.095, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55)
    geometries.push(lidGeo)
    const lidMat = lavender.clone() as MeshPhysicalMaterial
    lidMat.polygonOffset = true
    lidMat.polygonOffsetFactor = -1
    lidMat.transparent = false
    materials.push(lidMat)
    const lid = new Mesh(lidGeo, lidMat)
    lid.position.set(x, 0.20, 0.585)
    lid.scale.set(1.5, 0.85, 0.65)
    lid.rotation.x = -0.15
    lid.name = `lid.${name}`
    lid.frustumCulled = false
    head.add(lid)

    eyes.push(eye)
    highlights.push(hl)
    lids.push(lid)
  })

  const browL = orb(head, sage, [-0.14, 0.70, 0.06], [0.26, 0.105, 0.11], 'brow.L')
  const browR = orb(head, sage, [0.14, 0.74, 0.06], [0.25, 0.11, 0.11], 'brow.R')
  browL.rotation.z = -0.42
  browR.rotation.z = 0.52
  brows.push(browL, browR)

  // Morph mouth
  const mouthMat = new MeshStandardMaterial({ color: '#3a3550', roughness: 0.5 })
  materials.push(mouthMat)
  const mouthRig = createProceduralMorphMouth(mouthMat, geometries, 0.48)
  mouthRig.mesh.position.set(0, -0.16, 0.605)
  mouthRig.mesh.rotation.x = 0.08
  mouthRig.mesh.name = 'mouthMorph'
  head.add(mouthRig.mesh)

  // ── Animation: breathe clip with phase-delayed tracks ──
  const breathTimes = [0, 1.25, 2.5]
  const breathTimesDelayed = [0.25, 1.5, 2.75]

  const chestZ = [0, 0.028, 0]
  const neckX = [0, 0.016, 0]
  const shoulderRiseL = [0, 0.012, 0]
  const shoulderRiseR = [0, 0.012, 0]
  const chestScaleX = [1, 1.025, 1]
  const chestScaleZ = [1, 1.02, 1]

  const chestTrack = new NumberKeyframeTrack('chest.rotation[z]', breathTimes, chestZ)
  const neckTrack = new NumberKeyframeTrack('neck.rotation[x]', breathTimesDelayed, neckX)
  const upperLTrack = new NumberKeyframeTrack('upperArm.L.rotation[z]', breathTimesDelayed, shoulderRiseL)
  const upperRTrack = new NumberKeyframeTrack('upperArm.R.rotation[z]', breathTimesDelayed, shoulderRiseR)
  const chestScaleXTrack = new NumberKeyframeTrack('chest.scale[x]', breathTimes, chestScaleX)
  const chestScaleZTrack = new NumberKeyframeTrack('chest.scale[z]', breathTimes, chestScaleZ)

  ;[chestTrack, neckTrack, upperLTrack, upperRTrack, chestScaleXTrack, chestScaleZTrack].forEach(t => t.setInterpolation(InterpolateSmooth))

  const breatheClip = new AnimationClip('breathe', 2.75, [chestTrack, neckTrack, upperLTrack, upperRTrack, chestScaleXTrack, chestScaleZTrack])
  breatheClip.optimize()

  const mixer = new AnimationMixer(root)
  const breatheAction = mixer.clipAction(breatheClip)
  breatheAction.setLoop(LoopRepeat, Infinity)
  breatheAction.play()

  // Face controller
  const faceController = new ExpressiveFaceController()
  const faceNodes: FaceNodes = {
    eyeL: eyes[0],
    eyeR: eyes[1],
    highlightL: highlights[0],
    highlightR: highlights[1],
    lidL: lids[0],
    lidR: lids[1],
    browL: brows[0],
    browR: brows[1],
    blushMats: blushMats,
    mouth: mouthRig,
    rest: { eyeLX: -0.26, eyeRX: 0.26, eyeY: 0.10, lidY: 0.20, browY: 0.71 },
  }

  return {
    root,
    hips,
    spine,
    chest,
    neck,
    head,
    upperArmL,
    forearmL,
    upperArmR,
    forearmR,
    footL,
    footR,
    torsoMesh,
    headMesh,
    leftUpper,
    leftFore,
    rightUpper,
    rightFore,
    leftHand,
    rightHand,
    eyes,
    highlights,
    lids,
    brows,
    blushMeshes,
    blushMats,
    mouthRig,
    mixer,
    breatheAction,
    faceController,
    faceNodes,
    materials,
    geometries,
    skeleton,
    dispose() {
      try {
        mixer.stopAllAction()
        mixer.uncacheRoot(root)
      } catch {}
      geometries.forEach(g => { try { g.dispose() } catch {} })
      materials.forEach(m => { try { m.dispose() } catch {} })
      try { skeleton.dispose() } catch {}
    },
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Character Component
 * ──────────────────────────────────────────────────────────────────────── */
function Character({ state, encourageSignal, still }: SceneProps) {
  const rig = useMemo(() => buildRig(), [])
  const motion = useRef({
    time: 0,
    nodStart: -100,
    nodSignal: encourageSignal,
    prevState: state as JoyState,
    squashStart: -100,
    cur: {
      rootY: 0,
      rootRotY: -0.12,
      rootRotX: 0,
      rootScaleX: 1,
      rootScaleY: 1,
      rootScaleZ: 1,
      hipsScaleX: 1,
      hipsScaleY: 1,
      hipsScaleZ: 1,
      spineX: 0,
      spineZ: 0,
      chestZ: 0,
      chestX: 0,
      neckX: 0,
      neckZ: 0,
      headX: 0,
      headY: 0,
      headZ: 0,
      upperLZ: 0,
      upperRZ: 0,
      foreLX: 0,
      foreRX: 0,
    },
    drift: Math.random() * Math.PI * 2,
  })

  const invalidate = useThree(s => s.invalidate)

  useEffect(() => () => rig.dispose(), [rig])

  useEffect(() => {
    if (motion.current.nodSignal !== encourageSignal) {
      motion.current.nodSignal = encourageSignal
      motion.current.nodStart = still ? -100 : motion.current.time
      invalidate()
    }
  }, [encourageSignal, state, still, invalidate])

  useEffect(() => {
    // squash-and-stretch on state change
    if (motion.current.prevState !== state) {
      motion.current.prevState = state
      motion.current.squashStart = motion.current.time
      invalidate()
    }
  }, [state, invalidate])

  useEffect(() => {
    rig.breatheAction.paused = still
    rig.breatheAction.timeScale = still ? 0 : 1
    if (!still && !rig.breatheAction.isRunning()) rig.breatheAction.play()
  }, [still, rig.breatheAction])

  useFrame((frameState, delta) => {
    const m = motion.current
    const dt = Math.min(delta, 0.05)
    if (!still) m.time += dt
    const t = m.time
    const cur = m.cur

    if (!still) rig.mixer.update(dt)

    // ── Nod ──
    const nodAge = t - m.nodStart
    const nod = !still && nodAge >= 0 && nodAge < 0.85 ? Math.sin((nodAge / 0.85) * Math.PI) * 0.28 : 0

    // ── Squash-and-stretch impulse ──
    const squashAge = t - m.squashStart
    const squashActive = !still && squashAge >= 0 && squashAge < 0.22
    const squashT = squashActive ? Math.sin((squashAge / 0.22) * Math.PI) : 0
    // brief vertical squash + horizontal stretch
    const squashScaleY = 1 - squashT * 0.08
    const squashScaleXZ = 1 + squashT * 0.04

    const isTalking = state === 'speaking'
    const isListening = state === 'listening'
    const isConnecting = state === 'connecting'
    const isEnded = state === 'ended'

    const mapped: SimpleJoyState = isListening ? 'listening' : isTalking ? 'speaking' : 'idle'

    // ── Face controller (saccades, blink, brows, morph mouth) ──
    rig.faceController.update(t, dt, mapped, rig.faceNodes, frameState.pointer, still)

    // ── Body targets ──
    const targets = {
      rootY: still ? 0 : Math.sin(t * 1.1 + m.drift) * 0.018 + Math.sin(t * 2.1) * 0.01,
      rootRotY: -0.12 + (still ? 0 : Math.sin(t * 0.55 + m.drift) * 0.045 + (isConnecting ? Math.sin(t * 1.6) * 0.08 : 0) + (frameState.pointer?.x ?? 0) * (still ? 0 : 0.05)),
      rootRotX: (isListening ? -0.03 : 0) + (frameState.pointer?.y ? frameState.pointer.y * (still ? 0 : -0.03) : 0),
      rootScaleX: squashScaleXZ,
      rootScaleY: squashScaleY,
      rootScaleZ: squashScaleXZ,
      hipsScaleX: squashScaleXZ,
      hipsScaleY: squashScaleY,
      hipsScaleZ: squashScaleXZ,
      spineX: still ? 0 : (isListening ? -0.04 : 0) + Math.sin(t * 0.7) * 0.015,
      spineZ: still ? 0 : Math.sin(t * 0.6) * 0.018,
      chestZ: still ? 0 : Math.sin(t * 0.85) * 0.018 + (isListening ? 0.018 : 0),
      chestX: isListening ? -0.05 : isTalking ? -0.018 : 0,
      neckX: nod * 0.35 + (isListening ? -0.06 : isTalking ? Math.sin(t * 4.8) * 0.02 : 0),
      neckZ: isListening ? 0.04 : 0, // 35% of listen tilt goes to neck
      headX: nod * 0.65 + (isTalking && !still ? Math.sin(t * 5) * 0.03 : 0),
      headY: still ? 0 : isConnecting ? Math.sin(t * 1.4) * 0.14 : isTalking ? Math.sin(t * 0.95) * 0.10 : Math.sin(t * 0.38 + m.drift) * 0.12,
      headZ: isListening ? 0.07 : still ? 0 : Math.sin(t * 0.36) * 0.05, // 65% to head
      upperLZ: isTalking && !still ? Math.sin(t * 2.2) * 0.16 : -0.02,
      upperRZ: isEnded ? 2.0 : isTalking && !still ? Math.sin(t * 2.2 + 1) * 0.18 : 0.02,
      foreLX: isListening ? -0.35 : isTalking ? -0.22 + Math.sin(t * 3.1) * 0.22 : -0.15,
      foreRX: isEnded ? -0.6 : isListening ? -0.30 : isTalking ? -0.18 + Math.sin(t * 3.1 + 0.8) * 0.18 : -0.12,
    }

    if (still) Object.assign(cur, targets)

    cur.rootY = MathUtils.damp(cur.rootY, targets.rootY, 3, dt)
    cur.rootRotY = MathUtils.damp(cur.rootRotY, targets.rootRotY, 4, dt)
    cur.rootRotX = MathUtils.damp(cur.rootRotX, targets.rootRotX, 5, dt)
    cur.rootScaleX = MathUtils.damp(cur.rootScaleX, targets.rootScaleX, 18, dt)
    cur.rootScaleY = MathUtils.damp(cur.rootScaleY, targets.rootScaleY, 18, dt)
    cur.rootScaleZ = MathUtils.damp(cur.rootScaleZ, targets.rootScaleZ, 18, dt)
    cur.hipsScaleX = MathUtils.damp(cur.hipsScaleX, targets.hipsScaleX, 18, dt)
    cur.hipsScaleY = MathUtils.damp(cur.hipsScaleY, targets.hipsScaleY, 18, dt)
    cur.hipsScaleZ = MathUtils.damp(cur.hipsScaleZ, targets.hipsScaleZ, 18, dt)
    cur.spineX = MathUtils.damp(cur.spineX, targets.spineX, 4, dt)
    cur.spineZ = MathUtils.damp(cur.spineZ, targets.spineZ, 4, dt)
    cur.chestZ = MathUtils.damp(cur.chestZ, targets.chestZ, 4, dt)
    cur.chestX = MathUtils.damp(cur.chestX, targets.chestX, 4, dt)
    cur.neckX = MathUtils.damp(cur.neckX, targets.neckX, 8, dt)
    cur.neckZ = MathUtils.damp(cur.neckZ, targets.neckZ, 7, dt)
    cur.headX = MathUtils.damp(cur.headX, targets.headX, 10, dt)
    cur.headY = MathUtils.damp(cur.headY, targets.headY, 6, dt)
    cur.headZ = MathUtils.damp(cur.headZ, targets.headZ, 7, dt)
    cur.upperLZ = MathUtils.damp(cur.upperLZ, targets.upperLZ, 7, dt)
    cur.upperRZ = MathUtils.damp(cur.upperRZ, targets.upperRZ, 7, dt)
    cur.foreLX = MathUtils.damp(cur.foreLX, targets.foreLX, 8, dt)
    cur.foreRX = MathUtils.damp(cur.foreRX, targets.foreRX, 8, dt)

    // ── Apply (mixer first, then procedural overrides) ──
    rig.root.position.y = cur.rootY
    rig.root.rotation.y = cur.rootRotY
    rig.root.rotation.x = cur.rootRotX
    rig.root.scale.set(cur.rootScaleX, cur.rootScaleY, cur.rootScaleZ)

    rig.hips.scale.set(cur.hipsScaleX, cur.hipsScaleY, cur.hipsScaleZ)

    // Spine / chest / neck keep mixer baseline
    const mixerChestZ = still ? 0 : rig.chest.rotation.z
    const mixerNeckX = still ? 0 : rig.neck.rotation.x
    rig.spine.rotation.x = cur.spineX
    rig.spine.rotation.z = cur.spineZ
    rig.chest.rotation.z = mixerChestZ + cur.chestZ * 0.6
    rig.chest.rotation.x = cur.chestX
    rig.neck.rotation.x = mixerNeckX + cur.neckX
    rig.neck.rotation.z = cur.neckZ

    rig.head.rotation.x = cur.headX
    rig.head.rotation.y = cur.headY
    rig.head.rotation.z = cur.headZ

    rig.upperArmL.rotation.z = cur.upperLZ
    rig.upperArmR.rotation.z = cur.upperRZ
    rig.forearmL.rotation.x = cur.foreLX
    rig.forearmR.rotation.x = cur.foreRX
  })

  return <primitive object={rig.root} dispose={null} />
}

export default function JoyScene(props: SceneProps) {
  return (
    <Canvas
      aria-hidden="true"
      camera={{ position: [0, 1.58, 5.8], fov: 34 }}
      dpr={[1, 1.5]}
      frameloop={props.still ? 'demand' : 'always'}
      shadows="percentage"
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      fallback={<span className="joy-placeholder">Joy</span>}
      onCreated={({ camera, gl }) => {
        camera.lookAt(0, 1.48, 0)
        gl.setClearColor(0x000000, 0)
      }}
    >
      <ambientLight intensity={0.95} />
      <hemisphereLight args={['#fff4e6', '#c5b6e0', 0.6]} />
      <directionalLight position={[-3, 5, 4]} intensity={2.5} color="#fff3e3" />
      <directionalLight position={[3, 2, -2]} intensity={1.3} color="#d8cbff" />
      <Character {...props} />
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.08, 0.55, 1]}>
        <circleGeometry args={[0.95, 48]} />
        <meshBasicMaterial color="#a89bd4" transparent opacity={0.15} />
      </mesh>
    </Canvas>
  )
}
