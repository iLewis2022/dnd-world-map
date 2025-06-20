# 1_1_1_MapboxProjectSetup - Foundation & Dependencies

**ARTIFACT**: 1_1_1_MapboxProjectSetup  
**STATUS**: In Progress  
**PREREQUISITES**: 0_0_0_ROADMAP complete  

## Overview

This artifact establishes the complete project foundation for your AI-powered D&D Living World Map. We're setting up Mapbox GL JS (with MapLibre as fallback), creating the project structure, and getting a basic map rendering with your 20k world image. This is the critical first step - get this right and everything else builds smoothly on top.

## Detailed Implementation

### Step 1: Create Project Structure

Create a new folder called `dnd-living-world-map` and set up this exact structure:

```
dnd-living-world-map/
├── index.html
├── css/
│   ├── main.css
│   ├── map.css
│   └── ui.css
├── js/
│   ├── core/
│   │   ├── MapEngine.js
│   │   ├── Config.js
│   │   └── Utils.js
│   ├── main.js
│   └── vendor/
├── assets/
│   ├── world-map-20k.jpg    [YOUR 20K MAP HERE]
│   ├── icons/
│   ├── textures/
│   └── fonts/
├── data/
│   └── world-data.json
├── lib/
│   └── [vendor libraries]
├── docs/
│   └── README.md
└── package.json
```

### Step 2: Package.json Setup

Create `package.json` with all dependencies:

```json
{
  "name": "dnd-living-world-map",
  "version": "0.1.0",
  "description": "AI-Powered Living World Map for D&D Campaign",
  "main": "index.html",
  "scripts": {
    "start": "npx live-server --port=8080",
    "build": "webpack --mode production",
    "dev": "webpack serve --mode development --open",
    "tile": "node scripts/generate-tiles.js"
  },
  "dependencies": {
    "mapbox-gl": "^3.0.1",
    "maplibre-gl": "^4.0.0",
    "three": "^0.160.0",
    "deck.gl": "^9.0.0",
    "@turf/turf": "^6.5.0",
    "d3": "^7.8.5"
  },
  "devDependencies": {
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.4",
    "webpack-dev-server": "^4.15.1",
    "live-server": "^1.2.2",
    "css-loader": "^6.8.1",
    "style-loader": "^3.3.3",
    "file-loader": "^6.2.0",
    "html-webpack-plugin": "^5.5.3"
  }
}
```

Run: `npm install`

### Step 3: HTML Foundation

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>D&D Living World - AI-Powered Campaign Map</title>
    
    <!-- Mapbox GL CSS -->
    <link href='https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css' rel='stylesheet' />
    
    <!-- Our CSS -->
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/map.css">
    <link rel="stylesheet" href="css/ui.css">
    
    <!-- Preload critical assets -->
    <link rel="preload" href="assets/world-map-20k.jpg" as="image">
</head>
<body>
    <!-- Loading Screen -->
    <div id="loading-screen" class="loading-screen">
        <div class="loading-content">
            <h1>Entering the Realm...</h1>
            <div class="loading-bar">
                <div class="loading-progress"></div>
            </div>
            <p class="loading-status">Initializing world engine...</p>
        </div>
    </div>

    <!-- Main Map Container -->
    <div id="map-container" class="map-container">
        <div id="map" class="map"></div>
    </div>

    <!-- UI Overlay -->
    <div id="ui-overlay" class="ui-overlay">
        <!-- Controls -->
        <div class="controls-panel">
            <button id="zoom-in" class="control-btn" title="Zoom In">+</button>
            <button id="zoom-out" class="control-btn" title="Zoom Out">-</button>
            <button id="reset-view" class="control-btn" title="Reset View">⌂</button>
            <button id="toggle-3d" class="control-btn" title="Toggle 3D">3D</button>
        </div>

        <!-- Info Panel -->
        <div class="info-panel">
            <h2>Episode <span id="current-episode">1</span> / <span id="total-episodes">112</span></h2>
            <div id="location-name" class="location-name">The Beginning</div>
        </div>

        <!-- Timeline -->
        <div class="timeline-container">
            <input type="range" id="episode-timeline" min="1" max="112" value="1" class="timeline-slider">
        </div>
    </div>

    <!-- Dev Tools (remove in production) -->
    <div id="dev-panel" class="dev-panel">
        <div class="dev-stats">
            <div>FPS: <span id="fps">60</span></div>
            <div>Zoom: <span id="zoom-level">10</span></div>
            <div>Tiles: <span id="tile-count">0</span></div>
        </div>
    </div>

    <!-- Scripts -->
    <script src='https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js'></script>
    <script type="module" src="js/main.js"></script>
</body>
</html>
```

### Step 4: Core CSS Styling

Create `css/main.css`:

```css
/* Reset and Base Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

:root {
    /* Color Palette - Fantasy Theme */
    --primary-dark: #1a1a2e;
    --primary-medium: #16213e;
    --primary-light: #0f3460;
    --accent-gold: #e94560;
    --accent-blue: #00d9ff;
    --text-primary: #f5f5f5;
    --text-secondary: #b0b0b0;
    
    /* UI Variables */
    --ui-blur: blur(10px);
    --ui-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    overflow: hidden;
    background: var(--primary-dark);
    color: var(--text-primary);
}

/* Loading Screen */
.loading-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary-medium) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    transition: opacity 0.5s ease-out;
}

.loading-screen.hidden {
    opacity: 0;
    pointer-events: none;
}

.loading-content {
    text-align: center;
}

.loading-content h1 {
    font-size: 3rem;
    margin-bottom: 2rem;
    background: linear-gradient(45deg, var(--accent-gold), var(--accent-blue));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: glow 2s ease-in-out infinite;
}

.loading-bar {
    width: 300px;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    overflow: hidden;
    margin: 0 auto 1rem;
}

.loading-progress {
    height: 100%;
    background: linear-gradient(90deg, var(--accent-gold), var(--accent-blue));
    width: 0%;
    transition: width 0.3s ease;
    box-shadow: 0 0 10px var(--accent-blue);
}

@keyframes glow {
    0%, 100% { filter: brightness(1) drop-shadow(0 0 10px currentColor); }
    50% { filter: brightness(1.2) drop-shadow(0 0 20px currentColor); }
}
```

Create `css/map.css`:

```css
/* Map Container Styles */
.map-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
}

.map {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

/* Mapbox GL Overrides */
.mapboxgl-ctrl-attrib {
    background: rgba(0, 0, 0, 0.8) !important;
    backdrop-filter: var(--ui-blur);
}

.mapboxgl-ctrl-attrib a {
    color: var(--text-secondary) !important;
}

/* Custom Marker Styles */
.map-marker {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    cursor: pointer;
    transition: var(--transition-smooth);
    animation: markerPulse 2s infinite;
}

.map-marker:hover {
    transform: scale(1.2);
    filter: brightness(1.3);
}

@keyframes markerPulse {
    0% { box-shadow: 0 0 0 0 rgba(233, 69, 96, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(233, 69, 96, 0); }
    100% { box-shadow: 0 0 0 0 rgba(233, 69, 96, 0); }
}

/* Fog of War Effect */
.fog-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    background: radial-gradient(
        circle at center,
        transparent 0%,
        transparent 30%,
        rgba(0, 0, 0, 0.8) 70%,
        rgba(0, 0, 0, 0.95) 100%
    );
    mix-blend-mode: multiply;
    opacity: 0;
    transition: opacity 1s ease;
}

.fog-overlay.active {
    opacity: 1;
}
```

Create `css/ui.css`:

```css
/* UI Overlay */
.ui-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1000;
}

.ui-overlay > * {
    pointer-events: auto;
}

/* Control Panel */
.controls-panel {
    position: absolute;
    top: 20px;
    right: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.control-btn {
    width: 50px;
    height: 50px;
    border: none;
    background: rgba(22, 33, 62, 0.9);
    backdrop-filter: var(--ui-blur);
    color: var(--text-primary);
    font-size: 1.2rem;
    font-weight: bold;
    cursor: pointer;
    border-radius: 10px;
    transition: var(--transition-smooth);
    box-shadow: var(--ui-shadow);
}

.control-btn:hover {
    background: var(--primary-light);
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
}

.control-btn:active {
    transform: translateY(0);
}

/* Info Panel */
.info-panel {
    position: absolute;
    top: 20px;
    left: 20px;
    background: rgba(22, 33, 62, 0.9);
    backdrop-filter: var(--ui-blur);
    padding: 20px;
    border-radius: 15px;
    box-shadow: var(--ui-shadow);
    min-width: 250px;
}

.info-panel h2 {
    font-size: 1.2rem;
    margin-bottom: 10px;
    color: var(--accent-gold);
}

.location-name {
    font-size: 1.5rem;
    font-weight: bold;
    background: linear-gradient(45deg, var(--text-primary), var(--accent-blue));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

/* Timeline */
.timeline-container {
    position: absolute;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
    width: 80%;
    max-width: 800px;
    background: rgba(22, 33, 62, 0.9);
    backdrop-filter: var(--ui-blur);
    padding: 20px;
    border-radius: 20px;
    box-shadow: var(--ui-shadow);
}

.timeline-slider {
    width: 100%;
    height: 8px;
    -webkit-appearance: none;
    appearance: none;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    outline: none;
}

.timeline-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 24px;
    height: 24px;
    background: var(--accent-gold);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 0 10px var(--accent-gold);
    transition: var(--transition-smooth);
}

.timeline-slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 0 20px var(--accent-gold);
}

/* Dev Panel */
.dev-panel {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: var(--ui-blur);
    padding: 15px;
    border-radius: 10px;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    color: #00ff00;
}

.dev-stats > div {
    margin-bottom: 5px;
}

/* Responsive */
@media (max-width: 768px) {
    .info-panel {
        top: 10px;
        left: 10px;
        padding: 15px;
        min-width: 200px;
    }
    
    .controls-panel {
        top: 10px;
        right: 10px;
    }
    
    .control-btn {
        width: 40px;
        height: 40px;
        font-size: 1rem;
    }
    
    .timeline-container {
        bottom: 20px;
        width: 90%;
        padding: 15px;
    }
}
```

### Step 5: Configuration System

Create `js/core/Config.js`:

```javascript
// Configuration for the entire world map system
export const Config = {
    // Map Settings
    map: {
        // Use MapLibre for free, or Mapbox with token
        useMapbox: false, // Set to true if you have Mapbox token
        mapboxToken: 'YOUR_MAPBOX_TOKEN_HERE', // Get from mapbox.com
        
        // Initial view
        defaultCenter: [0, 0], // Will be calculated from image
        defaultZoom: 3,
        minZoom: 1,
        maxZoom: 22,
        
        // Your world map
        worldMapPath: 'assets/world-map-20k.jpg',
        worldMapBounds: null, // Will be calculated
        
        // Style
        style: {
            version: 8,
            name: 'D&D World',
            sources: {},
            layers: []
        }
    },
    
    // Performance
    performance: {
        targetFPS: 60,
        tileSize: 512,
        maxTilesInMemory: 100,
        enableWebGL2: true
    },
    
    // UI Settings
    ui: {
        animationDuration: 300,
        enableDevPanel: true,
        enableKeyboardShortcuts: true
    },
    
    // Data
    data: {
        episodeCount: 112,
        autoSaveInterval: 30000, // 30 seconds
        cacheEnabled: true
    },
    
    // AI Integration (Phase 3)
    ai: {
        claudeApiKey: '', // Add in Phase 3
        stableDiffusionEndpoint: '', // Add in Phase 3
        enableAIGeneration: false // Enable in Phase 3
    }
};

// Development vs Production
if (window.location.hostname === 'localhost') {
    Config.ui.enableDevPanel = true;
} else {
    Config.ui.enableDevPanel = false;
}
```

### Step 6: Map Engine Core

Create `js/core/MapEngine.js`:

```javascript
import { Config } from './Config.js';
import { Utils } from './Utils.js';

export class MapEngine {
    constructor(containerId) {
        this.containerId = containerId;
        this.map = null;
        this.worldImage = null;
        this.isReady = false;
        this.listeners = new Map();
    }
    
    async initialize() {
        try {
            // Update loading status
            this.updateLoadingStatus('Loading world map...');
            
            // Load the world image first
            await this.loadWorldImage();
            
            // Initialize the map library (Mapbox or MapLibre)
            this.updateLoadingStatus('Initializing map engine...');
            await this.initializeMapLibrary();
            
            // Set up the base map
            this.updateLoadingStatus('Creating world...');
            await this.setupBaseMap();
            
            // Add controls
            this.addMapControls();
            
            // Set ready state
            this.isReady = true;
            this.emit('ready');
            
            // Hide loading screen
            this.hideLoadingScreen();
            
        } catch (error) {
            console.error('Failed to initialize map:', error);
            this.updateLoadingStatus('Error loading map: ' + error.message);
        }
    }
    
    async loadWorldImage() {
        return new Promise((resolve, reject) => {
            this.worldImage = new Image();
            this.worldImage.onload = () => {
                // Calculate bounds based on image dimensions
                const w = this.worldImage.width;
                const h = this.worldImage.height;
                
                // Create bounds for the image
                Config.map.worldMapBounds = [
                    [-w/2, -h/2], // Southwest
                    [w/2, h/2]    // Northeast
                ];
                
                // Center point
                Config.map.defaultCenter = [0, 0];
                
                console.log(`World map loaded: ${w}x${h}px`);
                resolve();
            };
            
            this.worldImage.onerror = () => {
                reject(new Error('Failed to load world map image'));
            };
            
            this.worldImage.src = Config.map.worldMapPath;
        });
    }
    
    async initializeMapLibrary() {
        // Choose between Mapbox and MapLibre
        const MapLibrary = Config.map.useMapbox ? mapboxgl : maplibregl;
        
        if (Config.map.useMapbox && Config.map.mapboxToken) {
            MapLibrary.accessToken = Config.map.mapboxToken;
        }
        
        // Store reference
        window.MapGL = MapLibrary;
    }
    
    async setupBaseMap() {
        const MapGL = window.MapGL;
        
        // Create custom style with our world image
        const style = {
            version: 8,
            sources: {
                'world-image': {
                    type: 'image',
                    url: Config.map.worldMapPath,
                    coordinates: [
                        [-this.worldImage.width/2, this.worldImage.height/2],
                        [this.worldImage.width/2, this.worldImage.height/2],
                        [this.worldImage.width/2, -this.worldImage.height/2],
                        [-this.worldImage.width/2, -this.worldImage.height/2]
                    ]
                }
            },
            layers: [
                {
                    id: 'background',
                    type: 'background',
                    paint: {
                        'background-color': '#0a0a0a'
                    }
                },
                {
                    id: 'world-image-layer',
                    type: 'raster',
                    source: 'world-image',
                    paint: {
                        'raster-opacity': 1,
                        'raster-fade-duration': 0
                    }
                }
            ]
        };
        
        // Initialize map
        this.map = new MapGL.Map({
            container: this.containerId,
            style: style,
            center: Config.map.defaultCenter,
            zoom: Config.map.defaultZoom,
            minZoom: Config.map.minZoom,
            maxZoom: Config.map.maxZoom,
            preserveDrawingBuffer: true, // For screenshots
            antialias: true,
            refreshExpiredTiles: false
        });
        
        // Wait for map to load
        return new Promise(resolve => {
            this.map.on('load', () => {
                console.log('Map loaded successfully');
                resolve();
            });
        });
    }
    
    addMapControls() {
        const MapGL = window.MapGL;
        
        // Add navigation controls
        this.map.addControl(new MapGL.NavigationControl({
            visualizePitch: true
        }), 'top-right');
        
        // Add scale
        this.map.addControl(new MapGL.ScaleControl({
            maxWidth: 200,
            unit: 'metric'
        }), 'bottom-left');
        
        // Custom controls
        this.setupCustomControls();
        
        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
    }
    
    setupCustomControls() {
        // Zoom controls
        document.getElementById('zoom-in').addEventListener('click', () => {
            this.map.zoomIn();
        });
        
        document.getElementById('zoom-out').addEventListener('click', () => {
            this.map.zoomOut();
        });
        
        document.getElementById('reset-view').addEventListener('click', () => {
            this.map.flyTo({
                center: Config.map.defaultCenter,
                zoom: Config.map.defaultZoom,
                pitch: 0,
                bearing: 0,
                duration: 1000
            });
        });
        
        document.getElementById('toggle-3d').addEventListener('click', () => {
            const currentPitch = this.map.getPitch();
            this.map.flyTo({
                pitch: currentPitch === 0 ? 60 : 0,
                duration: 1000
            });
        });
    }
    
    setupKeyboardShortcuts() {
        if (!Config.ui.enableKeyboardShortcuts) return;
        
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case '+':
                case '=':
                    this.map.zoomIn();
                    break;
                case '-':
                case '_':
                    this.map.zoomOut();
                    break;
                case 'r':
                    document.getElementById('reset-view').click();
                    break;
                case '3':
                    document.getElementById('toggle-3d').click();
                    break;
            }
        });
    }
    
    updateLoadingStatus(status) {
        const statusEl = document.querySelector('.loading-status');
        if (statusEl) {
            statusEl.textContent = status;
        }
        
        // Update progress bar
        const progress = document.querySelector('.loading-progress');
        if (progress) {
            const steps = ['Loading world map...', 'Initializing map engine...', 'Creating world...'];
            const currentStep = steps.indexOf(status);
            if (currentStep !== -1) {
                const percentage = ((currentStep + 1) / steps.length) * 100;
                progress.style.width = percentage + '%';
            }
        }
    }
    
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.add('hidden');
        
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
    
    // Event system
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => callback(data));
        }
    }
    
    // Public methods
    getMap() {
        return this.map;
    }
    
    getBounds() {
        return Config.map.worldMapBounds;
    }
    
    flyTo(options) {
        this.map.flyTo(options);
    }
}
```

### Step 7: Utilities

Create `js/core/Utils.js`:

```javascript
export class Utils {
    // Performance monitoring
    static fps = {
        lastTime: performance.now(),
        frames: 0,
        current: 60,
        
        update() {
            this.frames++;
            const currentTime = performance.now();
            
            if (currentTime >= this.lastTime + 1000) {
                this.current = Math.round((this.frames * 1000) / (currentTime - this.lastTime));
                this.frames = 0;
                this.lastTime = currentTime;
                
                // Update UI
                const fpsElement = document.getElementById('fps');
                if (fpsElement) {
                    fpsElement.textContent = this.current;
                    
                    // Color code based on performance
                    if (this.current >= 55) {
                        fpsElement.style.color = '#00ff00';
                    } else if (this.current >= 30) {
                        fpsElement.style.color = '#ffff00';
                    } else {
                        fpsElement.style.color = '#ff0000';
                    }
                }
            }
            
            requestAnimationFrame(() => this.update());
        }
    };
    
    // Coordinate conversion
    static imageToMapCoords(imageX, imageY, imageWidth, imageHeight) {
        const mapX = imageX - imageWidth / 2;
        const mapY = imageHeight / 2 - imageY;
        return [mapX, mapY];
    }
    
    static mapToImageCoords(mapX, mapY, imageWidth, imageHeight) {
        const imageX = mapX + imageWidth / 2;
        const imageY = imageHeight / 2 - mapY;
        return [imageX, imageY];
    }
    
    // Generate unique IDs
    static generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Debounce function
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Load JSON
    static async loadJSON(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error loading JSON:', error);
            return null;
        }
    }
    
    // Save to IndexedDB
    static async saveToStorage(key, value) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('DNDWorldMap', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['worldData'], 'readwrite');
                const store = transaction.objectStore('worldData');
                store.put({ id: key, data: value });
                
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('worldData')) {
                    db.createObjectStore('worldData', { keyPath: 'id' });
                }
            };
        });
    }
    
    // Load from IndexedDB
    static async loadFromStorage(key) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('DNDWorldMap', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['worldData'], 'readonly');
                const store = transaction.objectStore('worldData');
                const getRequest = store.get(key);
                
                getRequest.onsuccess = () => {
                    resolve(getRequest.result ? getRequest.result.data : null);
                };
                getRequest.onerror = () => reject(getRequest.error);
            };
        });
    }
}
```

### Step 8: Main Entry Point

Create `js/main.js`:

```javascript
import { MapEngine } from './core/MapEngine.js';
import { Config } from './core/Config.js';
import { Utils } from './core/Utils.js';

// Global app instance
window.DNDWorld = {
    engine: null,
    config: Config,
    utils: Utils,
    data: {
        currentEpisode: 1,
        locations: new Map(),
        episodes: new Map()
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('D&D Living World Map - Initializing...');
    
    // Start FPS monitoring
    if (Config.ui.enableDevPanel) {
        Utils.fps.update();
    }
    
    // Create map engine
    DNDWorld.engine = new MapEngine('map');
    
    // Listen for ready event
    DNDWorld.engine.on('ready', () => {
        console.log('Map engine ready!');
        initializeUI();
        loadWorldData();
    });
    
    // Initialize the map
    await DNDWorld.engine.initialize();
});

// Initialize UI components
function initializeUI() {
    const map = DNDWorld.engine.getMap();
    
    // Timeline control
    const timeline = document.getElementById('episode-timeline');
    timeline.addEventListener('input', (e) => {
        const episode = parseInt(e.target.value);
        DNDWorld.data.currentEpisode = episode;
        document.getElementById('current-episode').textContent = episode;
        
        // This will load episode-specific data in future phases
        loadEpisodeData(episode);
    });
    
    // Update zoom level display
    map.on('zoom', () => {
        const zoom = map.getZoom().toFixed(2);
        document.getElementById('zoom-level').textContent = zoom;
    });
    
    // Dev panel toggle (Ctrl+D)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'd') {
            e.preventDefault();
            const devPanel = document.getElementById('dev-panel');
            devPanel.style.display = devPanel.style.display === 'none' ? 'block' : 'none';
        }
    });
}

// Load world data
async function loadWorldData() {
    // Try to load from storage first
    const savedData = await Utils.loadFromStorage('worldData');
    
    if (savedData) {
        console.log('Loaded saved world data');
        DNDWorld.data = { ...DNDWorld.data, ...savedData };
    } else {
        // Load default data
        const defaultData = await Utils.loadJSON('data/world-data.json');
        if (defaultData) {
            DNDWorld.data = { ...DNDWorld.data, ...defaultData };
        }
    }
    
    // Auto-save periodically
    setInterval(async () => {
        await Utils.saveToStorage('worldData', DNDWorld.data);
        console.log('World data auto-saved');
    }, Config.data.autoSaveInterval);
}

// Load episode-specific data (placeholder for now)
function loadEpisodeData(episodeNumber) {
    console.log(`Loading data for Episode ${episodeNumber}`);
    
    // Update location name (placeholder)
    const locationName = document.getElementById('location-name');
    locationName.textContent = `Episode ${episodeNumber} Location`;
    
    // In future phases, this will:
    // - Load location pins for this episode
    // - Update fog of war
    // - Show journey paths
    // - Update territory control
}

// Handle map clicks (for future features)
DNDWorld.engine.on('ready', () => {
    const map = DNDWorld.engine.getMap();
    
    map.on('click', (e) => {
        console.log('Map clicked at:', e.lngLat);
        
        // Future: Add location pin
        // Future: Show location details
        // Future: Open location editor
    });
    
    map.on('moveend', () => {
        // Update tile count for performance monitoring
        const tiles = map.queryRenderedFeatures();
        document.getElementById('tile-count').textContent = tiles.length;
    });
});

// Export for console debugging
window.DNDWorld = DNDWorld;
console.log('DNDWorld available in console for debugging');
```

### Step 9: Initial World Data

Create `data/world-data.json`:

```json
{
    "version": "0.1.0",
    "worldName": "Your Campaign World",
    "episodeCount": 112,
    "currentEpisode": 1,
    "worldBounds": {
        "north": 5000,
        "south": -5000,
        "east": 5000,
        "west": -5000
    },
    "metadata": {
        "created": "2024-01-01",
        "lastModified": "2024-01-01",
        "mapResolution": "20000x20000",
        "tilesetVersion": null
    },
    "regions": [],
    "locations": [],
    "episodes": {
        "1": {
            "title": "The Beginning",
            "description": "Where it all started",
            "date": "Session 1",
            "partyLocation": [0, 0]
        }
    }
}
```

### Step 10: Simple Dev Server Setup

Create `webpack.config.js`:

```javascript
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: './js/main.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
        clean: true
    },
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                type: 'asset/resource',
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './index.html'
        })
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, './'),
        },
        compress: true,
        port: 8080,
        hot: true
    }
};
```

## Testing Checklist

- [ ] Run `npm install` successfully
- [ ] Place your `world-map-20k.jpg` in `assets/` folder
- [ ] Run `npm start` and navigate to http://localhost:8080
- [ ] Verify map loads with your world image
- [ ] Test zoom in/out with mouse wheel
- [ ] Test pan by clicking and dragging
- [ ] Test control buttons (+, -, home, 3D)
- [ ] Verify FPS counter shows in dev panel
- [ ] Test episode timeline slider
- [ ] Press Ctrl+D to toggle dev panel
- [ ] Check console for no errors

## Troubleshooting

### Map shows black screen
- Check that `world-map-20k.jpg` exists in `assets/` folder
- Check browser console for image loading errors
- Verify image path in Config.js matches your file

### Poor performance
- Your 20k image might be too large for direct display
- Next artifact (1_1_2) will implement proper tiling
- For now, you can test with a smaller version

### Mapbox token issues
- If using MapLibre (default), no token needed
- If you want Mapbox features, get free token from mapbox.com
- Set `useMapbox: true` and add token in Config.js

## Next Step

With the foundation complete, the next artifact **1_1_2_BaseMapConfiguration** will:
- Set up proper map styling
- Configure the fantasy theme
- Add layer management
- Prepare for vector tile conversion

---

**PROGRESS UPDATE**: "1_1_1 - MapboxProjectSetup complete"
(Copy this to "Last Completed" if resuming in a new session)