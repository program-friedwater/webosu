# Rokusho Architecture

Rokusho is a Web osu!stable-like client built around one visible canvas.
The browser page is only a host for the game client; UI, song select,
cursor, dialogs, gameplay, rankings, and transitions are all rendered and
hit-tested inside Canvas.

## Product Direction

- Target UX: osu!stable-style desktop client running in the browser.
- Rendering: one `HTMLCanvasElement`, initially Canvas 2D.
- UI: custom retained-mode canvas widgets, no normal DOM controls for app UI.
- Beatmaps: import `.osu` and `.osz` from the first implementation phase.
- Assets: original UI assets and default skin; user-provided beatmap assets can
  be loaded from imported beatmap archives.
- Scope: start with osu!standard. Keep mode boundaries explicit so other modes
  do not leak into the initial implementation.

## Non-Goals For The First Pass

- Pixel-perfect copying of copyrighted osu!stable assets.
- Online account, multiplayer, leaderboards, or osu! API integration.
- Full skin compatibility.
- Perfect gameplay parity before song select and import are reliable.
- WebGL renderer. The initial renderer is Canvas 2D with a replaceable boundary.

## Runtime Layers

```txt
Browser Page
└─ AppHost
   ├─ Canvas
   ├─ hidden file input
   └─ optional audio unlock affordance

Client Runtime
├─ GameLoop
├─ SceneManager
├─ Canvas2DRenderer
├─ InputManager
├─ AudioEngine
├─ AssetManager
├─ BeatmapLibrary
├─ SkinManager
└─ SettingsStore
```

The DOM never owns app state. DOM events are normalized by `InputManager`, then
the active scene receives the resulting pointer, wheel, keyboard, and text input
events.

## Scene Model

```ts
export interface Scene {
  enter(params?: unknown): void | Promise<void>;
  exit(): void;
  update(dtMs: number): void;
  draw(renderer: Renderer): void;
  handleEvent(event: ClientEvent): boolean;
}
```

Initial scenes:

- `BootScene`: initialize storage, audio, fonts, default skin, and library index.
- `MainMenuScene`: stable-like entry menu and navigation.
- `SongSelectScene`: canvas song browser, search, sort, difficulty selection,
  preview playback, and import entry.
- `GameplayScene`: playfield rendering, timing, object scheduling, input, and
  scoring.
- `ResultsScene`: local score breakdown and retry/back navigation.
- `OptionsScene`: canvas settings UI.

Scene transitions are animated by `SceneManager`, not by individual scenes. This
keeps fade, dim, and overlay behavior consistent.

## Renderer Boundary

The initial renderer is a thin wrapper over `CanvasRenderingContext2D`.

```ts
export interface Renderer {
  width: number;
  height: number;
  scale: number;

  beginFrame(): void;
  endFrame(): void;

  save(): void;
  restore(): void;
  setAlpha(alpha: number): void;
  setComposite(mode: GlobalCompositeOperation): void;

  rect(fill: Paint, x: number, y: number, w: number, h: number): void;
  roundedRect(fill: Paint, x: number, y: number, w: number, h: number, r: number): void;
  circle(fill: Paint, x: number, y: number, radius: number): void;
  image(image: CanvasImageSource, x: number, y: number, w: number, h: number): void;
  text(style: TextStyle, text: string, x: number, y: number, maxWidth?: number): void;
}
```

All app code draws through `Renderer`. Direct `ctx` access stays inside
`Canvas2DRenderer` and renderer-specific helpers.

## Coordinate System

- Logical base resolution: `1366x768`.
- Canvas backing store: logical size multiplied by `devicePixelRatio`.
- Layout scales by fitting the logical canvas into the available browser area.
- Input events are converted from client pixels to logical pixels before scene
  handling.

This lets stable-like layouts keep predictable proportions while still producing
sharp output on high DPI displays.

## Input

`InputManager` owns:

- pointer position, down/up/click/drag
- wheel and inertial scroll intent
- keyboard actions
- text input for search fields
- custom cursor visibility and cursor trail state

Canvas widgets do not subscribe to DOM events. They receive normalized
`ClientEvent` objects from the scene.

```ts
export type ClientEvent =
  | { type: "pointerMove"; x: number; y: number }
  | { type: "pointerDown"; x: number; y: number; button: number }
  | { type: "pointerUp"; x: number; y: number; button: number }
  | { type: "wheel"; x: number; y: number; deltaX: number; deltaY: number }
  | { type: "keyDown"; code: string; key: string; repeat: boolean }
  | { type: "keyUp"; code: string; key: string }
  | { type: "text"; value: string };
```

## Canvas UI

Use a retained-mode widget tree. Song select and options have enough state that
immediate-mode UI would become noisy quickly.

```ts
export interface Widget {
  bounds: Rect;
  visible: boolean;
  enabled: boolean;

  update(dtMs: number): void;
  draw(renderer: Renderer): void;
  hitTest(x: number, y: number): Widget | null;
  handleEvent(event: ClientEvent): boolean;
}
```

Core widgets:

- `Button`
- `IconButton`
- `ToggleButton`
- `Slider`
- `TextInput`
- `ScrollPanel`
- `VirtualList`
- `Dialog`
- `ContextMenu`
- `Tabs`

Stable-like UI effects are shared primitives:

- dimmed background layers
- translucent panels
- hover glow
- selected row bloom
- kinetic scrolling
- quick crossfades
- cursor trail

## Song Select

Song select is the first major vertical slice. It should feel like a real client,
not a web list.

```txt
SongSelectScene
├─ BackgroundLayer
│  ├─ selected beatmap background
│  ├─ dim
│  └─ transition fade
├─ TopBarLayer
│  ├─ mode/status controls
│  ├─ grouping/sort tabs
│  └─ search input
├─ BeatmapCarouselLayer
│  ├─ virtualized beatmap-set groups
│  ├─ difficulty rows
│  ├─ selected highlight
│  └─ scroll inertia
├─ DetailLayer
│  ├─ title/artist/creator/version
│  ├─ HP/CS/OD/AR/BPM/length
│  └─ local score summary
├─ FooterLayer
│  ├─ back
│  ├─ mods
│  ├─ random
│  ├─ options
│  └─ start
└─ CursorLayer
```

Song select owns only view state:

- current grouping
- current sort
- search query
- scroll offset and velocity
- selected beatmap set id
- selected difficulty id

The canonical beatmap metadata lives in `BeatmapLibrary`.

## Beatmap Import

`.osu` and `.osz` are supported from the beginning.

```txt
User drops or selects files
└─ ImportService
   ├─ identify file type
   ├─ parse .osu directly
   ├─ unzip .osz
   ├─ parse all .osu files in archive
   ├─ collect audio/background/storyboard assets
   ├─ normalize metadata
   ├─ build BeatmapSet records
   └─ persist to BeatmapLibrary
```

Use `jszip` for `.osz` archives in the first implementation. Avoid streaming
until large library performance becomes a real issue.

## Beatmap Data Model

```ts
export interface BeatmapSet {
  id: string;
  title: string;
  titleUnicode?: string;
  artist: string;
  artistUnicode?: string;
  creator: string;
  source?: string;
  tags: string[];
  audioFile: string;
  previewTimeMs: number;
  backgroundFile?: string;
  difficulties: BeatmapDifficulty[];
  importedAt: number;
}

export interface BeatmapDifficulty {
  id: string;
  setId: string;
  fileName: string;
  version: string;
  mode: 0;
  hp: number;
  cs: number;
  od: number;
  ar: number;
  sliderMultiplier: number;
  sliderTickRate: number;
  bpmMin: number;
  bpmMax: number;
  lengthMs: number;
  hitObjects: HitObject[];
  timingPoints: TimingPoint[];
  events: BeatmapEvent[];
}
```

Ids should be content-derived when possible, such as a hash of the `.osu`
contents and archive path. This avoids collisions when imported maps lack
official osu! IDs.

## .osu Parser Boundary

The parser should preserve enough raw structure for future compatibility while
also producing normalized gameplay records.

Parser stages:

1. split sections
2. parse known key-value sections
3. parse timing points
4. parse events
5. parse hit objects
6. derive metadata and difficulty settings
7. collect warnings instead of throwing on recoverable issues

```ts
export interface ParseResult<T> {
  value?: T;
  warnings: ParseWarning[];
  errors: ParseError[];
}
```

Unsupported stable features should degrade visibly but not crash import. Example:
storyboards can be collected but ignored in rendering at first.

## Storage

Use IndexedDB for imported libraries.

```txt
IndexedDB: rokusho
├─ beatmapSets
├─ difficulties
├─ assets
├─ scores
└─ settings
```

Store audio/images as `Blob`s and metadata as JSON. Keep large binary assets out
of localStorage.

The in-memory `BeatmapLibrary` exposes query methods:

```ts
listSets(query: BeatmapQuery): BeatmapSetSummary[];
getSet(id: string): Promise<BeatmapSet>;
getDifficulty(id: string): Promise<BeatmapDifficulty>;
getAsset(setId: string, fileName: string): Promise<Blob | undefined>;
```

## Audio

Start with Web Audio API, not `HTMLAudioElement`, because gameplay timing and
hitsounds depend on accurate clocks.

```ts
export interface AudioEngine {
  unlock(): Promise<void>;
  loadTrack(blob: Blob): Promise<AudioBuffer>;
  playTrack(buffer: AudioBuffer, offsetMs?: number): void;
  stopTrack(): void;
  pauseTrack(): void;
  resumeTrack(): void;
  seekTrack(ms: number): void;
  getTrackTimeMs(): number;
  setMusicVolume(value: number): void;
  setEffectVolume(value: number): void;
}
```

Gameplay timing uses `AudioEngine.getTrackTimeMs()` as the source of truth.
`requestAnimationFrame` drives drawing, but not musical time.

## Gameplay MVP

Gameplay starts intentionally narrow:

- osu!standard only
- hit circles first
- approach circles
- keyboard and pointer hit input
- 300/100/50/miss
- combo and score display
- local result screen

Then add:

- sliders
- spinners
- hitsounds
- basic mods
- local replay

## Suggested Source Layout

```txt
src/
├─ main.ts
├─ app/
│  ├─ AppHost.ts
│  ├─ GameLoop.ts
│  └─ SceneManager.ts
├─ renderer/
│  ├─ Renderer.ts
│  └─ Canvas2DRenderer.ts
├─ input/
│  ├─ InputManager.ts
│  └─ ClientEvent.ts
├─ audio/
│  └─ AudioEngine.ts
├─ ui/
│  ├─ Widget.ts
│  ├─ layout/
│  └─ widgets/
├─ scenes/
│  ├─ BootScene.ts
│  ├─ MainMenuScene.ts
│  ├─ SongSelectScene.ts
│  ├─ GameplayScene.ts
│  └─ ResultsScene.ts
├─ beatmap/
│  ├─ parser/
│  ├─ import/
│  ├─ model/
│  └─ BeatmapLibrary.ts
├─ storage/
│  └─ IndexedDbStore.ts
├─ skin/
│  ├─ SkinManager.ts
│  └─ DefaultSkin.ts
└─ util/
```

## MVP Milestones

1. Canvas app shell with logical resolution, resize handling, and custom cursor.
2. Scene manager with boot, main menu, and song select scenes.
3. Retained-mode widget basics: buttons, text input, virtual list, dialog.
4. `.osu` parser with metadata, timing points, events, and hit objects.
5. `.osz` import using `jszip`, persisted to IndexedDB.
6. Song select backed by imported beatmaps, including search and scroll inertia.
7. Preview playback from imported audio and background image transitions.
8. Gameplay scene loading a selected difficulty and rendering hit circles.
9. Audio-clock-based object scheduling and simple judgement.
10. Results scene and local score persistence.

## First Implementation Slice

The first useful slice should prove the core thesis:

```txt
Open app
→ stable-like main menu drawn in canvas
→ import .osz or .osu
→ song appears in canvas song select
→ selecting it changes background and preview audio
→ start enters gameplay scene
→ hit circles render from parsed .osu timing
→ return to song select
```

This slice touches every risky boundary once without requiring complete gameplay
parity.
