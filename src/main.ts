import './styles.css';
import * as THREE from 'three';

type GameMode = 'menu' | 'playing' | 'victory' | 'defeat';
type PlayerClass = 'warrior' | 'trojan' | 'archer' | 'taoist';
type ConsumableKind = 'health' | 'mana';
type ShopItem = ConsumableKind | 'meteor';
type AttackKind = 'melee' | 'ranged' | 'magic';
type Rarity = 'common' | 'magic' | 'elite' | 'legendary';
type EquipmentSlot = 'weapon' | 'armor' | 'ring' | 'boots';
type SkillId = 'palm' | 'dash' | 'shield' | 'cyclone';

type StatBlock = {
  maxHp?: number;
  maxMp?: number;
  attack?: number;
  defense?: number;
  speed?: number;
  crit?: number;
};

type Item = {
  id: string;
  name: string;
  rarity: Rarity;
  slot: EquipmentSlot;
  stats: StatBlock;
  icon: string;
  plus?: number;
};

type Obstacle = {
  x: number;
  z: number;
  w: number;
  d: number;
  label: string;
};

type EnemyKind = 'bandit' | 'serpent' | 'warden' | 'boss';

type Enemy = {
  id: number;
  kind: EnemyKind;
  name: string;
  level: number;
  group: THREE.Group;
  radius: number;
  maxHp: number;
  hp: number;
  damage: number;
  defense: number;
  speed: number;
  aggroRadius: number;
  attackRange: number;
  attackTimer: number;
  dead: boolean;
  xp: number;
  gold: number;
  label: THREE.Sprite;
  hpBar: THREE.Sprite;
  isBoss: boolean;
};

type LootDrop = {
  id: number;
  group: THREE.Group;
  item?: Item;
  gold?: number;
  picked: boolean;
  bobSeed: number;
};

type FloatingText = {
  el: HTMLDivElement;
  world: THREE.Vector3;
  age: number;
  duration: number;
};

type TimedEffect = {
  group: THREE.Group;
  age: number;
  duration: number;
  update: (dt: number, t: number) => void;
};

type SkillState = {
  id: SkillId;
  key: string;
  label: string;
  icon: string;
  cooldown: number;
  timer: number;
  mana: number;
  description: string;
};

type SkillLoadout = Record<SkillId, Omit<SkillState, 'id' | 'timer'>>;

type ClassProfile = {
  id: PlayerClass;
  name: string;
  icon: string;
  role: string;
  weapon: string;
  attackKind: AttackKind;
  attackVerb: string;
  projectileColor: number;
  accent: string;
  colors: { body: number; cloth: number; accent: number };
  base: Required<StatBlock>;
  attackRange: number;
  attackCooldown: number;
  starterWeapon: { name: string; stats: StatBlock; icon: string };
  starterArmor: { name: string; stats: StatBlock; icon: string };
  skills: SkillLoadout;
};

type PlayerState = {
  group: THREE.Group;
  radius: number;
  characterName: string;
  classId: PlayerClass;
  base: Required<StatBlock>;
  level: number;
  hp: number;
  mp: number;
  xp: number;
  nextXp: number;
  chi: number;
  maxChi: number;
  gold: number;
  potions: Record<ConsumableKind, number>;
  meteors: number;
  targetPos: THREE.Vector3 | null;
  targetEnemyId: number | null;
  attackTimer: number;
  shieldTimer: number;
  cycloneTimer: number;
  dashTimer: number;
  dashVelocity: THREE.Vector3;
  inventory: Item[];
  equipment: Record<EquipmentSlot, Item | null>;
};

type DebugApi = {
  start: () => Record<string, unknown>;
  reset: () => Record<string, unknown>;
  state: () => Record<string, unknown>;
  tick: (frames?: number, dt?: number) => Record<string, unknown>;
  hold: (code: string, down?: boolean) => Record<string, unknown>;
  moveTo: (x: number, z: number) => Record<string, unknown>;
  chooseClass: (classId: PlayerClass, name?: string) => Record<string, unknown>;
  startAs: (classId: PlayerClass, name?: string) => Record<string, unknown>;
  nearestEnemy: () => Record<string, unknown> | null;
  cast: (skill: SkillId) => Record<string, unknown>;
  basicAttack: () => Record<string, unknown>;
  usePotion: (kind: ConsumableKind) => Record<string, unknown>;
  buy: (item: ShopItem) => Record<string, unknown>;
  sellLoot: () => Record<string, unknown>;
  enhance: (slot?: EquipmentSlot) => Record<string, unknown>;
  grant: (gold?: number, meteors?: number) => Record<string, unknown>;
  killNearest: () => Record<string, unknown>;
  lootAll: () => Record<string, unknown>;
  runCombatProbe: () => Record<string, unknown>;
};

declare global {
  interface Window {
    __jadeDominionDebug: DebugApi;
  }
}

const WORLD_LIMIT = 25;
const PLAYER_START = new THREE.Vector3(-13, 0, 10);
const pointer = new THREE.Vector2();
const tmpVec = new THREE.Vector3();
const tmpVec2 = new THREE.Vector3();
const tmpMatrix = new THREE.Matrix4();
const rarityColor: Record<Rarity, string> = {
  common: '#d9e4ff',
  magic: '#68e8ff',
  elite: '#d487ff',
  legendary: '#ffd47b',
};
const rarityThree: Record<Rarity, number> = {
  common: 0xd9e4ff,
  magic: 0x68e8ff,
  elite: 0xd487ff,
  legendary: 0xffd47b,
};

const SHOP_PRICES: Record<ShopItem, number> = { health: 18, mana: 16, meteor: 90 };
const WORLD_SIZE = WORLD_LIMIT * 2;

const CLASS_PROFILES: Record<PlayerClass, ClassProfile> = {
  warrior: {
    id: 'warrior',
    name: 'Warrior',
    icon: '🛡️',
    role: 'durable front-liner with shield mitigation and cleave pressure',
    weapon: 'Blade + war shield',
    attackKind: 'melee',
    attackVerb: 'guard slash',
    projectileColor: 0xffd47b,
    accent: '#ffd47b',
    colors: { body: 0x37557f, cloth: 0x25304a, accent: 0xffd47b },
    base: { maxHp: 235, maxMp: 82, attack: 22, defense: 13, speed: 4.55, crit: 0.08 },
    attackRange: 1.45,
    attackCooldown: 0.72,
    starterWeapon: { name: 'Recruit Broadsword', stats: { attack: 7, defense: 2 }, icon: '🗡️' },
    starterArmor: { name: 'Iron Cotton Mail', stats: { maxHp: 42, defense: 5 }, icon: '🛡️' },
    skills: {
      palm: { key: '1', label: 'Blade Arc', icon: '🗡️', cooldown: 1.65, mana: 16, description: 'Short-range cleave around the Warrior.' },
      dash: { key: '2', label: 'Shield Charge', icon: '💢', cooldown: 4.8, mana: 22, description: 'Charge forward, clipping enemies in a line.' },
      shield: { key: '3', label: 'Iron Shirt', icon: '🛡️', cooldown: 9.5, mana: 26, description: 'Strong temporary damage reduction and regeneration.' },
      cyclone: { key: '4', label: 'Superman Roar', icon: '🔥', cooldown: 2, mana: 0, description: 'XP skill: rage aura and sweeping melee damage.' },
    },
  },
  trojan: {
    id: 'trojan',
    name: 'Trojan',
    icon: '⚔️',
    role: 'fast dual-weapon duelist with high crit and burst mobility',
    weapon: 'Twin sabres',
    attackKind: 'melee',
    attackVerb: 'twin slash',
    projectileColor: 0xff67a3,
    accent: '#ff86bf',
    colors: { body: 0x2c4d7b, cloth: 0x8d1d2c, accent: 0xffd47b },
    base: { maxHp: 185, maxMp: 110, attack: 27, defense: 7, speed: 5.35, crit: 0.16 },
    attackRange: 1.35,
    attackCooldown: 0.55,
    starterWeapon: { name: 'Training Twin Sabres', stats: { attack: 8, crit: 0.02 }, icon: '⚔️' },
    starterArmor: { name: 'Quilted Vanguard Vest', stats: { maxHp: 25, defense: 3 }, icon: '🥋' },
    skills: {
      palm: { key: '1', label: 'Fast Blade', icon: '⚡', cooldown: 1.4, mana: 18, description: 'A piercing blade wave along a target line.' },
      dash: { key: '2', label: 'Meteor Step', icon: '💫', cooldown: 4.2, mana: 24, description: 'Leap through enemies and cut a lane.' },
      shield: { key: '3', label: 'Blade Dance', icon: '🌹', cooldown: 8.5, mana: 28, description: 'Brief burst buff: more damage with partial mitigation.' },
      cyclone: { key: '4', label: 'Cyclone Burst', icon: '🌪️', cooldown: 2, mana: 0, description: 'XP skill: speed, orbiting blades, radial damage.' },
    },
  },
  archer: {
    id: 'archer',
    name: 'Archer',
    icon: '🏹',
    role: 'mobile ranged fighter with scatter shots and long attack reach',
    weapon: 'Composite bow',
    attackKind: 'ranged',
    attackVerb: 'arrow shot',
    projectileColor: 0x8de6ff,
    accent: '#8de6ff',
    colors: { body: 0x235c5d, cloth: 0x304b35, accent: 0x8de6ff },
    base: { maxHp: 165, maxMp: 105, attack: 23, defense: 5, speed: 5.75, crit: 0.18 },
    attackRange: 7.4,
    attackCooldown: 0.78,
    starterWeapon: { name: 'Bamboo Composite Bow', stats: { attack: 7, crit: 0.035 }, icon: '🏹' },
    starterArmor: { name: 'Scout Silk Coat', stats: { maxHp: 18, defense: 2, speed: 0.28 }, icon: '🧥' },
    skills: {
      palm: { key: '1', label: 'Scatter Shot', icon: '🎯', cooldown: 2.1, mana: 20, description: 'Fire arrows at several nearby enemies.' },
      dash: { key: '2', label: 'Cloud Hop', icon: '🪶', cooldown: 4.8, mana: 18, description: 'Quick evasive hop in the aimed direction.' },
      shield: { key: '3', label: 'Eagle Focus', icon: '🦅', cooldown: 9, mana: 26, description: 'Brief focus buff: higher attack while lightly protected.' },
      cyclone: { key: '4', label: 'Arrow Rain', icon: '🌧️', cooldown: 2, mana: 0, description: 'XP skill: wide storm that damages enemies around you.' },
    },
  },
  taoist: {
    id: 'taoist',
    name: 'Taoist',
    icon: '☯️',
    role: 'spellcaster with long-range magic, healing, and area damage',
    weapon: 'Prayer staff',
    attackKind: 'magic',
    attackVerb: 'spirit bolt',
    projectileColor: 0xb585ff,
    accent: '#c8a4ff',
    colors: { body: 0x463178, cloth: 0x24384f, accent: 0xc8a4ff },
    base: { maxHp: 150, maxMp: 175, attack: 25, defense: 4, speed: 5.0, crit: 0.1 },
    attackRange: 6.2,
    attackCooldown: 0.82,
    starterWeapon: { name: 'Apprentice Prayer Staff', stats: { attack: 9, maxMp: 30 }, icon: '🔮' },
    starterArmor: { name: 'Moon Temple Robe', stats: { maxHp: 15, maxMp: 20, defense: 2 }, icon: '🧙' },
    skills: {
      palm: { key: '1', label: 'Fire Circle', icon: '🔥', cooldown: 2.0, mana: 28, description: 'Launch a fire spell that blooms into area damage.' },
      dash: { key: '2', label: 'Spirit Step', icon: '✨', cooldown: 5.2, mana: 22, description: 'Blink in the aimed direction and recover mana.' },
      shield: { key: '3', label: 'Healing Rain', icon: '💚', cooldown: 8.8, mana: 34, description: 'Restore HP immediately and keep a ward active.' },
      cyclone: { key: '4', label: 'Thunderstorm', icon: '⛈️', cooldown: 2, mana: 0, description: 'XP skill: wide magical storm around the caster.' },
    },
  },
};


function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function planarDistance(a: THREE.Vector3, b: THREE.Vector3) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function damp(current: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

function makeCanvasTexture(draw: (ctx: CanvasRenderingContext2D, size: number) => void, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function makeTextSprite(text: string, color = '#ffe6ad', fontSize = 42, stroke = '#171008') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `900 ${fontSize}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 8;
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
  ctx.fillStyle = color;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(4.8, 1.2, 1);
  return sprite;
}

function makeHpBarSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 36;
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(2.6, 0.36, 1);
  sprite.userData.canvas = canvas;
  sprite.userData.texture = texture;
  return sprite;
}

function updateHpBar(sprite: THREE.Sprite, ratio: number, boss = false) {
  const canvas = sprite.userData.canvas as HTMLCanvasElement;
  const texture = sprite.userData.texture as THREE.CanvasTexture;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0,0,0,.72)';
  ctx.fillRect(0, 8, canvas.width, 18);
  ctx.strokeStyle = boss ? '#ffd47b' : '#381713';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 8.5, canvas.width - 3, 17);
  const fill = clamp(ratio, 0, 1) * (canvas.width - 8);
  const grad = ctx.createLinearGradient(4, 0, canvas.width - 4, 0);
  grad.addColorStop(0, boss ? '#8b111e' : '#b1121f');
  grad.addColorStop(1, boss ? '#ffb23e' : '#ff6262');
  ctx.fillStyle = grad;
  ctx.fillRect(4, 12, fill, 10);
  texture.needsUpdate = true;
}

function createRing(radius: number, color: number, opacity = 0.75) {
  const geometry = new THREE.RingGeometry(radius * 0.72, radius, 72);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
  const ring = new THREE.Mesh(geometry, material);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.035;
  return ring;
}

class JadeDominionGame {
  private readonly app: HTMLElement;
  private readonly scene = new THREE.Scene();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera: THREE.OrthographicCamera;
  private readonly clock = new THREE.Clock();
  private readonly raycaster = new THREE.Raycaster();
  private readonly groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly keys = new Set<string>();
  private readonly clickables: THREE.Object3D[] = [];
  private readonly obstacles: Obstacle[] = [];
  private readonly enemies: Enemy[] = [];
  private readonly loot: LootDrop[] = [];
  private readonly effects: TimedEffect[] = [];
  private readonly floating: FloatingText[] = [];
  private readonly ui: Record<string, HTMLElement> = {};
  private selectedClass: PlayerClass = 'trojan';
  private characterName = 'Jade Vanguard';
  private minimapVisible = true;
  private readonly skills: Record<SkillId, SkillState> = {
    palm: { id: 'palm', key: '1', label: 'Dragon Palm', icon: '🐉', cooldown: 1.8, timer: 0, mana: 18, description: 'Ranged burst that splashes jade fire.' },
    dash: { id: 'dash', key: '2', label: 'Meteor Step', icon: '💫', cooldown: 4.5, timer: 0, mana: 24, description: 'Leap through enemies and cut a line.' },
    shield: { id: 'shield', key: '3', label: 'Spirit Guard', icon: '🛡️', cooldown: 9, timer: 0, mana: 30, description: 'Reduce incoming damage and regenerate.' },
    cyclone: { id: 'cyclone', key: '4', label: 'Cyclone Burst', icon: '🌪️', cooldown: 2, timer: 0, mana: 0, description: 'XP/Chi ultimate: speed, orbiting blades, radial damage.' },
  };
  private mode: GameMode = 'menu';
  private elapsed = 0;
  private enemySeq = 1;
  private lootSeq = 1;
  private quest = { bandits: 0, serpents: 0, boss: false, bossSpawned: false };
  private touchInput = new THREE.Vector2();
  private keyboardInput = new THREE.Vector2();
  private joystickPointer: number | null = null;
  private joystickOrigin = new THREE.Vector2();
  private lastPointerWorld = new THREE.Vector3(1, 0, 0);
  private player: PlayerState;

  constructor(app: HTMLElement) {
    this.app = app;
    this.camera = new THREE.OrthographicCamera(-16, 16, 9, -9, 0.1, 120);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    app.appendChild(this.renderer.domElement);

    this.player = this.createPlayer();
    this.buildUi();
    this.configureScene();
    this.createWorld();
    this.installEvents();
    this.installDebugApi();
    this.resetGame(false);
    this.animate();
  }

  private configureScene() {
    this.scene.background = new THREE.Color(0x070b12);
    this.scene.fog = new THREE.FogExp2(0x101728, 0.024);
    const hemi = new THREE.HemisphereLight(0xf8e5ba, 0x26314a, 1.2);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffdfa1, 2.8);
    sun.position.set(-12, 24, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 70;
    sun.shadow.camera.left = -34;
    sun.shadow.camera.right = 34;
    sun.shadow.camera.top = 34;
    sun.shadow.camera.bottom = -34;
    sun.shadow.bias = -0.0001;
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x65f5ff, 0.8);
    rim.position.set(12, 10, -16);
    this.scene.add(rim);
    const shrineGlow = new THREE.PointLight(0x55f1b6, 20, 18, 2);
    shrineGlow.position.set(13, 3.5, -10);
    this.scene.add(shrineGlow);
    this.onResize();
  }

  private createWorld() {
    const groundTexture = makeCanvasTexture((ctx, size) => {
      ctx.fillStyle = '#192034';
      ctx.fillRect(0, 0, size, size);
      for (let y = 0; y < size; y += 32) {
        for (let x = 0; x < size; x += 32) {
          ctx.fillStyle = (x / 32 + y / 32) % 2 ? '#202946' : '#1b2239';
          ctx.fillRect(x, y, 32, 32);
          ctx.strokeStyle = 'rgba(255,216,130,.14)';
          ctx.strokeRect(x + 1, y + 1, 30, 30);
        }
      }
      for (let i = 0; i < 1600; i++) {
        ctx.fillStyle = `rgba(255,230,180,${Math.random() * 0.09})`;
        ctx.fillRect(Math.random() * size, Math.random() * size, 1.5, 1.5);
      }
    });
    groundTexture.repeat.set(12, 12);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(58, 58),
      new THREE.MeshStandardMaterial({ map: groundTexture, roughness: 0.92, metalness: 0.02 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.createPath(0, 0, 54, 6, 0);
    this.createPath(0, 0, 6, 54, 0);
    this.createPath(-10, 10, 16, 6, Math.PI / 5);
    this.createPath(11, -10, 18, 6, -Math.PI / 6);

    this.addObstacle({ x: 0, z: -2, w: 6.4, d: 5.2, label: 'Market Pavilion' }, 0xb36a29, 2.4);
    this.addObstacle({ x: -16, z: -11, w: 5.6, d: 7.5, label: 'Guild Hall' }, 0x6f3147, 3.2);
    this.addObstacle({ x: 13, z: -11, w: 5.8, d: 5.8, label: 'Spirit Shrine' }, 0x21635e, 3.0);
    this.addObstacle({ x: 16, z: 11, w: 7.2, d: 5.6, label: 'War Chest' }, 0x7b5431, 2.6);
    this.addObstacle({ x: -6, z: 16, w: 4.8, d: 4.8, label: 'Tea House' }, 0x406d51, 2.7);

    this.createPerimeterWalls();
    this.createDecor();
    this.scene.add(this.player.group);
  }

  private createPath(x: number, z: number, w: number, d: number, rot: number) {
    const texture = makeCanvasTexture((ctx, size) => {
      ctx.fillStyle = '#564030';
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 500; i++) {
        const c = 130 + Math.floor(Math.random() * 70);
        ctx.fillStyle = `rgba(${c},${c * 0.75},${c * 0.45},.18)`;
        ctx.beginPath();
        ctx.arc(Math.random() * size, Math.random() * size, randomRange(1, 4), 0, Math.PI * 2);
        ctx.fill();
      }
    }, 128);
    texture.repeat.set(w / 4, d / 4);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.08, d),
      new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 }),
    );
    mesh.position.set(x, 0.035, z);
    mesh.rotation.y = rot;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  private addObstacle(obstacle: Obstacle, color: number, height: number) {
    this.obstacles.push(obstacle);
    const group = new THREE.Group();
    group.position.set(obstacle.x, 0, obstacle.z);
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(obstacle.w, height, obstacle.d),
      new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.04 }),
    );
    base.position.y = height / 2;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(obstacle.w, obstacle.d) * 0.72, 1.4, 4),
      new THREE.MeshStandardMaterial({ color: 0x222b3c, roughness: 0.75, metalness: 0.12 }),
    );
    roof.position.y = height + 0.72;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    const label = makeTextSprite(obstacle.label, '#ffe6ad', 30);
    label.position.set(0, height + 2.1, 0);
    label.scale.set(5, 1.1, 1);
    group.add(label);

    this.scene.add(group);
  }

  private createPerimeterWalls() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x36415d, roughness: 0.72, metalness: 0.08 });
    const wallData = [
      { x: 0, z: -27, w: 56, d: 1 },
      { x: 0, z: 27, w: 56, d: 1 },
      { x: -27, z: 0, w: 1, d: 56 },
      { x: 27, z: 0, w: 1, d: 56 },
    ];
    for (const wall of wallData) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(wall.w, 2.4, wall.d), mat);
      mesh.position.set(wall.x, 1.2, wall.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    }
    for (let x = -22; x <= 22; x += 11) {
      for (const z of [-27, 27]) this.createLantern(x, z * 0.96);
    }
    for (let z = -22; z <= 22; z += 11) {
      for (const x of [-27, 27]) this.createLantern(x * 0.96, z);
    }
  }

  private createDecor() {
    for (let i = 0; i < 54; i++) {
      let x = randomRange(-24, 24);
      let z = randomRange(-24, 24);
      if (!this.canStandAt(new THREE.Vector3(x, 0, z), 0.8) || planarDistance(new THREE.Vector3(x, 0, z), PLAYER_START) < 4) {
        i -= 1;
        continue;
      }
      const type = Math.random();
      if (type < 0.44) this.createBamboo(x, z);
      else if (type < 0.78) this.createCrate(x, z);
      else this.createLantern(x, z);
    }

    const portal = new THREE.Group();
    portal.position.set(21, 0.05, -21);
    const ring = createRing(2.4, 0x55f1b6, 0.65);
    portal.add(ring);
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(1.75, 0.08, 12, 80),
      new THREE.MeshBasicMaterial({ color: 0x55f1b6, transparent: true, opacity: 0.8 }),
    );
    torus.rotation.x = Math.PI / 2;
    torus.position.y = 2.5;
    portal.add(torus);
    const label = makeTextSprite('Twin City Gate', '#92ffdc', 32);
    label.position.set(0, 4.1, 0);
    portal.add(label);
    this.scene.add(portal);
    this.effects.push({
      group: portal,
      age: 0,
      duration: Number.POSITIVE_INFINITY,
      update: (_, t) => {
        ring.rotation.z = t * 0.55;
        torus.rotation.z = t * 0.8;
        torus.scale.setScalar(1 + Math.sin(t * 2) * 0.07);
      },
    });
  }

  private createBamboo(x: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const stalkMat = new THREE.MeshStandardMaterial({ color: 0x59854a, roughness: 0.65 });
    for (let i = 0; i < 3; i++) {
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, randomRange(2.3, 4.2), 8), stalkMat);
      stalk.position.set(randomRange(-0.25, 0.25), stalk.geometry.parameters.height / 2, randomRange(-0.25, 0.25));
      stalk.rotation.z = randomRange(-0.08, 0.08);
      stalk.castShadow = true;
      group.add(stalk);
    }
    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(randomRange(0.55, 0.9), 1.2, 7),
      new THREE.MeshStandardMaterial({ color: 0x74a45b, roughness: 0.8 }),
    );
    leaves.position.y = randomRange(2.5, 3.8);
    leaves.castShadow = true;
    group.add(leaves);
    this.scene.add(group);
  }

  private createCrate(x: number, z: number) {
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(randomRange(0.7, 1.2), randomRange(0.55, 1), randomRange(0.7, 1.2)),
      new THREE.MeshStandardMaterial({ color: 0x7c5431, roughness: 0.9 }),
    );
    crate.position.set(x, crate.geometry.parameters.height / 2, z);
    crate.rotation.y = randomRange(0, Math.PI);
    crate.castShadow = true;
    crate.receiveShadow = true;
    this.scene.add(crate);
  }

  private createLantern(x: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.2, 8), new THREE.MeshStandardMaterial({ color: 0x26212a, roughness: 0.6 }));
    pole.position.y = 1.1;
    pole.castShadow = true;
    group.add(pole);
    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 16, 10),
      new THREE.MeshStandardMaterial({ color: 0xffb23e, emissive: 0xff8a18, emissiveIntensity: 1.9, roughness: 0.5 }),
    );
    lantern.position.y = 2.15;
    lantern.scale.y = 1.18;
    group.add(lantern);
    const light = new THREE.PointLight(0xffa43d, 2.8, 5.5, 2);
    light.position.y = 2.1;
    group.add(light);
    this.scene.add(group);
  }

  private createPlayer(): PlayerState {
    const group = new THREE.Group();
    group.name = 'Jade Vanguard player';
    group.position.copy(PLAYER_START);

    const shadow = createRing(0.72, 0xffd47b, 0.58);
    shadow.name = 'selection ring';
    group.add(shadow);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2c4d7b, roughness: 0.6, metalness: 0.12 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd47b, roughness: 0.42, metalness: 0.38 });
    const clothMat = new THREE.MeshStandardMaterial({ color: 0x8d1d2c, roughness: 0.78, metalness: 0.06 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf0b483, roughness: 0.7 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xc7d5df, roughness: 0.35, metalness: 0.75 });

    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.75, 10), clothMat);
    legs.position.y = 0.43;
    legs.userData.part = 'cloth';
    legs.castShadow = true;
    group.add(legs);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.43, 0.8, 6, 14), bodyMat);
    torso.position.y = 1.17;
    torso.userData.part = 'body';
    torso.castShadow = true;
    group.add(torso);

    const sash = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.045, 8, 32), goldMat);
    sash.position.y = 1.02;
    sash.userData.part = 'accent';
    sash.rotation.x = Math.PI / 2;
    group.add(sash);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 12), skinMat);
    head.position.y = 1.9;
    head.castShadow = true;
    group.add(head);

    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.42, 24), goldMat);
    hat.position.y = 2.18;
    hat.userData.part = 'accent';
    hat.castShadow = true;
    group.add(hat);

    const leftBlade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.2), steelMat);
    leftBlade.position.set(-0.52, 1.18, 0.28);
    leftBlade.rotation.x = 0.7;
    leftBlade.rotation.z = 0.2;
    leftBlade.userData.classWeapon = true;
    leftBlade.castShadow = true;
    group.add(leftBlade);
    const rightBlade = leftBlade.clone();
    rightBlade.position.x = 0.52;
    rightBlade.rotation.z = -0.2;
    rightBlade.userData.classWeapon = true;
    group.add(rightBlade);

    return {
      group,
      radius: 0.52,
      characterName: 'Jade Vanguard',
      classId: 'trojan',
      base: { maxHp: 180, maxMp: 110, attack: 24, defense: 7, speed: 5.2, crit: 0.12 },
      level: 1,
      hp: 180,
      mp: 110,
      xp: 0,
      nextXp: 130,
      chi: 0,
      maxChi: 100,
      gold: 0,
      potions: { health: 0, mana: 0 },
      meteors: 0,
      targetPos: null,
      targetEnemyId: null,
      attackTimer: 0,
      shieldTimer: 0,
      cycloneTimer: 0,
      dashTimer: 0,
      dashVelocity: new THREE.Vector3(),
      inventory: [],
      equipment: { weapon: null, armor: null, ring: null, boots: null },
    };
  }

  private buildUi() {
    const shell = document.createElement('div');
    shell.id = 'game-ui';
    shell.innerHTML = `
      <section id="start-screen">
        <div class="hero-card panel">
          <span class="kicker">Original Three.js MMORPG Slice</span>
          <h1>Jade Dominion Arena</h1>
          <p class="subtitle">A copyright-safe isometric action-RPG inspired by classic Conquer-style mechanics: click-to-move, fast melee, class archetypes, XP skill bursts, potions, shop economy, +N gear enhancement, loot, leveling, and a boss gate.</p>
          <div class="feature-grid">
            <div>⚔️ Four class archetypes</div>
            <div>🧭 WASD / click / touch movement</div>
            <div>💰 Shop, potions, meteors, +N gear</div>
          </div>
          <div class="creation-form">
            <label class="name-entry">Hero name <input id="character-name" maxlength="18" value="Jade Vanguard" autocomplete="off" /></label>
            <div class="class-grid" id="class-grid"></div>
            <div id="class-preview" class="class-preview"></div>
          </div>
          <button id="start-button">Enter Twin-City Arena</button>
          <p class="help">Controls: WASD/Arrows move · click ground/enemies · Space attack · 1-4 skills · H/J potions · F loot · I inventory · B shop · E enhance weapon · M minimap · Shift run</p>
        </div>
      </section>
      <section id="game-over-screen" class="hidden">
        <div class="hero-card panel">
          <span class="kicker" id="end-kicker">Battle Complete</span>
          <h1 id="end-title">Victory</h1>
          <p class="subtitle" id="end-copy">The arena is secure.</p>
          <button id="restart-button">Restart Run</button>
        </div>
      </section>
      <div id="hud-top-left" class="panel">
        <div class="portrait-row">
          <div class="portrait" id="class-portrait">⚔️</div>
          <div>
            <div class="nameplate"><span id="character-label">Jade Vanguard</span><span id="level-label">Lv. 1</span></div>
            <div id="class-line" class="class-line">Trojan · Twin sabres</div>
            <div class="bars">
              <div class="bar" title="Health"><i id="hp-fill"></i></div>
              <div class="bar" title="Mana"><i id="mp-fill"></i></div>
              <div class="bar" title="Experience"><i id="xp-fill"></i></div>
              <div class="bar" title="XP / Chi Skill"><i id="chi-fill"></i></div>
            </div>
          </div>
        </div>
        <div class="help" id="stats-line"></div>
        <div class="consumables" id="consumable-line"></div>
      </div>
      <div id="target-panel" class="panel hidden">
        <div class="target-name" id="target-name"></div>
        <div class="bar"><i id="target-fill"></i></div>
      </div>
      <div id="hud-top-right" class="panel">
        <div class="quest-title">Quest Ledger</div>
        <div id="quest-lines"></div>
        <div class="help">Goal: thin the gangs and spirit beasts, then defeat the Scarlet Warlord at the gate.</div>
      </div>
      <div id="minimap-panel" class="panel">
        <canvas id="minimap-canvas" width="180" height="180"></canvas>
        <div id="minimap-caption" class="help">M: toggle minimap</div>
      </div>
      <div id="combat-log" class="panel"></div>
      <div id="skill-bar" class="panel"></div>
      <div id="inventory-panel" class="panel hidden">
        <div class="panel-title">Inventory, Equipment & Enhancement</div>
        <div id="equipment-line"></div>
        <div id="inventory-list"></div>
        <div class="help">Click Equip to swap gear. Enhance equipped gear with Meteor stones for +N stat growth.</div>
      </div>
      <div id="merchant-panel" class="panel hidden">
        <div class="panel-title">Market Pavilion</div>
        <div id="merchant-stock" class="shop-stock"></div>
        <div class="shop-actions">
          <button id="buy-health">Buy HP Potion</button>
          <button id="buy-mana">Buy MP Potion</button>
          <button id="buy-meteor">Buy Meteor</button>
          <button id="sell-loot">Sell Unequipped Loot</button>
          <button id="close-shop">Close</button>
        </div>
        <div class="help">Classic MMO loop: hunt monsters, pick up loot, sell extras, buy potions/meteors, enhance gear.</div>
      </div>
      <div id="toast-layer"></div>
      <div id="floating-layer"></div>
      <div id="mobile-stick"><i></i></div>
    `;
    document.body.appendChild(shell);

    for (const id of [
      'start-screen', 'game-over-screen', 'start-button', 'restart-button', 'end-title', 'end-copy', 'end-kicker',
      'character-name', 'class-grid', 'class-preview', 'class-portrait', 'character-label', 'class-line',
      'level-label', 'hp-fill', 'mp-fill', 'xp-fill', 'chi-fill', 'stats-line', 'consumable-line', 'quest-lines', 'combat-log', 'skill-bar',
      'target-panel', 'target-name', 'target-fill', 'inventory-panel', 'inventory-list', 'equipment-line',
      'merchant-panel', 'merchant-stock', 'buy-health', 'buy-mana', 'buy-meteor', 'sell-loot', 'close-shop',
      'minimap-panel', 'minimap-canvas', 'minimap-caption', 'toast-layer',
      'floating-layer', 'mobile-stick',
    ]) {
      const el = document.getElementById(id);
      if (!el) throw new Error(`Missing UI element #${id}`);
      this.ui[id] = el;
    }

    const skillBar = this.ui['skill-bar'];
    Object.values(this.skills).forEach((skill) => {
      const button = document.createElement('button');
      button.className = 'skill';
      button.dataset.skill = skill.id;
      button.title = `${skill.key}: ${skill.label} — ${skill.description}`;
      button.innerHTML = `<small>${skill.key}</small><span>${skill.icon}</span><strong class="cooldown"></strong>`;
      button.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
        this.castSkill(skill.id);
      });
      skillBar.appendChild(button);
    });

    this.createClassCards();
    this.ui['start-button'].addEventListener('click', () => this.startGame());
    this.ui['restart-button'].addEventListener('click', () => this.startGame());
    this.ui['buy-health'].addEventListener('click', () => this.buyShopItem('health'));
    this.ui['buy-mana'].addEventListener('click', () => this.buyShopItem('mana'));
    this.ui['buy-meteor'].addEventListener('click', () => this.buyShopItem('meteor'));
    this.ui['sell-loot'].addEventListener('click', () => this.sellUnequippedLoot());
    this.ui['close-shop'].addEventListener('click', () => this.ui['merchant-panel'].classList.add('hidden'));
    this.setupJoystick();
    this.applyClassSkills();
    this.updateClassCards();
  }

  private profile(classId: PlayerClass = this.player?.classId ?? this.selectedClass) {
    return CLASS_PROFILES[classId];
  }

  private createClassCards() {
    const grid = this.ui['class-grid'];
    grid.innerHTML = '';
    Object.values(CLASS_PROFILES).forEach((profile) => {
      const card = document.createElement('button');
      card.className = 'class-card';
      card.dataset.classId = profile.id;
      card.innerHTML = `<span>${profile.icon}</span><strong>${profile.name}</strong><small>${profile.weapon}</small>`;
      card.addEventListener('click', () => this.selectClass(profile.id));
      grid.appendChild(card);
    });
  }

  private selectClass(classId: PlayerClass) {
    this.selectedClass = classId;
    this.characterName = ((this.ui['character-name'] as HTMLInputElement | undefined)?.value || this.characterName).trim() || 'Jade Vanguard';
    if (this.mode === 'menu') this.player.classId = classId;
    this.applyClassSkills();
    this.updateClassCards();
    this.updateUi();
    return this.getDebugState();
  }

  private updateClassCards() {
    const profile = CLASS_PROFILES[this.selectedClass];
    document.querySelectorAll<HTMLButtonElement>('.class-card').forEach((card) => {
      card.classList.toggle('selected', card.dataset.classId === this.selectedClass);
    });
    this.ui['class-preview'].innerHTML = `<strong>${profile.icon} ${profile.name}</strong> — ${profile.role}<br><span>${profile.weapon} · ${profile.attackKind} attacks · HP ${profile.base.maxHp} · MP ${profile.base.maxMp} · ATK ${profile.base.attack} · DEF ${profile.base.defense}</span>`;
  }

  private applyClassSkills() {
    const profile = CLASS_PROFILES[this.selectedClass];
    (Object.keys(profile.skills) as SkillId[]).forEach((id) => {
      const loadout = profile.skills[id];
      this.skills[id].label = loadout.label;
      this.skills[id].icon = loadout.icon;
      this.skills[id].cooldown = loadout.cooldown;
      this.skills[id].mana = loadout.mana;
      this.skills[id].description = loadout.description;
      const button = document.querySelector<HTMLButtonElement>(`.skill[data-skill="${id}"]`);
      if (button) {
        button.title = `${loadout.key}: ${loadout.label} — ${loadout.description}`;
        button.innerHTML = `<small>${loadout.key}</small><span>${loadout.icon}</span><strong class="cooldown"></strong>`;
      }
    });
  }

  private applyClassVisual() {
    const profile = this.profile();
    this.player.group.name = `${profile.name} ${this.player.characterName}`;
    const remove: THREE.Object3D[] = [];
    this.player.group.children.forEach((child) => {
      if (child.userData.classWeapon) remove.push(child);
    });
    remove.forEach((child) => this.player.group.remove(child));
    this.player.group.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material || Array.isArray(mesh.material)) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (!mat.color) return;
      if (child.userData.part === 'body') mat.color.setHex(profile.colors.body);
      if (child.userData.part === 'cloth') mat.color.setHex(profile.colors.cloth);
      if (child.userData.part === 'accent') mat.color.setHex(profile.colors.accent);
    });

    const steelMat = new THREE.MeshStandardMaterial({ color: 0xd7e8ef, roughness: 0.32, metalness: 0.82 });
    const accentMat = new THREE.MeshStandardMaterial({ color: profile.colors.accent, emissive: profile.projectileColor, emissiveIntensity: 0.25, roughness: 0.45, metalness: 0.25 });
    const addPart = (mesh: THREE.Mesh) => {
      mesh.userData.classWeapon = true;
      mesh.castShadow = true;
      this.player.group.add(mesh);
    };
    if (profile.id === 'warrior') {
      const sword = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 1.45), steelMat);
      sword.position.set(0.55, 1.2, 0.18);
      sword.rotation.set(0.75, 0, -0.28);
      addPart(sword);
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 20), accentMat);
      shield.position.set(-0.52, 1.17, 0.08);
      shield.rotation.set(Math.PI / 2, 0, 0.24);
      addPart(shield);
    } else if (profile.id === 'trojan') {
      for (const side of [-1, 1]) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.24), steelMat);
        blade.position.set(0.52 * side, 1.18, 0.28);
        blade.rotation.set(0.72, 0, -0.2 * side);
        addPart(blade);
      }
    } else if (profile.id === 'archer') {
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.035, 8, 32, Math.PI * 1.35), accentMat);
      bow.position.set(0.56, 1.25, 0.08);
      bow.rotation.set(Math.PI / 2, 0.1, -0.6);
      addPart(bow);
      const string = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 1.1), steelMat);
      string.position.set(0.48, 1.25, 0.08);
      string.rotation.set(0.05, 0, 0.15);
      addPart(string);
    } else {
      const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.85, 10), steelMat);
      staff.position.set(0.55, 1.25, 0.08);
      staff.rotation.set(0.45, 0, -0.22);
      addPart(staff);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 12), accentMat);
      orb.position.set(0.78, 1.98, -0.18);
      addPart(orb);
    }
  }

  private createStarterItems(profile: ClassProfile): Item[] {
    return [
      { id: `starter-${profile.id}-weapon`, name: profile.starterWeapon.name, rarity: 'common', slot: 'weapon', stats: { ...profile.starterWeapon.stats }, icon: profile.starterWeapon.icon, plus: 0 },
      { id: `starter-${profile.id}-armor`, name: profile.starterArmor.name, rarity: 'common', slot: 'armor', stats: { ...profile.starterArmor.stats }, icon: profile.starterArmor.icon, plus: 0 },
    ];
  }

  private displayItemName(item: Item) {
    return `${item.icon} ${item.name}${item.plus ? ` +${item.plus}` : ''}`;
  }

  private formatStats(stats: StatBlock) {
    return Object.entries(stats).map(([k, v]) => `${k}+${v}`).join(' · ');
  }

  private installEvents() {
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
      this.keys.add(event.code);
      if (this.mode === 'menu' && event.code === 'Enter') this.startGame();
      if (this.mode !== 'playing') return;
      if (event.code === 'KeyI') this.toggleInventory();
      if (event.code === 'KeyB') this.toggleShop();
      if (event.code === 'KeyM') this.toggleMinimap();
      if (event.code === 'KeyH') this.usePotion('health');
      if (event.code === 'KeyJ') this.usePotion('mana');
      if (event.code === 'KeyE') this.enhanceSlot('weapon');
      if (event.code === 'KeyF') this.pickupNearby(true);
      if (event.code === 'Space') this.basicAttack(true);
      if (event.code === 'Digit1' || event.code === 'Numpad1') this.castSkill('palm');
      if (event.code === 'Digit2' || event.code === 'Numpad2') this.castSkill('dash');
      if (event.code === 'Digit3' || event.code === 'Numpad3') this.castSkill('shield');
      if (event.code === 'Digit4' || event.code === 'Numpad4') this.castSkill('cyclone');
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));

    this.renderer.domElement.addEventListener('pointerdown', (event) => this.onCanvasPointerDown(event));
    this.renderer.domElement.addEventListener('pointermove', (event) => {
      const world = this.screenToGround(event.clientX, event.clientY);
      if (world) this.lastPointerWorld.copy(world);
    });
  }

  private setupJoystick() {
    const stick = this.ui['mobile-stick'];
    const knob = stick.querySelector('i') as HTMLElement;
    stick.addEventListener('pointerdown', (event) => {
      this.joystickPointer = event.pointerId;
      stick.setPointerCapture(event.pointerId);
      this.joystickOrigin.set(event.clientX, event.clientY);
      this.touchInput.set(0, 0);
    });
    stick.addEventListener('pointermove', (event) => {
      if (this.joystickPointer !== event.pointerId) return;
      const dx = event.clientX - this.joystickOrigin.x;
      const dy = event.clientY - this.joystickOrigin.y;
      const len = Math.hypot(dx, dy);
      const max = 42;
      const nx = len > max ? (dx / len) * max : dx;
      const ny = len > max ? (dy / len) * max : dy;
      knob.style.transform = `translate(${nx}px, ${ny}px)`;
      this.touchInput.set(nx / max, ny / max);
      if (this.touchInput.lengthSq() > 1) this.touchInput.normalize();
    });
    const release = (event: PointerEvent) => {
      if (this.joystickPointer !== event.pointerId) return;
      this.joystickPointer = null;
      this.touchInput.set(0, 0);
      knob.style.transform = 'translate(0, 0)';
    };
    stick.addEventListener('pointerup', release);
    stick.addEventListener('pointercancel', release);
  }

  private onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;
    const frustumHeight = width < 760 ? 22 : 24;
    this.camera.left = (frustumHeight * aspect) / -2;
    this.camera.right = (frustumHeight * aspect) / 2;
    this.camera.top = frustumHeight / 2;
    this.camera.bottom = frustumHeight / -2;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
  }

  private resetGame(showMenu: boolean) {
    this.mode = showMenu ? 'menu' : this.mode;
    this.elapsed = 0;
    this.quest = { bandits: 0, serpents: 0, boss: false, bossSpawned: false };
    const profile = CLASS_PROFILES[this.selectedClass];
    this.player.characterName = this.characterName;
    this.player.classId = this.selectedClass;
    this.applyClassSkills();
    this.player.group.position.copy(PLAYER_START);
    this.player.group.rotation.y = Math.PI / 4;
    this.player.level = 1;
    this.player.base = { ...profile.base };
    this.player.xp = 0;
    this.player.nextXp = 130;
    this.player.gold = 80;
    this.player.potions = { health: 3, mana: 2 };
    this.player.meteors = 1;
    this.player.chi = 40;
    this.player.targetPos = null;
    this.player.targetEnemyId = null;
    this.player.attackTimer = 0;
    this.player.shieldTimer = 0;
    this.player.cycloneTimer = 0;
    this.player.dashTimer = 0;
    this.player.inventory = this.createStarterItems(profile);
    this.player.equipment = { weapon: this.player.inventory[0], armor: this.player.inventory[1], ring: null, boots: null };
    this.applyClassVisual();
    this.player.hp = this.maxHp();
    this.player.mp = this.maxMp();

    this.enemies.splice(0).forEach((enemy) => this.scene.remove(enemy.group));
    this.loot.splice(0).forEach((drop) => this.scene.remove(drop.group));
    this.effects.splice(0).forEach((effect) => {
      if (effect.duration !== Number.POSITIVE_INFINITY) this.scene.remove(effect.group);
    });
    this.floating.splice(0).forEach((text) => text.el.remove());
    this.clickables.length = 0;
    this.minimapVisible = true;
    this.ui['minimap-panel'].classList.remove('hidden');
    this.ui['combat-log'].innerHTML = '';
    this.spawnInitialWave();
    this.log('Welcome to the arena. The gate wardens are watching.', 'gold');
    this.updateUi();
  }

  private startGame() {
    const input = this.ui['character-name'] as HTMLInputElement | undefined;
    const cleaned = (input?.value ?? '').replace(/[^a-zA-Z0-9 _'-]/g, '').trim();
    this.characterName = cleaned || 'Jade Vanguard';
    this.mode = 'playing';
    this.ui['start-screen'].classList.add('hidden');
    this.ui['game-over-screen'].classList.add('hidden');
    this.ui['inventory-panel'].classList.add('hidden');
    this.ui['merchant-panel'].classList.add('hidden');
    this.resetGame(false);
    this.toast('Quest accepted: restore order in Jade Dominion Arena');
    return this.getDebugState();
  }

  private spawnInitialWave() {
    const spawns: Array<[EnemyKind, number, number]> = [
      ['bandit', -8, 4], ['bandit', -4, 11], ['bandit', 5, 8], ['bandit', 9, 3],
      ['serpent', -12, -2], ['serpent', 2, -12], ['serpent', 14, -2], ['serpent', -20, 8],
      ['warden', 18, 16], ['warden', -19, -17],
    ];
    spawns.forEach(([kind, x, z]) => this.spawnEnemy(kind, new THREE.Vector3(x, 0, z)));
  }

  private spawnBoss() {
    if (this.quest.bossSpawned) return;
    this.quest.bossSpawned = true;
    this.spawnEnemy('boss', new THREE.Vector3(20, 0, -20));
    this.toast('The Scarlet Warlord has emerged at the Twin City Gate!');
    this.log('Boss gate opened: defeat the Scarlet Warlord.', 'gold');
  }

  private spawnEnemy(kind: EnemyKind, pos: THREE.Vector3) {
    const data = {
      bandit: { name: 'Azure Bandit', hp: 82, damage: 10, defense: 2, speed: 3.4, xp: 34, gold: 14, radius: 0.5, color: 0x6d5ad7, level: 2 },
      serpent: { name: 'Jade Serpent', hp: 66, damage: 13, defense: 1, speed: 4.1, xp: 38, gold: 12, radius: 0.45, color: 0x35b77a, level: 2 },
      warden: { name: 'Bronze Warden', hp: 132, damage: 16, defense: 5, speed: 2.7, xp: 62, gold: 24, radius: 0.62, color: 0xb57c37, level: 3 },
      boss: { name: 'Scarlet Warlord', hp: 520, damage: 26, defense: 8, speed: 3.2, xp: 230, gold: 120, radius: 0.86, color: 0xb4162a, level: 5 },
    }[kind];
    const group = new THREE.Group();
    group.name = data.name;
    group.position.copy(pos);
    group.userData.enemyRoot = true;

    const ring = createRing(data.radius * 1.45, kind === 'boss' ? 0xffd47b : 0xff6262, kind === 'boss' ? 0.72 : 0.42);
    group.add(ring);

    if (kind === 'serpent') {
      const mat = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.64, metalness: 0.05 });
      for (let i = 0; i < 4; i++) {
        const part = new THREE.Mesh(new THREE.SphereGeometry(0.36 - i * 0.035, 16, 10), mat);
        part.position.set(0, 0.42, i * 0.28);
        part.scale.y = 0.72;
        part.castShadow = true;
        group.add(part);
      }
      const crest = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0xffd47b, roughness: 0.45, metalness: 0.4 }));
      crest.position.set(0, 0.95, -0.05);
      crest.rotation.x = Math.PI;
      group.add(crest);
    } else {
      const mat = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.62, metalness: kind === 'warden' || kind === 'boss' ? 0.25 : 0.08 });
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(data.radius * 0.72, kind === 'boss' ? 1.45 : 0.9, 6, 14), mat);
      body.position.y = kind === 'boss' ? 1.3 : 1.05;
      body.castShadow = true;
      group.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(data.radius * 0.48, 16, 12), new THREE.MeshStandardMaterial({ color: kind === 'boss' ? 0xffc0a0 : 0xc99b77, roughness: 0.7 }));
      head.position.y = kind === 'boss' ? 2.35 : 1.82;
      head.castShadow = true;
      group.add(head);
      const weapon = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, kind === 'boss' ? 2.25 : 1.35), new THREE.MeshStandardMaterial({ color: 0xd7e8ef, roughness: 0.35, metalness: 0.8 }));
      weapon.position.set(data.radius * 0.82, kind === 'boss' ? 1.28 : 1.05, 0.15);
      weapon.rotation.x = 0.72;
      weapon.rotation.z = -0.3;
      weapon.castShadow = true;
      group.add(weapon);
      if (kind === 'boss') {
        const cape = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.7, 0.08), new THREE.MeshStandardMaterial({ color: 0x6d0f1a, roughness: 0.85 }));
        cape.position.set(0, 1.35, 0.45);
        cape.rotation.x = -0.18;
        group.add(cape);
      }
    }

    const label = makeTextSprite(`${data.name} Lv.${data.level}`, kind === 'boss' ? '#ffd47b' : '#ffe6ad', kind === 'boss' ? 32 : 28);
    label.position.y = kind === 'boss' ? 3.45 : 2.75;
    label.scale.set(kind === 'boss' ? 6.5 : 4.9, kind === 'boss' ? 1.25 : 1.05, 1);
    group.add(label);

    const hpBar = makeHpBarSprite();
    hpBar.position.y = kind === 'boss' ? 3.0 : 2.38;
    hpBar.scale.set(kind === 'boss' ? 4.2 : 2.6, 0.36, 1);
    group.add(hpBar);
    updateHpBar(hpBar, 1, kind === 'boss');

    const id = this.enemySeq++;
    group.traverse((child) => {
      child.userData.enemyId = id;
      if ((child as THREE.Mesh).isMesh) child.castShadow = true;
    });
    const enemy: Enemy = {
      id,
      kind,
      name: data.name,
      level: data.level,
      group,
      radius: data.radius,
      maxHp: data.hp,
      hp: data.hp,
      damage: data.damage,
      defense: data.defense,
      speed: data.speed,
      aggroRadius: kind === 'boss' ? 16 : 10,
      attackRange: kind === 'serpent' ? 1.15 : kind === 'boss' ? 1.75 : 1.25,
      attackTimer: randomRange(0.2, 1.2),
      dead: false,
      xp: data.xp,
      gold: data.gold,
      label,
      hpBar,
      isBoss: kind === 'boss',
    };
    this.enemies.push(enemy);
    this.clickables.push(group);
    this.scene.add(group);
    return enemy;
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.step(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private step(dt: number) {
    this.elapsed += dt;
    this.updateEffects(dt);
    this.updateFloatingText(dt);
    if (this.mode !== 'playing') {
      this.updateCamera(dt);
      return;
    }
    this.updateTimers(dt);
    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateLoot(dt);
    this.pickupNearby(false);
    this.checkQuestProgress();
    this.updateCamera(dt);
    this.updateUi();
  }

  private updateTimers(dt: number) {
    Object.values(this.skills).forEach((skill) => (skill.timer = Math.max(0, skill.timer - dt)));
    this.player.attackTimer = Math.max(0, this.player.attackTimer - dt);
    this.player.shieldTimer = Math.max(0, this.player.shieldTimer - dt);
    this.player.cycloneTimer = Math.max(0, this.player.cycloneTimer - dt);
    this.player.dashTimer = Math.max(0, this.player.dashTimer - dt);
    const manaRegen = (this.player.shieldTimer > 0 ? 8 : 4) * dt;
    this.player.mp = Math.min(this.maxMp(), this.player.mp + manaRegen);
    if (this.player.shieldTimer > 0) this.player.hp = Math.min(this.maxHp(), this.player.hp + 4 * dt);
    if (this.player.cycloneTimer > 0) {
      this.player.chi = Math.max(0, this.player.chi - 9 * dt);
      if (this.player.chi <= 0) this.player.cycloneTimer = 0;
      const stormRange = this.profile().attackKind === 'melee' ? 2.45 : 4.8;
      const stormDamage = this.profile().attackKind === 'magic' ? 15 : this.profile().attackKind === 'ranged' ? 13 : 11;
      for (const enemy of this.enemies) {
        if (!enemy.dead && planarDistance(enemy.group.position, this.player.group.position) < stormRange) {
          this.damageEnemy(enemy, stormDamage * dt, 'cyclone', false);
        }
      }
    }
  }

  private updatePlayer(dt: number) {
    this.keyboardInput.set(0, 0);
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) this.keyboardInput.y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) this.keyboardInput.y += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) this.keyboardInput.x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) this.keyboardInput.x += 1;
    if (this.keyboardInput.lengthSq() > 1) this.keyboardInput.normalize();

    const combined = new THREE.Vector2(this.keyboardInput.x + this.touchInput.x, this.keyboardInput.y + this.touchInput.y);
    if (combined.lengthSq() > 1) combined.normalize();

    let move = new THREE.Vector3();
    if (this.player.dashTimer > 0) {
      move.copy(this.player.dashVelocity).multiplyScalar(dt);
    } else if (combined.lengthSq() > 0.001) {
      this.player.targetPos = null;
      move.set(combined.x, 0, combined.y);
      move.normalize().multiplyScalar(this.moveSpeed() * dt);
    } else if (this.player.targetPos) {
      const toTarget = tmpVec.copy(this.player.targetPos).sub(this.player.group.position);
      toTarget.y = 0;
      const dist = toTarget.length();
      if (dist < 0.18) this.player.targetPos = null;
      else move.copy(toTarget.normalize()).multiplyScalar(Math.min(dist, this.moveSpeed() * dt));
    }

    if (move.lengthSq() > 0) {
      const prev = this.player.group.position.clone();
      this.moveActor(this.player.group.position, move, this.player.radius);
      const actual = tmpVec.copy(this.player.group.position).sub(prev);
      actual.y = 0;
      if (actual.lengthSq() > 0.0001) {
        const targetYaw = Math.atan2(actual.x, actual.z);
        this.player.group.rotation.y = dampAngle(this.player.group.rotation.y, targetYaw, 15, dt);
      }
    }

    const bob = Math.sin(this.elapsed * (move.lengthSq() > 0 ? 10 : 3)) * (move.lengthSq() > 0 ? 0.055 : 0.025);
    const torso = this.player.group.children.find((child) => child.type === 'Mesh' && child.position.y > 1) as THREE.Mesh | undefined;
    if (torso) torso.position.y = 1.17 + bob;

    const target = this.getTargetEnemy();
    if (target && !target.dead) {
      const dist = planarDistance(target.group.position, this.player.group.position);
      if (dist > this.attackRange() * 0.92) {
        this.player.targetPos = target.group.position.clone();
      } else {
        this.basicAttack(false);
      }
    }
  }

  private moveActor(position: THREE.Vector3, delta: THREE.Vector3, radius: number) {
    const nextX = position.clone();
    nextX.x += delta.x;
    if (this.canStandAt(nextX, radius)) position.x = nextX.x;
    const nextZ = position.clone();
    nextZ.z += delta.z;
    if (this.canStandAt(nextZ, radius)) position.z = nextZ.z;
    position.x = clamp(position.x, -WORLD_LIMIT + radius, WORLD_LIMIT - radius);
    position.z = clamp(position.z, -WORLD_LIMIT + radius, WORLD_LIMIT - radius);
  }

  private canStandAt(pos: THREE.Vector3, radius: number) {
    if (pos.x < -WORLD_LIMIT + radius || pos.x > WORLD_LIMIT - radius || pos.z < -WORLD_LIMIT + radius || pos.z > WORLD_LIMIT - radius) return false;
    for (const ob of this.obstacles) {
      const inside = pos.x > ob.x - ob.w / 2 - radius && pos.x < ob.x + ob.w / 2 + radius && pos.z > ob.z - ob.d / 2 - radius && pos.z < ob.z + ob.d / 2 + radius;
      if (inside) return false;
    }
    return true;
  }

  private updateEnemies(dt: number) {
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
      const toPlayer = tmpVec.copy(this.player.group.position).sub(enemy.group.position);
      toPlayer.y = 0;
      const dist = toPlayer.length();
      if (dist < enemy.aggroRadius) {
        const dir = dist > 0.001 ? toPlayer.normalize() : tmpVec.set(0, 0, 1);
        enemy.group.rotation.y = dampAngle(enemy.group.rotation.y, Math.atan2(dir.x, dir.z), 10, dt);
        if (dist > enemy.attackRange) {
          const desired = dir.multiplyScalar(enemy.speed * dt);
          this.moveActor(enemy.group.position, desired, enemy.radius);
        } else if (enemy.attackTimer <= 0) {
          enemy.attackTimer = enemy.isBoss ? 1.1 : 1.35;
          this.damagePlayer(enemy.damage, enemy);
        }
      } else {
        enemy.group.rotation.y += Math.sin(this.elapsed + enemy.id) * 0.002;
      }
      enemy.group.position.y = Math.sin(this.elapsed * 3 + enemy.id) * 0.035;
      enemy.label.visible = dist < 18 || enemy.isBoss;
      enemy.hpBar.visible = enemy.hp < enemy.maxHp || dist < 10 || enemy.isBoss;
      updateHpBar(enemy.hpBar, enemy.hp / enemy.maxHp, enemy.isBoss);
    }
  }

  private updateLoot(dt: number) {
    for (const drop of this.loot) {
      if (drop.picked) continue;
      drop.group.rotation.y += dt * 1.8;
      drop.group.position.y = 0.25 + Math.sin(this.elapsed * 3 + drop.bobSeed) * 0.12;
    }
  }

  private updateEffects(dt: number) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      effect.age += dt;
      effect.update(dt, this.elapsed);
      if (effect.age >= effect.duration) {
        this.scene.remove(effect.group);
        this.effects.splice(i, 1);
      }
    }
  }

  private updateCamera(dt: number) {
    const target = this.player.group.position;
    const desired = tmpVec.set(target.x + 14, 17, target.z + 14);
    this.camera.position.lerp(desired, 1 - Math.exp(-4 * dt));
    this.camera.lookAt(target.x, target.y + 0.6, target.z);
  }

  private basicAttack(manual: boolean) {
    if (this.player.attackTimer > 0) return this.getDebugState();
    const profile = this.profile();
    let target = this.getTargetEnemy();
    if (!target || target.dead || planarDistance(target.group.position, this.player.group.position) > this.attackRange() + 0.3) {
      target = this.nearestEnemy(this.attackRange() + (manual ? (profile.attackKind === 'melee' ? 1.2 : 0.8) : 0));
    }
    if (!target) {
      if (manual) this.toast(profile.attackKind === 'melee' ? 'No enemy in weapon range. Click a target or move closer.' : 'No enemy in firing range. Click a target or move closer.');
      return this.getDebugState();
    }
    this.player.targetEnemyId = target.id;
    const attackSpeed = this.player.cycloneTimer > 0 ? Math.max(0.32, profile.attackCooldown * 0.62) : profile.attackCooldown;
    this.player.attackTimer = attackSpeed;
    this.player.group.lookAt(target.group.position.x, this.player.group.position.y, target.group.position.z);
    const damage = this.attackPower() * randomRange(0.85, 1.15);
    if (profile.attackKind === 'melee') {
      this.damageEnemy(target, damage, profile.attackVerb, true);
      this.createSlashEffect(target.group.position, this.player.cycloneTimer > 0 ? 0x55f1b6 : profile.projectileColor);
    } else {
      const origin = this.player.group.position.clone().add(new THREE.Vector3(0, 1.24, 0));
      const targetPos = target.group.position.clone();
      this.createProjectile(origin, targetPos, profile.projectileColor, () => this.damageEnemy(target as Enemy, damage, profile.attackVerb, true));
    }
    return this.getDebugState();
  }

  private castSkill(id: SkillId) {
    if (this.mode !== 'playing') return this.getDebugState();
    const skill = this.skills[id];
    const profile = this.profile();
    if (skill.timer > 0) {
      this.toast(`${skill.label} is cooling down.`);
      return this.getDebugState();
    }
    if (this.player.mp < skill.mana) {
      this.toast('Not enough mana.');
      return this.getDebugState();
    }

    if (id === 'palm') {
      if (profile.id === 'warrior') {
        const targets = this.enemies.filter((enemy) => !enemy.dead && planarDistance(enemy.group.position, this.player.group.position) < 2.65);
        if (targets.length === 0) { this.toast('Blade Arc needs enemies nearby.'); return this.getDebugState(); }
        this.player.mp -= skill.mana;
        skill.timer = skill.cooldown;
        targets.forEach((enemy) => this.damageEnemy(enemy, this.attackPower() * 1.22, 'blade arc', true));
        this.createAoeRing(this.player.group.position, 2.65, profile.projectileColor);
        this.log('Blade Arc cleaves the crowd.', 'gold');
      } else if (profile.id === 'trojan') {
        const target = this.getTargetEnemy() ?? this.nearestEnemy(7.2);
        if (!target) { this.toast('Fast Blade needs a target line.'); return this.getDebugState(); }
        this.player.mp -= skill.mana;
        skill.timer = skill.cooldown;
        const start = this.player.group.position.clone();
        const end = target.group.position.clone();
        this.createProjectile(start.clone().add(new THREE.Vector3(0, 1.2, 0)), end, profile.projectileColor, () => {
          for (const enemy of this.enemies) {
            if (!enemy.dead && this.distanceToSegment(enemy.group.position, start, end) < 1.0) this.damageEnemy(enemy, this.attackPower() * 1.45, 'fast blade', true);
          }
          this.createAoeRing(end, 1.25, profile.projectileColor);
        });
        this.log('Fast Blade cuts a bright line through the arena.', 'gold');
      } else if (profile.id === 'archer') {
        const targets = this.enemies.filter((enemy) => !enemy.dead && planarDistance(enemy.group.position, this.player.group.position) < 9.0).slice(0, 4);
        if (targets.length === 0) { this.toast('Scatter Shot needs targets in range.'); return this.getDebugState(); }
        this.player.mp -= skill.mana;
        skill.timer = skill.cooldown;
        targets.forEach((enemy, i) => {
          const origin = this.player.group.position.clone().add(new THREE.Vector3((i - 1.5) * 0.18, 1.35, 0));
          this.createProjectile(origin, enemy.group.position.clone(), profile.projectileColor, () => this.damageEnemy(enemy, this.attackPower() * 0.92, 'scatter shot', true));
        });
        this.log(`Scatter Shot launches ${targets.length} arrows.`, 'mana');
      } else {
        const target = this.getTargetEnemy() ?? this.nearestEnemy(8.5);
        if (!target) { this.toast('Fire Circle needs a target.'); return this.getDebugState(); }
        this.player.mp -= skill.mana;
        skill.timer = skill.cooldown;
        const targetPos = target.group.position.clone();
        this.createProjectile(this.player.group.position.clone().add(new THREE.Vector3(0, 1.4, 0)), targetPos, profile.projectileColor, () => {
          for (const enemy of this.enemies) {
            if (!enemy.dead && planarDistance(enemy.group.position, targetPos) < 2.85) this.damageEnemy(enemy, this.attackPower() * 1.32, 'fire circle', true);
          }
          this.createAoeRing(targetPos, 2.85, profile.projectileColor);
        });
        this.log('Fire Circle blooms at the enemy line.', 'mana');
      }
      return this.getDebugState();
    }

    if (id === 'dash') {
      this.player.mp -= skill.mana;
      skill.timer = skill.cooldown;
      const dir = this.getDashDirection();
      const dashDistance = profile.id === 'taoist' ? 5.2 : profile.id === 'archer' ? 4.8 : 6.5;
      const start = this.player.group.position.clone();
      const end = start.clone().addScaledVector(dir, dashDistance);
      this.player.dashTimer = profile.attackKind === 'melee' ? 0.24 : 0.18;
      this.player.dashVelocity.copy(dir).multiplyScalar(profile.attackKind === 'melee' ? 32 : 26);
      this.player.targetPos = null;
      this.createAoeRing(this.player.group.position, profile.attackKind === 'melee' ? 1.4 : 1.05, profile.projectileColor);
      for (const enemy of this.enemies) {
        if (!enemy.dead && this.distanceToSegment(enemy.group.position, start, end) < (profile.attackKind === 'melee' ? 1.45 : 0.9)) {
          this.damageEnemy(enemy, this.attackPower() * (profile.id === 'warrior' ? 1.05 : 1.15), skill.label.toLowerCase(), true);
        }
      }
      if (profile.id === 'taoist') this.player.mp = Math.min(this.maxMp(), this.player.mp + 18);
      this.log(`${skill.label} repositions ${this.player.characterName}.`, 'gold');
      return this.getDebugState();
    }

    if (id === 'shield') {
      this.player.mp -= skill.mana;
      skill.timer = skill.cooldown;
      if (profile.id === 'taoist') {
        const heal = 78 + this.player.level * 18;
        this.player.hp = Math.min(this.maxHp(), this.player.hp + heal);
        this.player.shieldTimer = 4.2;
        this.floatText(this.player.group.position.clone().add(new THREE.Vector3(0, 2.4, 0)), `+${heal}`, 'heal');
        this.createShieldEffect();
        this.log('Healing Rain restores health and leaves a spirit ward.', 'mana');
      } else {
        this.player.shieldTimer = profile.id === 'warrior' ? 6.4 : 5.0;
        this.createShieldEffect();
        this.toast(`${skill.label} active.`);
        this.log(`${skill.label}: ${profile.role}.`, 'mana');
      }
      return this.getDebugState();
    }

    if (id === 'cyclone') {
      if (this.player.chi < this.player.maxChi) {
        this.toast(`${skill.label} needs full XP/Chi. Fight to charge it.`);
        return this.getDebugState();
      }
      skill.timer = skill.cooldown;
      this.player.chi = this.player.maxChi;
      this.player.cycloneTimer = 8;
      this.createCycloneEffect();
      this.log(`XP Skill unleashed: ${skill.label}!`, 'gold');
      this.toast(`${skill.label}: class ultimate online!`);
    }
    return this.getDebugState();
  }

  private getDashDirection() {
    const input = new THREE.Vector3(this.keyboardInput.x + this.touchInput.x, 0, this.keyboardInput.y + this.touchInput.y);
    if (input.lengthSq() > 0.001) return input.normalize();
    const pointerDir = this.lastPointerWorld.clone().sub(this.player.group.position);
    pointerDir.y = 0;
    if (pointerDir.lengthSq() > 0.001) return pointerDir.normalize();
    return new THREE.Vector3(Math.sin(this.player.group.rotation.y), 0, Math.cos(this.player.group.rotation.y)).normalize();
  }

  private damageEnemy(enemy: Enemy, rawDamage: number, source: string, showText: boolean) {
    if (enemy.dead) return;
    const crit = Math.random() < this.critChance();
    const reduced = Math.max(1, rawDamage - enemy.defense * 0.65);
    const amount = Math.round(reduced * (crit ? 1.75 : 1));
    enemy.hp = Math.max(0, enemy.hp - amount);
    this.player.chi = Math.min(this.player.maxChi, this.player.chi + (source === 'cyclone' ? 0.2 : 5));
    if (showText) this.floatText(enemy.group.position.clone().add(new THREE.Vector3(0, 2.3, 0)), `${crit ? 'CRIT ' : ''}${amount}`, 'damage');
    updateHpBar(enemy.hpBar, enemy.hp / enemy.maxHp, enemy.isBoss);
    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  private killEnemy(enemy: Enemy) {
    enemy.dead = true;
    enemy.group.visible = false;
    this.player.targetEnemyId = this.player.targetEnemyId === enemy.id ? null : this.player.targetEnemyId;
    if (enemy.kind === 'bandit') this.quest.bandits += 1;
    if (enemy.kind === 'serpent') this.quest.serpents += 1;
    if (enemy.kind === 'boss') this.quest.boss = true;
    this.gainXp(enemy.xp);
    this.player.gold += enemy.gold;
    this.floatText(enemy.group.position.clone().add(new THREE.Vector3(0, 2.2, 0)), `+${enemy.xp} XP  +${enemy.gold}g`, 'gold');
    this.log(`${enemy.name} defeated.`, 'gold');
    this.createLoot(enemy);
    this.checkQuestProgress();
    if (enemy.isBoss) this.winGame();
  }

  private damagePlayer(raw: number, enemy: Enemy) {
    const shield = this.player.shieldTimer > 0 ? (this.player.classId === 'warrior' ? 0.38 : 0.58) : 1;
    const damage = Math.max(1, Math.round((raw - this.defense() * 0.45) * shield));
    this.player.hp = Math.max(0, this.player.hp - damage);
    this.floatText(this.player.group.position.clone().add(new THREE.Vector3(0, 2.4, 0)), `-${damage}`, 'damage');
    this.createSlashEffect(this.player.group.position, enemy.isBoss ? 0xff6262 : 0xffa43d);
    if (this.player.hp <= 0) this.loseGame(enemy.name);
  }

  private gainXp(amount: number) {
    this.player.xp += amount;
    while (this.player.xp >= this.player.nextXp) {
      this.player.xp -= this.player.nextXp;
      this.player.level += 1;
      this.player.nextXp = Math.round(this.player.nextXp * 1.45);
      this.player.base.maxHp += 36;
      this.player.base.maxMp += 18;
      this.player.base.attack += 7;
      this.player.base.defense += 3;
      this.player.hp = this.maxHp();
      this.player.mp = this.maxMp();
      this.player.chi = this.player.maxChi;
      this.toast(`Level up! ${this.player.characterName} reached Lv.${this.player.level}`);
      this.log(`Level ${this.player.level}: base stats increased and Chi filled.`, 'gold');
      this.createAoeRing(this.player.group.position, 2.8, 0xffd47b);
    }
  }

  private createLoot(enemy: Enemy) {
    const shouldDropItem = enemy.isBoss || Math.random() < 0.62;
    if (!shouldDropItem) return;
    const item = this.generateItem(enemy.level, enemy.isBoss);
    const group = new THREE.Group();
    group.position.copy(enemy.group.position).add(new THREE.Vector3(randomRange(-0.45, 0.45), 0.25, randomRange(-0.45, 0.45)));
    const glow = new THREE.PointLight(rarityThree[item.rarity], enemy.isBoss ? 7 : 3.5, 5, 2);
    glow.position.y = 0.55;
    group.add(glow);
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(enemy.isBoss ? 0.54 : 0.36, 0),
      new THREE.MeshStandardMaterial({ color: rarityThree[item.rarity], emissive: rarityThree[item.rarity], emissiveIntensity: 0.7, roughness: 0.35, metalness: 0.4 }),
    );
    gem.castShadow = true;
    group.add(gem);
    const label = makeTextSprite(item.name, rarityColor[item.rarity], 26);
    label.position.y = 1.25;
    label.scale.set(5, 1, 1);
    group.add(label);
    this.scene.add(group);
    this.loot.push({ id: this.lootSeq++, group, item, picked: false, bobSeed: Math.random() * 100 });
  }

  private generateItem(level: number, boss: boolean): Item {
    const slots: EquipmentSlot[] = ['weapon', 'armor', 'ring', 'boots'];
    const slot = slots[Math.floor(Math.random() * slots.length)];
    const rarityRoll = boss ? 0.98 : Math.random();
    const rarity: Rarity = rarityRoll > 0.94 ? 'legendary' : rarityRoll > 0.76 ? 'elite' : rarityRoll > 0.42 ? 'magic' : 'common';
    const rarityMult = { common: 1, magic: 1.35, elite: 1.85, legendary: 2.5 }[rarity];
    const prefix = { common: 'Sturdy', magic: 'Moonlit', elite: 'Imperial', legendary: 'Dragon-Soul' }[rarity];
    const noun: Record<EquipmentSlot, string> = { weapon: 'Sabres', armor: 'Lamellar', ring: 'Signet', boots: 'Cloud Boots' };
    const icon: Record<EquipmentSlot, string> = { weapon: '⚔️', armor: '🥋', ring: '💍', boots: '🥾' };
    const stats: StatBlock = {};
    if (slot === 'weapon') {
      stats.attack = Math.round((10 + level * 5) * rarityMult);
      stats.crit = Number((0.02 + 0.015 * rarityMult).toFixed(3));
    }
    if (slot === 'armor') {
      stats.maxHp = Math.round((28 + level * 17) * rarityMult);
      stats.defense = Math.round((4 + level * 2) * rarityMult);
    }
    if (slot === 'ring') {
      stats.attack = Math.round((5 + level * 3) * rarityMult);
      stats.maxMp = Math.round((18 + level * 8) * rarityMult);
      stats.crit = Number((0.015 * rarityMult).toFixed(3));
    }
    if (slot === 'boots') {
      stats.speed = Number((0.3 + 0.18 * rarityMult).toFixed(2));
      stats.defense = Math.round((2 + level) * rarityMult);
    }
    return { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name: `${prefix} ${noun[slot]}`, rarity, slot, stats, icon: icon[slot], plus: 0 };
  }

  private pickupNearby(force: boolean) {
    let picked = 0;
    for (const drop of this.loot) {
      if (drop.picked) continue;
      if (force || planarDistance(drop.group.position, this.player.group.position) <= 1.8) {
        drop.picked = true;
        this.scene.remove(drop.group);
        if (drop.gold) this.player.gold += drop.gold;
        if (drop.item) {
          this.player.inventory.push(drop.item);
          this.toast(`Looted ${drop.item.name}`);
          this.log(`Looted ${drop.item.name}.`, 'gold');
          this.floatText(this.player.group.position.clone().add(new THREE.Vector3(0, 2.2, 0)), `${drop.item.icon} ${drop.item.rarity}`, 'gold');
        }
        picked += 1;
      }
    }
    if (force && picked === 0) this.toast('No loot nearby.');
    if (picked > 0) this.updateInventoryUi();
  }

  private equipItem(itemId: string) {
    const item = this.player.inventory.find((candidate) => candidate.id === itemId);
    if (!item) return;
    this.player.equipment[item.slot] = item;
    this.player.hp = Math.min(this.player.hp, this.maxHp());
    this.player.mp = Math.min(this.player.mp, this.maxMp());
    this.toast(`Equipped ${item.name}`);
    this.updateInventoryUi();
    this.updateUi();
  }

  private usePotion(kind: ConsumableKind) {
    if (this.mode !== 'playing') return this.getDebugState();
    if (this.player.potions[kind] <= 0) {
      this.toast(kind === 'health' ? 'No HP potions left.' : 'No MP potions left.');
      return this.getDebugState();
    }
    if (kind === 'health') {
      if (this.player.hp >= this.maxHp()) { this.toast('Health is already full.'); return this.getDebugState(); }
      const heal = 95 + this.player.level * 22;
      this.player.potions.health -= 1;
      this.player.hp = Math.min(this.maxHp(), this.player.hp + heal);
      this.floatText(this.player.group.position.clone().add(new THREE.Vector3(0, 2.35, 0)), `+${heal} HP`, 'heal');
      this.log('Used an HP potion.', 'gold');
    } else {
      if (this.player.mp >= this.maxMp()) { this.toast('Mana is already full.'); return this.getDebugState(); }
      const mana = 80 + this.player.level * 18;
      this.player.potions.mana -= 1;
      this.player.mp = Math.min(this.maxMp(), this.player.mp + mana);
      this.floatText(this.player.group.position.clone().add(new THREE.Vector3(0, 2.2, 0)), `+${mana} MP`, 'mana');
      this.log('Used an MP potion.', 'mana');
    }
    this.updateUi();
    return this.getDebugState();
  }

  private buyShopItem(item: ShopItem) {
    if (this.mode !== 'playing') return this.getDebugState();
    const cost = SHOP_PRICES[item];
    if (this.player.gold < cost) {
      this.toast(`Need ${cost} gold.`);
      return this.getDebugState();
    }
    this.player.gold -= cost;
    if (item === 'meteor') {
      this.player.meteors += 1;
      this.toast('Bought a Meteor stone.');
    } else {
      this.player.potions[item] += 1;
      this.toast(`Bought a ${item === 'health' ? 'HP' : 'MP'} potion.`);
    }
    this.log(`Market purchase: ${item} for ${cost} gold.`, 'gold');
    this.updateUi();
    return this.getDebugState();
  }

  private sellUnequippedLoot() {
    if (this.mode !== 'playing') return this.getDebugState();
    const equippedIds = new Set(Object.values(this.player.equipment).filter(Boolean).map((item) => item!.id));
    let earned = 0;
    const keep: Item[] = [];
    for (const item of this.player.inventory) {
      if (equippedIds.has(item.id)) {
        keep.push(item);
      } else {
        earned += this.itemSellValue(item);
      }
    }
    if (earned <= 0) {
      this.toast('No unequipped loot to sell.');
      return this.getDebugState();
    }
    this.player.inventory = keep;
    this.player.gold += earned;
    this.toast(`Sold spare loot for ${earned} gold.`);
    this.log(`Sold unequipped loot for ${earned} gold.`, 'gold');
    this.updateInventoryUi();
    this.updateUi();
    return this.getDebugState();
  }

  private itemSellValue(item: Item) {
    const rarityBase: Record<Rarity, number> = { common: 12, magic: 32, elite: 74, legendary: 180 };
    const statValue = Object.values(item.stats).reduce((sum, value) => sum + Math.abs(Number(value ?? 0)), 0);
    return Math.round(rarityBase[item.rarity] + statValue * 1.8 + (item.plus ?? 0) * 40);
  }

  private enhanceSlot(slot: EquipmentSlot = 'weapon') {
    if (this.mode !== 'playing') return this.getDebugState();
    const item = this.player.equipment[slot];
    if (!item) {
      this.toast(`No ${slot} equipped.`);
      return this.getDebugState();
    }
    if (this.player.meteors <= 0) {
      this.toast('No Meteor stones. Buy or loot one first.');
      return this.getDebugState();
    }
    const current = item.plus ?? 0;
    if (current >= 9) {
      this.toast(`${item.name} is already +9.`);
      return this.getDebugState();
    }
    const beforeHp = this.maxHp();
    const beforeMp = this.maxMp();
    item.plus = current + 1;
    (Object.keys(item.stats) as (keyof StatBlock)[]).forEach((stat) => {
      const value = item.stats[stat];
      if (typeof value !== 'number') return;
      if (stat === 'crit') item.stats[stat] = Number((value + 0.006).toFixed(3));
      else if (stat === 'speed') item.stats[stat] = Number((value + 0.08).toFixed(2));
      else item.stats[stat] = Math.round(value + Math.max(1, value * 0.12) + item.plus!);
    });
    this.player.meteors -= 1;
    const hpGain = this.maxHp() - beforeHp;
    const mpGain = this.maxMp() - beforeMp;
    if (hpGain > 0) this.player.hp += hpGain;
    if (mpGain > 0) this.player.mp += mpGain;
    this.toast(`Enhanced ${item.name} to +${item.plus}.`);
    this.log(`Meteor refinement succeeded: ${item.name} +${item.plus}.`, 'gold');
    this.createAoeRing(this.player.group.position, 2.0 + item.plus * 0.12, rarityThree[item.rarity]);
    this.updateInventoryUi();
    this.updateUi();
    return this.getDebugState();
  }

  private toggleShop() {
    this.ui['merchant-panel'].classList.toggle('hidden');
    this.updateUi();
    return this.getDebugState();
  }

  private toggleMinimap() {
    this.minimapVisible = !this.minimapVisible;
    this.ui['minimap-panel'].classList.toggle('hidden', !this.minimapVisible);
    this.updateMinimap();
    return this.getDebugState();
  }

  private updateUi() {
    const hpRatio = this.player.hp / this.maxHp();
    const mpRatio = this.player.mp / this.maxMp();
    const xpRatio = this.player.xp / this.player.nextXp;
    const chiRatio = this.player.chi / this.player.maxChi;
    this.ui['hp-fill'].style.width = `${clamp(hpRatio, 0, 1) * 100}%`;
    this.ui['mp-fill'].style.width = `${clamp(mpRatio, 0, 1) * 100}%`;
    this.ui['xp-fill'].style.width = `${clamp(xpRatio, 0, 1) * 100}%`;
    this.ui['chi-fill'].style.width = `${clamp(chiRatio, 0, 1) * 100}%`;
    const profile = this.profile();
    this.ui['level-label'].textContent = `Lv. ${this.player.level}`;
    this.ui['character-label'].textContent = this.player.characterName;
    this.ui['class-portrait'].textContent = profile.icon;
    this.ui['class-line'].textContent = `${profile.name} · ${profile.weapon} · ${profile.attackKind}`;
    this.ui['stats-line'].textContent = `HP ${Math.ceil(this.player.hp)}/${this.maxHp()} · MP ${Math.ceil(this.player.mp)}/${this.maxMp()} · ATK ${this.attackPower()} · DEF ${this.defense()} · Gold ${this.player.gold}`;
    this.ui['consumable-line'].textContent = `H HP Potions: ${this.player.potions.health} · J MP Potions: ${this.player.potions.mana} · Meteors: ${this.player.meteors}`;
    this.ui['quest-lines'].innerHTML = `
      <div>${this.quest.bandits >= 4 ? '✅' : '⬜'} Defeat Azure Bandits: ${Math.min(this.quest.bandits, 4)}/4</div>
      <div>${this.quest.serpents >= 4 ? '✅' : '⬜'} Purge Jade Serpents: ${Math.min(this.quest.serpents, 4)}/4</div>
      <div>${this.quest.bossSpawned ? '✅' : '⬜'} Open the Twin City Gate</div>
      <div>${this.quest.boss ? '✅' : '⬜'} Defeat the Scarlet Warlord</div>
    `;

    const target = this.getTargetEnemy();
    if (target && !target.dead) {
      this.ui['target-panel'].classList.remove('hidden');
      this.ui['target-name'].textContent = `${target.name} · Lv.${target.level}`;
      this.ui['target-fill'].style.width = `${(target.hp / target.maxHp) * 100}%`;
    } else {
      this.ui['target-panel'].classList.add('hidden');
    }

    document.querySelectorAll<HTMLButtonElement>('.skill').forEach((button) => {
      const id = button.dataset.skill as SkillId;
      const skill = this.skills[id];
      const cd = button.querySelector<HTMLElement>('.cooldown');
      const ready = skill.timer <= 0 && (id !== 'cyclone' || this.player.chi >= this.player.maxChi) && this.player.mp >= skill.mana;
      button.classList.toggle('on-cooldown', !ready);
      if (cd) cd.textContent = skill.timer > 0 ? skill.timer.toFixed(1) : id === 'cyclone' && this.player.chi < this.player.maxChi ? 'XP' : this.player.mp < skill.mana ? 'MP' : '';
    });

    if (!this.ui['inventory-panel'].classList.contains('hidden')) this.updateInventoryUi();
    this.ui['merchant-stock'].textContent = `Gold ${this.player.gold} · HP potion ${SHOP_PRICES.health}g · MP potion ${SHOP_PRICES.mana}g · Meteor ${SHOP_PRICES.meteor}g`;
    this.updateMinimap();
  }

  private updateInventoryUi() {
    const eq = this.player.equipment;
    const slotLabels: EquipmentSlot[] = ['weapon', 'armor', 'ring', 'boots'];
    this.ui['equipment-line'].innerHTML = slotLabels.map((slot) => {
      const item = eq[slot];
      return `<div class="equipment-row"><span><strong>${slot.toUpperCase()}</strong>: ${item ? `<span class="rare-${item.rarity}">${this.displayItemName(item)}</span><br><small>${this.formatStats(item.stats)}</small>` : 'None'}</span>${item ? `<button class="enhance-btn" data-slot="${slot}">Enhance</button>` : ''}</div>`;
    }).join('');
    this.ui['equipment-line'].querySelectorAll<HTMLButtonElement>('.enhance-btn').forEach((button) => {
      button.addEventListener('click', () => this.enhanceSlot(button.dataset.slot as EquipmentSlot));
    });

    const list = this.ui['inventory-list'];
    list.innerHTML = '';
    this.player.inventory.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'item-row';
      const equipped = this.player.equipment[item.slot]?.id === item.id;
      const statLine = this.formatStats(item.stats);
      row.innerHTML = `
        <div><strong class="rare-${item.rarity}">${this.displayItemName(item)}</strong><br><span class="help">${item.slot} · ${item.rarity} · ${statLine} · sell ${this.itemSellValue(item)}g</span></div>
        <button ${equipped ? 'disabled' : ''}>${equipped ? 'Equipped' : 'Equip'}</button>
      `;
      const button = row.querySelector('button');
      button?.addEventListener('click', () => this.equipItem(item.id));
      list.appendChild(row);
    });
  }

  private toggleInventory() {
    this.ui['inventory-panel'].classList.toggle('hidden');
    this.updateInventoryUi();
  }

  private updateMinimap() {
    const canvas = this.ui['minimap-canvas'] as HTMLCanvasElement | undefined;
    if (!canvas || !this.minimapVisible) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const toX = (x: number) => ((x + WORLD_LIMIT) / WORLD_SIZE) * w;
    const toY = (z: number) => ((z + WORLD_LIMIT) / WORLD_SIZE) * h;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(4, 8, 14, 0.88)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255, 212, 123, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(5, 5, w - 10, h - 10);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(toX(-WORLD_LIMIT), toY(0)); ctx.lineTo(toX(WORLD_LIMIT), toY(0));
    ctx.moveTo(toX(0), toY(-WORLD_LIMIT)); ctx.lineTo(toX(0), toY(WORLD_LIMIT));
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 212, 123, 0.23)';
    this.obstacles.forEach((ob) => ctx.fillRect(toX(ob.x - ob.w / 2), toY(ob.z - ob.d / 2), (ob.w / WORLD_SIZE) * w, (ob.d / WORLD_SIZE) * h));
    this.loot.filter((drop) => !drop.picked).forEach((drop) => {
      ctx.fillStyle = drop.item ? rarityColor[drop.item.rarity] : '#ffd47b';
      ctx.beginPath(); ctx.arc(toX(drop.group.position.x), toY(drop.group.position.z), 2.5, 0, Math.PI * 2); ctx.fill();
    });
    this.enemies.filter((enemy) => !enemy.dead).forEach((enemy) => {
      ctx.fillStyle = enemy.isBoss ? '#ffd47b' : '#ff6262';
      ctx.beginPath(); ctx.arc(toX(enemy.group.position.x), toY(enemy.group.position.z), enemy.isBoss ? 5 : 3, 0, Math.PI * 2); ctx.fill();
    });
    const profile = this.profile();
    ctx.fillStyle = profile.accent;
    ctx.beginPath(); ctx.arc(toX(this.player.group.position.x), toY(this.player.group.position.z), 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff7d8';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    this.ui['minimap-caption'].textContent = `${profile.name} @ ${this.player.group.position.x.toFixed(1)}, ${this.player.group.position.z.toFixed(1)} · ${this.enemies.filter((enemy) => !enemy.dead).length} foes`;
  }

  private checkQuestProgress() {
    if (!this.quest.bossSpawned && this.quest.bandits >= 4 && this.quest.serpents >= 4) this.spawnBoss();
  }

  private winGame() {
    this.mode = 'victory';
    this.ui['game-over-screen'].classList.remove('hidden');
    this.ui['end-kicker'].textContent = 'Arena Secured';
    this.ui['end-title'].textContent = 'Victory';
    this.ui['end-copy'].textContent = `The Scarlet Warlord fell. Final level ${this.player.level}, gold ${this.player.gold}, inventory ${this.player.inventory.length} items.`;
  }

  private loseGame(source: string) {
    this.mode = 'defeat';
    this.ui['game-over-screen'].classList.remove('hidden');
    this.ui['end-kicker'].textContent = 'Defeated';
    this.ui['end-title'].textContent = 'Try Again';
    this.ui['end-copy'].textContent = `${source} overwhelmed the Jade Vanguard. Rebuild your combo and try again.`;
  }

  private screenToGround(clientX: number, clientY: number) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(pointer, this.camera);
    const out = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(this.groundPlane, out) ? out : null;
  }

  private onCanvasPointerDown(event: PointerEvent) {
    if (this.mode !== 'playing') return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.clickables, true);
    const enemyHit = hits.find((hit) => typeof hit.object.userData.enemyId === 'number');
    if (enemyHit) {
      const enemy = this.enemies.find((candidate) => candidate.id === enemyHit.object.userData.enemyId && !candidate.dead);
      if (enemy) {
        this.player.targetEnemyId = enemy.id;
        this.player.targetPos = enemy.group.position.clone();
        this.toast(`Target: ${enemy.name}`);
        return;
      }
    }
    const ground = this.screenToGround(event.clientX, event.clientY);
    if (ground && this.canStandAt(ground, this.player.radius)) {
      this.player.targetPos = ground;
      this.player.targetEnemyId = null;
      this.lastPointerWorld.copy(ground);
      this.createMoveMarker(ground);
    }
  }

  private createMoveMarker(pos: THREE.Vector3) {
    const group = new THREE.Group();
    group.position.copy(pos);
    group.position.y = 0.06;
    const ring = createRing(0.55, 0x55f1b6, 0.72);
    group.add(ring);
    this.scene.add(group);
    this.effects.push({
      group,
      age: 0,
      duration: 0.7,
      update: (_, t) => {
        ring.rotation.z = t * 4;
        const mat = ring.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, 0.72 * (1 - (_.valueOf?.() ?? 0)));
      },
    });
  }

  private nearestEnemy(range = Infinity) {
    let best: Enemy | null = null;
    let bestDist = range;
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const dist = planarDistance(enemy.group.position, this.player.group.position);
      if (dist < bestDist) {
        best = enemy;
        bestDist = dist;
      }
    }
    return best;
  }

  private getTargetEnemy() {
    if (this.player.targetEnemyId == null) return null;
    return this.enemies.find((enemy) => enemy.id === this.player.targetEnemyId) ?? null;
  }

  private maxHp() { return Math.round(this.player.base.maxHp + this.equipmentStat('maxHp')); }
  private maxMp() { return Math.round(this.player.base.maxMp + this.equipmentStat('maxMp')); }
  private attackPower() {
    let value = this.player.base.attack + this.equipmentStat('attack');
    if (this.player.shieldTimer > 0 && (this.player.classId === 'trojan' || this.player.classId === 'archer')) value *= this.player.classId === 'trojan' ? 1.22 : 1.18;
    if (this.player.cycloneTimer > 0) value *= this.profile().attackKind === 'magic' ? 1.38 : 1.3;
    return Math.round(value);
  }
  private defense() {
    let value = this.player.base.defense + this.equipmentStat('defense');
    if (this.player.shieldTimer > 0 && this.player.classId === 'warrior') value *= 1.4;
    return Math.round(value);
  }
  private moveSpeed() { return (this.player.base.speed + this.equipmentStat('speed') + (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 1.4 : 0)) * (this.player.cycloneTimer > 0 ? 1.45 : 1); }
  private critChance() { return clamp(this.player.base.crit + this.equipmentStat('crit') + (this.player.shieldTimer > 0 && this.player.classId === 'archer' ? 0.08 : 0), 0, 0.65); }
  private attackRange() { return this.profile().attackRange + (this.player.cycloneTimer > 0 ? (this.profile().attackKind === 'melee' ? 0.35 : 1.1) : 0); }

  private equipmentStat(stat: keyof StatBlock) {
    return Object.values(this.player.equipment).reduce((sum, item) => sum + (item?.stats[stat] ?? 0), 0);
  }

  private createProjectile(origin: THREE.Vector3, target: THREE.Vector3, color: number, onHit: () => void) {
    const group = new THREE.Group();
    group.position.copy(origin);
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 18, 12),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2, roughness: 0.3 }),
    );
    group.add(orb);
    const light = new THREE.PointLight(color, 4, 5, 2);
    group.add(light);
    this.scene.add(group);
    const duration = Math.max(0.18, origin.distanceTo(target) / 18);
    let hit = false;
    this.effects.push({
      group,
      age: 0,
      duration,
      update: (_, __) => {
        const effect = this.effects.find((candidate) => candidate.group === group);
        const t = clamp((effect?.age ?? duration) / duration, 0, 1);
        group.position.lerpVectors(origin, target.clone().add(new THREE.Vector3(0, 1.1, 0)), t);
        orb.scale.setScalar(1 + Math.sin(this.elapsed * 20) * 0.22);
        if (t >= 1 && !hit) {
          hit = true;
          onHit();
        }
      },
    });
  }

  private createAoeRing(pos: THREE.Vector3, radius: number, color: number) {
    const group = new THREE.Group();
    group.position.copy(pos);
    group.position.y = 0.08;
    const ring = createRing(radius, color, 0.78);
    group.add(ring);
    this.scene.add(group);
    this.effects.push({
      group,
      age: 0,
      duration: 0.55,
      update: () => {
        const effect = this.effects.find((candidate) => candidate.group === group);
        const t = clamp((effect?.age ?? 0) / 0.55, 0, 1);
        ring.scale.setScalar(0.3 + t * 1.25);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.78 * (1 - t);
      },
    });
  }

  private createSlashEffect(pos: THREE.Vector3, color: number) {
    const group = new THREE.Group();
    group.position.copy(pos).add(new THREE.Vector3(0, 1.1, 0));
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.035, 8, 36, Math.PI * 1.25),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }),
    );
    arc.rotation.set(randomRange(-0.6, 0.6), randomRange(0, Math.PI), randomRange(-0.6, 0.6));
    group.add(arc);
    this.scene.add(group);
    this.effects.push({
      group,
      age: 0,
      duration: 0.28,
      update: () => {
        const effect = this.effects.find((candidate) => candidate.group === group);
        const t = clamp((effect?.age ?? 0) / 0.28, 0, 1);
        arc.scale.setScalar(1 + t * 0.9);
        (arc.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - t);
      },
    });
  }

  private createShieldEffect() {
    const group = new THREE.Group();
    this.player.group.add(group);
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 32, 16),
      new THREE.MeshBasicMaterial({ color: 0x61a8ff, transparent: true, opacity: 0.22, wireframe: true, depthWrite: false }),
    );
    sphere.position.y = 1.15;
    group.add(sphere);
    this.effects.push({
      group,
      age: 0,
      duration: 5.5,
      update: (_, t) => {
        sphere.rotation.y = t * 1.8;
        sphere.scale.setScalar(1 + Math.sin(t * 7) * 0.03);
        (sphere.material as THREE.MeshBasicMaterial).opacity = this.player.shieldTimer > 0 ? 0.2 : 0;
      },
    });
  }

  private createCycloneEffect() {
    const group = new THREE.Group();
    this.player.group.add(group);
    const mat = new THREE.MeshBasicMaterial({ color: 0x55f1b6, transparent: true, opacity: 0.65, depthWrite: false });
    for (let i = 0; i < 5; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.15), mat);
      blade.position.y = 1.2;
      blade.rotation.z = (i / 5) * Math.PI * 2;
      group.add(blade);
    }
    this.effects.push({
      group,
      age: 0,
      duration: 8,
      update: (_, t) => {
        group.rotation.y = t * 10;
        group.children.forEach((child, i) => {
          const angle = t * 5 + i * (Math.PI * 2 / 5);
          child.position.x = Math.cos(angle) * 1.35;
          child.position.z = Math.sin(angle) * 1.35;
          child.rotation.y = -angle;
        });
        mat.opacity = this.player.cycloneTimer > 0 ? 0.65 : 0;
      },
    });
  }

  private distanceToSegment(point: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3) {
    const ap = point.clone().sub(a);
    const ab = b.clone().sub(a);
    ap.y = 0;
    ab.y = 0;
    const t = clamp(ap.dot(ab) / ab.lengthSq(), 0, 1);
    const closest = a.clone().addScaledVector(ab, t);
    return planarDistance(point, closest);
  }

  private floatText(world: THREE.Vector3, text: string, kind: 'damage' | 'heal' | 'gold' | 'mana') {
    const el = document.createElement('div');
    el.className = `float-text ${kind}`;
    el.textContent = text;
    this.ui['floating-layer'].appendChild(el);
    this.floating.push({ el, world, age: 0, duration: 1.15 });
  }

  private updateFloatingText(dt: number) {
    for (let i = this.floating.length - 1; i >= 0; i--) {
      const text = this.floating[i];
      text.age += dt;
      text.world.y += dt * 1.1;
      const screen = text.world.clone().project(this.camera);
      const x = (screen.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-screen.y * 0.5 + 0.5) * window.innerHeight;
      text.el.style.left = `${x}px`;
      text.el.style.top = `${y}px`;
      text.el.style.opacity = `${1 - text.age / text.duration}`;
      text.el.style.transform = `translate(-50%, -50%) scale(${1 + text.age * 0.18})`;
      if (text.age >= text.duration) {
        text.el.remove();
        this.floating.splice(i, 1);
      }
    }
  }

  private toast(message: string) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    this.ui['toast-layer'].appendChild(el);
    window.setTimeout(() => el.remove(), 2300);
  }

  private log(message: string, kind: 'gold' | 'damage' | 'mana' = 'mana') {
    const line = document.createElement('div');
    line.className = kind;
    line.textContent = `› ${message}`;
    this.ui['combat-log'].prepend(line);
    while (this.ui['combat-log'].children.length > 7) this.ui['combat-log'].lastElementChild?.remove();
  }

  private installDebugApi() {
    window.__jadeDominionDebug = {
      start: () => this.startGame(),
      reset: () => {
        this.resetGame(false);
        this.mode = 'playing';
        return this.getDebugState();
      },
      state: () => this.getDebugState(),
      tick: (frames = 60, dt = 1 / 60) => {
        for (let i = 0; i < frames; i++) this.step(dt);
        this.renderer.render(this.scene, this.camera);
        return this.getDebugState();
      },
      hold: (code: string, down = true) => {
        if (down) this.keys.add(code);
        else this.keys.delete(code);
        return this.getDebugState();
      },
      moveTo: (x: number, z: number) => {
        const pos = new THREE.Vector3(x, 0, z);
        if (this.canStandAt(pos, this.player.radius)) this.player.targetPos = pos;
        return this.getDebugState();
      },
      chooseClass: (classId: PlayerClass, name?: string) => {
        if (CLASS_PROFILES[classId]) this.selectedClass = classId;
        if (name) { this.characterName = name; const input = this.ui['character-name'] as HTMLInputElement; if (input) input.value = name; }
        this.applyClassSkills();
        this.updateClassCards();
        return this.getDebugState();
      },
      startAs: (classId: PlayerClass, name?: string) => {
        if (CLASS_PROFILES[classId]) this.selectedClass = classId;
        if (name) { this.characterName = name; const input = this.ui['character-name'] as HTMLInputElement; if (input) input.value = name; }
        return this.startGame();
      },
      nearestEnemy: () => {
        const enemy = this.nearestEnemy();
        return enemy ? this.enemyDebug(enemy) : null;
      },
      cast: (skill: SkillId) => this.castSkill(skill),
      basicAttack: () => this.basicAttack(true),
      usePotion: (kind: ConsumableKind) => this.usePotion(kind),
      buy: (item: ShopItem) => this.buyShopItem(item),
      sellLoot: () => this.sellUnequippedLoot(),
      enhance: (slot: EquipmentSlot = 'weapon') => this.enhanceSlot(slot),
      grant: (gold = 0, meteors = 0) => { this.player.gold += gold; this.player.meteors += meteors; this.updateUi(); return this.getDebugState(); },
      killNearest: () => {
        const enemy = this.nearestEnemy(100);
        if (enemy) this.damageEnemy(enemy, enemy.hp + enemy.defense + 999, 'debug', false);
        return this.getDebugState();
      },
      lootAll: () => {
        this.pickupNearby(true);
        return this.getDebugState();
      },
      runCombatProbe: () => {
        this.startGame();
        const enemy = this.nearestEnemy(100);
        if (enemy) {
          this.player.group.position.copy(enemy.group.position).add(new THREE.Vector3(-1.1, 0, 0));
          this.player.targetEnemyId = enemy.id;
          const before = enemy.hp;
          this.basicAttack(true);
          this.castSkill('palm');
          this.step(0.4);
          this.pickupNearby(true);
          return { beforeHp: before, afterHp: enemy.hp, ...this.getDebugState() };
        }
        return this.getDebugState();
      },
    };
  }

  private getDebugState() {
    const target = this.getTargetEnemy();
    const alive = this.enemies.filter((enemy) => !enemy.dead);
    return {
      mode: this.mode,
      title: document.title,
      player: {
        name: this.player.characterName,
        classId: this.player.classId,
        className: this.profile().name,
        attackKind: this.profile().attackKind,
        x: Number(this.player.group.position.x.toFixed(2)),
        z: Number(this.player.group.position.z.toFixed(2)),
        hp: Math.ceil(this.player.hp),
        maxHp: this.maxHp(),
        mp: Math.ceil(this.player.mp),
        maxMp: this.maxMp(),
        level: this.player.level,
        xp: Math.round(this.player.xp),
        nextXp: this.player.nextXp,
        chi: Math.round(this.player.chi),
        attack: this.attackPower(),
        defense: this.defense(),
        speed: Number(this.moveSpeed().toFixed(2)),
        inventory: this.player.inventory.length,
        gold: this.player.gold,
        potions: { ...this.player.potions },
        meteors: this.player.meteors,
        equipment: Object.fromEntries(Object.entries(this.player.equipment).map(([slot, item]) => [slot, item ? { name: this.displayItemName(item), rarity: item.rarity, plus: item.plus ?? 0, stats: { ...item.stats } } : null])),
      },
      quest: { ...this.quest },
      enemiesAlive: alive.length,
      target: target && !target.dead ? this.enemyDebug(target) : null,
      lootOnGround: this.loot.filter((drop) => !drop.picked).length,
      skills: Object.fromEntries(Object.entries(this.skills).map(([id, skill]) => [id, Number(skill.timer.toFixed(2))])),
      minimapVisible: this.minimapVisible,
      renderer: {
        width: this.renderer.domElement.width,
        height: this.renderer.domElement.height,
      },
    };
  }

  private enemyDebug(enemy: Enemy) {
    return {
      id: enemy.id,
      name: enemy.name,
      kind: enemy.kind,
      hp: Math.ceil(enemy.hp),
      maxHp: enemy.maxHp,
      x: Number(enemy.group.position.x.toFixed(2)),
      z: Number(enemy.group.position.z.toFixed(2)),
      distance: Number(planarDistance(enemy.group.position, this.player.group.position).toFixed(2)),
    };
  }
}

function dampAngle(current: number, target: number, lambda: number, dt: number) {
  let delta = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * (1 - Math.exp(-lambda * dt));
}

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing #app root');
new JadeDominionGame(app);
