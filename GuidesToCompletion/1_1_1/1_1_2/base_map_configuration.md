# 1_1_2_BaseMapConfiguration - Map Styling & Theme

**ARTIFACT**: 1_1_2_BaseMapConfiguration  
**STATUS**: In Progress  
**PREREQUISITES**: 1_1_1_MapboxProjectSetup complete  

## Overview

This artifact transforms your basic map into a stunning fantasy-themed visualization with custom styling, layer management, and preparation for the vector tile system. We'll create a beautiful dark fantasy aesthetic that makes your world feel alive and magical, while setting up the infrastructure for advanced features.

## Detailed Implementation

### Step 1: Create Map Style Manager

Create `js/core/MapStyleManager.js`:

```javascript
import { Config } from './Config.js';

export class MapStyleManager {
    constructor(map) {
        this.map = map;
        this.currentTheme = 'dark-fantasy';
        this.layers = new Map();
        this.sources = new Map();
        
        // Define fantasy color palettes
        this.themes = {
            'dark-fantasy': {
                background: '#0a0a0a',
                land: '#1a1a2e',
                water: '#16213e',
                roads: '#0f3460',
                borders: '#e94560',
                labels: '#f5f5f5',
                fog: 'rgba(138, 43, 226, 0.1)',
                glow: '#9d4edd'
            },
            'ancient-map': {
                background: '#f4e8d0',
                land: '#e8dcc0',
                water: '#c8b898',
                roads: '#8b7355',
                borders: '#5d4e37',
                labels: '#3e2f23',
                fog: 'rgba(139, 69, 19, 0.1)',
                glow: '#d2691e'
            },
            'ethereal': {
                background: '#000814',
                land: '#001d3d',
                water: '#003566',
                roads: '#006494',
                borders: '#00a8e8',
                labels: '#ffffff',
                fog: 'rgba(0, 168, 232, 0.1)',
                glow: '#00d9ff'
            }
        };
    }
    
    async initialize() {
        // Apply base style
        await this.applyBaseStyle();
        
        // Add effect layers
        this.addEffectLayers();
        
        // Set up style transitions
        this.setupStyleTransitions();
    }
    
    async applyBaseStyle() {
        const theme = this.themes[this.currentTheme];
        
        // Update background
        if (this.map.getLayer('background')) {
            this.map.setPaintProperty('background', 'background-color', theme.background);
        }
        
        // Create vignette effect
        this.addVignetteEffect();
        
        // Add subtle grid overlay for scale reference
        this.addGridOverlay();
        
        // Apply color grading to world image
        this.applyColorGrading();
    }
    
    addVignetteEffect() {
        // Add canvas for vignette
        const canvas = document.createElement('canvas');
        const size = 512;
        canvas.width = size;
        canvas.height = size;
        
        const ctx = canvas.getContext('2d');
        
        // Create radial gradient
        const gradient = ctx.createRadialGradient(
            size/2, size/2, 0,
            size/2, size/2, size/2
        );
        
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        
        // Add as map source
        this.map.addSource('vignette', {
            type: 'canvas',
            canvas: canvas,
            coordinates: [
                [-20000, 20000],
                [20000, 20000],
                [20000, -20000],
                [-20000, -20000]
            ]
        });
        
        // Add as layer
        this.map.addLayer({
            id: 'vignette-overlay',
            type: 'raster',
            source: 'vignette',
            paint: {
                'raster-opacity': 0.6,
                'raster-fade-duration': 0
            }
        });
    }
    
    addGridOverlay() {
        const theme = this.themes[this.currentTheme];
        
        // Create grid pattern
        const gridSize = 1000; // 1000 units grid
        const features = [];
        
        // Generate grid lines
        for (let x = -10000; x <= 10000; x += gridSize) {
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [[x, -10000], [x, 10000]]
                }
            });
        }
        
        for (let y = -10000; y <= 10000; y += gridSize) {
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [[-10000, y], [10000, y]]
                }
            });
        }
        
        // Add grid source
        this.map.addSource('grid', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: features
            }
        });
        
        // Add grid layer
        this.map.addLayer({
            id: 'grid-overlay',
            type: 'line',
            source: 'grid',
            paint: {
                'line-color': theme.labels,
                'line-opacity': 0.05,
                'line-width': [
                    'interpolate',
                    ['exponential', 2],
                    ['zoom'],
                    1, 0.5,
                    10, 1,
                    20, 2
                ]
            }
        });
    }
    
    applyColorGrading() {
        const theme = this.themes[this.currentTheme];
        
        // Apply color matrix to world image
        this.map.setPaintProperty('world-image-layer', 'raster-brightness-min', 0.1);
        this.map.setPaintProperty('world-image-layer', 'raster-brightness-max', 0.9);
        this.map.setPaintProperty('world-image-layer', 'raster-contrast', 0.1);
        this.map.setPaintProperty('world-image-layer', 'raster-saturation', -0.2);
        
        // Add color overlay
        this.addColorOverlay(theme.fog);
    }
    
    addColorOverlay(color) {
        // Create colored overlay
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        
        // Add as source
        this.map.addSource('color-overlay', {
            type: 'canvas',
            canvas: canvas,
            coordinates: [
                [-20000, 20000],
                [20000, 20000],
                [20000, -20000],
                [-20000, -20000]
            ]
        });
        
        // Add as layer
        this.map.addLayer({
            id: 'color-overlay',
            type: 'raster',
            source: 'color-overlay',
            paint: {
                'raster-opacity': 0.3
            }
        });
    }
    
    addEffectLayers() {
        // Prepare layers for future effects
        this.prepareFogOfWarLayer();
        this.prepareGlowEffectLayer();
        this.prepareParticleLayer();
    }
    
    prepareFogOfWarLayer() {
        // Create fog canvas (will be used in Phase 2)
        const fogCanvas = document.createElement('canvas');
        fogCanvas.width = 2048;
        fogCanvas.height = 2048;
        fogCanvas.id = 'fog-canvas';
        
        const ctx = fogCanvas.getContext('2d');
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);
        
        // Store reference
        this.fogCanvas = fogCanvas;
        this.fogContext = ctx;
    }
    
    prepareGlowEffectLayer() {
        // Create container for glow effects
        const glowContainer = document.createElement('div');
        glowContainer.id = 'glow-effects';
        glowContainer.style.position = 'absolute';
        glowContainer.style.top = '0';
        glowContainer.style.left = '0';
        glowContainer.style.width = '100%';
        glowContainer.style.height = '100%';
        glowContainer.style.pointerEvents = 'none';
        glowContainer.style.mixBlendMode = 'screen';
        
        document.getElementById('map-container').appendChild(glowContainer);
    }
    
    prepareParticleLayer() {
        // Create container for particle effects
        const particleContainer = document.createElement('div');
        particleContainer.id = 'particle-effects';
        particleContainer.style.position = 'absolute';
        particleContainer.style.top = '0';
        particleContainer.style.left = '0';
        particleContainer.style.width = '100%';
        particleContainer.style.height = '100%';
        particleContainer.style.pointerEvents = 'none';
        
        document.getElementById('map-container').appendChild(particleContainer);
    }
    
    setupStyleTransitions() {
        // Smooth transitions when changing themes
        const layers = ['background', 'world-image-layer', 'grid-overlay'];
        
        layers.forEach(layerId => {
            if (this.map.getLayer(layerId)) {
                // Add transition properties
                const paintProps = this.map.getPaintProperty(layerId);
                // Transitions will be applied to all paint properties
            }
        });
    }
    
    // Theme switching
    setTheme(themeName) {
        if (!this.themes[themeName]) {
            console.error(`Theme '${themeName}' not found`);
            return;
        }
        
        this.currentTheme = themeName;
        this.applyBaseStyle();
        
        // Emit theme change event
        this.map.fire('themechange', { theme: themeName });
    }
    
    // Layer management
    addLayer(layer, beforeId) {
        if (this.layers.has(layer.id)) {
            console.warn(`Layer '${layer.id}' already exists`);
            return;
        }
        
        this.map.addLayer(layer, beforeId);
        this.layers.set(layer.id, layer);
    }
    
    removeLayer(layerId) {
        if (this.map.getLayer(layerId)) {
            this.map.removeLayer(layerId);
            this.layers.delete(layerId);
        }
    }
    
    toggleLayer(layerId) {
        if (!this.map.getLayer(layerId)) return;
        
        const visibility = this.map.getLayoutProperty(layerId, 'visibility');
        this.map.setLayoutProperty(
            layerId,
            'visibility',
            visibility === 'visible' ? 'none' : 'visible'
        );
    }
    
    // Get current theme colors
    getThemeColors() {
        return this.themes[this.currentTheme];
    }
    
    // Apply zoom-based style changes
    updateStyleForZoom(zoom) {
        // Adjust grid opacity based on zoom
        if (this.map.getLayer('grid-overlay')) {
            const opacity = zoom < 5 ? 0.02 : zoom < 10 ? 0.05 : 0.1;
            this.map.setPaintProperty('grid-overlay', 'line-opacity', opacity);
        }
        
        // Adjust vignette based on zoom
        if (this.map.getLayer('vignette-overlay')) {
            const vignetteOpacity = zoom < 5 ? 0.8 : zoom < 10 ? 0.6 : 0.4;
            this.map.setPaintProperty('vignette-overlay', 'raster-opacity', vignetteOpacity);
        }
    }
}
```

### Step 2: Create Layer Configuration

Create `js/config/LayerConfig.js`:

```javascript
// Layer configuration and z-index management
export const LayerConfig = {
    // Z-index order (bottom to top)
    layerOrder: [
        'background',
        'world-image-layer',
        'terrain-shadows',
        'water-effects',
        'grid-overlay',
        'territory-fill',
        'territory-borders',
        'roads',
        'fog-of-war',
        'location-markers',
        'path-lines',
        'labels',
        'effects',
        'vignette-overlay',
        'ui-overlay'
    ],
    
    // Layer groups for toggling
    layerGroups: {
        base: ['background', 'world-image-layer', 'vignette-overlay'],
        grid: ['grid-overlay'],
        territories: ['territory-fill', 'territory-borders'],
        locations: ['location-markers', 'labels'],
        effects: ['water-effects', 'terrain-shadows', 'fog-of-war'],
        paths: ['roads', 'path-lines']
    },
    
    // Style presets for different layer types
    stylePresets: {
        territoryFill: {
            type: 'fill',
            paint: {
                'fill-color': ['get', 'color'],
                'fill-opacity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    1, 0.3,
                    10, 0.5,
                    15, 0.7
                ]
            }
        },
        territoryBorder: {
            type: 'line',
            paint: {
                'line-color': ['get', 'borderColor'],
                'line-width': [
                    'interpolate',
                    ['exponential', 2],
                    ['zoom'],
                    1, 1,
                    10, 3,
                    20, 6
                ],
                'line-blur': 1
            }
        },
        locationMarker: {
            type: 'symbol',
            layout: {
                'icon-image': ['get', 'icon'],
                'icon-size': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    1, 0.5,
                    10, 1,
                    20, 2
                ],
                'icon-allow-overlap': true,
                'text-field': ['get', 'name'],
                'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
                'text-size': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    1, 0,
                    8, 12,
                    20, 24
                ],
                'text-offset': [0, 1.5],
                'text-anchor': 'top'
            },
            paint: {
                'text-color': '#ffffff',
                'text-halo-color': '#000000',
                'text-halo-width': 2,
                'text-halo-blur': 1,
                'icon-opacity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    1, 0.5,
                    10, 1
                ]
            }
        },
        pathLine: {
            type: 'line',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': ['get', 'color'],
                'line-width': [
                    'interpolate',
                    ['exponential', 2],
                    ['zoom'],
                    1, 1,
                    10, 2,
                    20, 4
                ],
                'line-dasharray': [2, 4],
                'line-opacity': 0.8
            }
        }
    },
    
    // Effect configurations
    effects: {
        glow: {
            color: '#9d4edd',
            size: 20,
            intensity: 0.8
        },
        pulse: {
            duration: 2000,
            scale: 1.5
        },
        ripple: {
            duration: 3000,
            count: 3,
            color: 'rgba(157, 78, 221, 0.4)'
        }
    }
};
```

### Step 3: Update Main CSS with Theme Support

Add to `css/map.css`:

```css
/* Fantasy Theme Enhancements */
.map-container {
    background: radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0a 100%);
}

/* Magical Glow Effects */
.glow-effect {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    background: radial-gradient(circle, rgba(157, 78, 221, 0.8) 0%, transparent 70%);
    filter: blur(10px);
    animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% { 
        transform: scale(1);
        opacity: 0.8;
    }
    50% { 
        transform: scale(1.2);
        opacity: 0.4;
    }
}

/* Water Animation Effect */
.water-effect {
    position: absolute;
    width: 100%;
    height: 100%;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><filter id="water"><feTurbulence baseFrequency="0.02" numOctaves="3" /><feColorMatrix values="0 0 0 0 0 0 0 0 0 0.1 0 0 0 0 0.2 0 0 0 1 0" /></filter></defs><rect width="100" height="100" filter="url(%23water)" /></svg>');
    opacity: 0.3;
    mix-blend-mode: overlay;
    animation: waterFlow 20s linear infinite;
}

@keyframes waterFlow {
    0% { transform: translate(0, 0); }
    100% { transform: translate(-100px, -100px); }
}

/* Fog Effect Base */
.fog-layer {
    position: absolute;
    width: 100%;
    height: 100%;
    pointer-events: none;
    background: radial-gradient(
        circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
        transparent 0%,
        transparent 20%,
        rgba(138, 43, 226, 0.2) 40%,
        rgba(138, 43, 226, 0.4) 60%,
        rgba(138, 43, 226, 0.6) 80%,
        rgba(138, 43, 226, 0.8) 100%
    );
    transition: opacity 0.5s ease;
}

/* Particle Effect Base */
.particle {
    position: absolute;
    width: 4px;
    height: 4px;
    background: #ffffff;
    border-radius: 50%;
    opacity: 0;
    pointer-events: none;
}

.particle.magic {
    background: #9d4edd;
    box-shadow: 0 0 6px #9d4edd;
}

.particle.fire {
    background: #ff6b6b;
    box-shadow: 0 0 6px #ff6b6b;
}

.particle.ice {
    background: #74c0fc;
    box-shadow: 0 0 6px #74c0fc;
}

/* Theme Transitions */
.map-container,
.map-container * {
    transition: background-color 0.5s ease,
                color 0.5s ease,
                border-color 0.5s ease,
                box-shadow 0.5s ease;
}

/* Ancient Map Theme Overrides */
body.theme-ancient-map {
    --primary-dark: #3e2f23;
    --primary-medium: #5d4e37;
    --primary-light: #8b7355;
    --accent-gold: #d2691e;
    --accent-blue: #8b7355;
    --text-primary: #3e2f23;
    --text-secondary: #5d4e37;
}

body.theme-ancient-map .map-container {
    background: radial-gradient(ellipse at center, #f4e8d0 0%, #e8dcc0 100%);
    filter: sepia(0.3);
}

/* Ethereal Theme Overrides */
body.theme-ethereal {
    --primary-dark: #000814;
    --primary-medium: #001d3d;
    --primary-light: #003566;
    --accent-gold: #00a8e8;
    --accent-blue: #00d9ff;
}

body.theme-ethereal .glow-effect {
    background: radial-gradient(circle, rgba(0, 217, 255, 0.8) 0%, transparent 70%);
}

/* Location Marker Styles */
.location-marker {
    width: 32px;
    height: 32px;
    cursor: pointer;
    transition: all 0.3s ease;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
}

.location-marker:hover {
    transform: translateY(-4px) scale(1.1);
    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.7)) brightness(1.2);
}

.location-marker.city {
    background-image: url('../assets/icons/city.svg');
}

.location-marker.dungeon {
    background-image: url('../assets/icons/dungeon.svg');
}

.location-marker.poi {
    background-image: url('../assets/icons/poi.svg');
}

/* Territory Styles */
.territory-label {
    font-family: 'Cinzel', serif;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
}

/* Path Animation */
.journey-path {
    stroke-dasharray: 1000;
    stroke-dashoffset: 1000;
    animation: drawPath 3s ease-in-out forwards;
}

@keyframes drawPath {
    to {
        stroke-dashoffset: 0;
    }
}
```

### Step 4: Create Theme UI Controls

Create `js/ui/ThemeControls.js`:

```javascript
export class ThemeControls {
    constructor(styleManager) {
        this.styleManager = styleManager;
        this.controlsAdded = false;
    }
    
    initialize() {
        this.addThemeControls();
        this.addLayerToggles();
        this.addEffectControls();
        this.bindEvents();
    }
    
    addThemeControls() {
        const themePanel = document.createElement('div');
        themePanel.className = 'theme-panel';
        themePanel.innerHTML = `
            <div class="panel-header">
                <h3>Map Theme</h3>
                <button class="panel-toggle">▼</button>
            </div>
            <div class="panel-content">
                <div class="theme-selector">
                    <button class="theme-btn active" data-theme="dark-fantasy">
                        <span class="theme-preview dark-fantasy"></span>
                        Dark Fantasy
                    </button>
                    <button class="theme-btn" data-theme="ancient-map">
                        <span class="theme-preview ancient-map"></span>
                        Ancient Map
                    </button>
                    <button class="theme-btn" data-theme="ethereal">
                        <span class="theme-preview ethereal"></span>
                        Ethereal
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('ui-overlay').appendChild(themePanel);
        
        // Add CSS
        this.addThemePanelStyles();
    }
    
    addThemePanelStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .theme-panel {
                position: absolute;
                top: 20px;
                left: 300px;
                background: rgba(22, 33, 62, 0.9);
                backdrop-filter: blur(10px);
                border-radius: 15px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
                overflow: hidden;
                transition: all 0.3s ease;
            }
            
            .panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                cursor: pointer;
            }
            
            .panel-header h3 {
                margin: 0;
                font-size: 1.1rem;
                color: var(--accent-gold);
            }
            
            .panel-toggle {
                background: none;
                border: none;
                color: var(--text-primary);
                cursor: pointer;
                transition: transform 0.3s ease;
            }
            
            .panel-content {
                padding: 0 20px 20px;
                max-height: 400px;
                overflow-y: auto;
            }
            
            .theme-selector {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .theme-btn {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                padding: 10px;
                background: rgba(255, 255, 255, 0.05);
                border: 2px solid transparent;
                border-radius: 10px;
                color: var(--text-primary);
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .theme-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                transform: translateY(-2px);
            }
            
            .theme-btn.active {
                border-color: var(--accent-gold);
                background: rgba(233, 69, 96, 0.2);
            }
            
            .theme-preview {
                width: 60px;
                height: 40px;
                border-radius: 5px;
                display: block;
            }
            
            .theme-preview.dark-fantasy {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            }
            
            .theme-preview.ancient-map {
                background: linear-gradient(135deg, #f4e8d0 0%, #e8dcc0 50%, #c8b898 100%);
            }
            
            .theme-preview.ethereal {
                background: linear-gradient(135deg, #000814 0%, #001d3d 50%, #003566 100%);
            }
        `;
        document.head.appendChild(style);
    }
    
    addLayerToggles() {
        const layerPanel = document.createElement('div');
        layerPanel.className = 'layer-panel';
        layerPanel.innerHTML = `
            <div class="panel-header">
                <h3>Map Layers</h3>
                <button class="panel-toggle">▼</button>
            </div>
            <div class="panel-content">
                <label class="layer-toggle">
                    <input type="checkbox" data-layer="grid-overlay" checked>
                    <span>Grid</span>
                </label>
                <label class="layer-toggle">
                    <input type="checkbox" data-layer="vignette-overlay" checked>
                    <span>Vignette</span>
                </label>
                <label class="layer-toggle">
                    <input type="checkbox" data-layer="territories" disabled>
                    <span>Territories (Phase 2)</span>
                </label>
                <label class="layer-toggle">
                    <input type="checkbox" data-layer="locations" disabled>
                    <span>Locations (Phase 2)</span>
                </label>
                <label class="layer-toggle">
                    <input type="checkbox" data-layer="fog" disabled>
                    <span>Fog of War (Phase 2)</span>
                </label>
            </div>
        `;
        
        document.getElementById('ui-overlay').appendChild(layerPanel);
        
        // Position it
        layerPanel.style.position = 'absolute';
        layerPanel.style.top = '20px';
        layerPanel.style.left = '520px';
    }
    
    addEffectControls() {
        const effectPanel = document.createElement('div');
        effectPanel.className = 'effect-panel';
        effectPanel.innerHTML = `
            <div class="panel-header">
                <h3>Visual Effects</h3>
                <button class="panel-toggle">▼</button>
            </div>
            <div class="panel-content">
                <div class="effect-control">
                    <label>Map Brightness</label>
                    <input type="range" id="brightness-slider" min="0" max="200" value="100">
                </div>
                <div class="effect-control">
                    <label>Map Contrast</label>
                    <input type="range" id="contrast-slider" min="0" max="200" value="100">
                </div>
                <div class="effect-control">
                    <label>Vignette Intensity</label>
                    <input type="range" id="vignette-slider" min="0" max="100" value="60">
                </div>
                <div class="effect-toggles">
                    <button class="effect-btn" data-effect="particles">✨ Particles</button>
                    <button class="effect-btn" data-effect="glow">💫 Glow</button>
                    <button class="effect-btn" data-effect="weather">🌧️ Weather</button>
                </div>
            </div>
        `;
        
        document.getElementById('ui-overlay').appendChild(effectPanel);
        
        // Position it
        effectPanel.style.position = 'absolute';
        effectPanel.style.top = '20px';
        effectPanel.style.left = '740px';
        
        // Add styles
        this.addEffectPanelStyles();
    }
    
    addEffectPanelStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .layer-panel, .effect-panel {
                position: absolute;
                background: rgba(22, 33, 62, 0.9);
                backdrop-filter: blur(10px);
                border-radius: 15px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
                overflow: hidden;
                transition: all 0.3s ease;
            }
            
            .layer-toggle {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 0;
                cursor: pointer;
                transition: opacity 0.3s ease;
            }
            
            .layer-toggle:hover {
                opacity: 0.8;
            }
            
            .layer-toggle input[type="checkbox"] {
                width: 18px;
                height: 18px;
                cursor: pointer;
            }
            
            .layer-toggle input:disabled + span {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .effect-control {
                margin-bottom: 15px;
            }
            
            .effect-control label {
                display: block;
                margin-bottom: 5px;
                font-size: 0.9rem;
                color: var(--text-secondary);
            }
            
            .effect-control input[type="range"] {
                width: 100%;
                height: 6px;
                -webkit-appearance: none;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                outline: none;
            }
            
            .effect-control input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 16px;
                height: 16px;
                background: var(--accent-gold);
                border-radius: 50%;
                cursor: pointer;
            }
            
            .effect-toggles {
                display: flex;
                gap: 10px;
                margin-top: 15px;
            }
            
            .effect-btn {
                flex: 1;
                padding: 8px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: var(--text-primary);
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 0.9rem;
            }
            
            .effect-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                transform: translateY(-1px);
            }
            
            .effect-btn.active {
                background: rgba(233, 69, 96, 0.3);
                border-color: var(--accent-gold);
            }
            
            .panel-content.collapsed {
                max-height: 0;
                padding: 0 20px;
            }
            
            .panel-toggle.collapsed {
                transform: rotate(-90deg);
            }
        `;
        document.head.appendChild(style);
    }
    
    bindEvents() {
        // Theme switching
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const theme = e.currentTarget.dataset.theme;
                this.styleManager.setTheme(theme);
                
                // Update active state
                document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                // Update body class
                document.body.className = `theme-${theme}`;
            });
        });
        
        // Layer toggles
        document.querySelectorAll('.layer-toggle input').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const layerId = e.target.dataset.layer;
                if (!e.target.disabled) {
                    this.styleManager.toggleLayer(layerId);
                }
            });
        });
        
        // Effect sliders
        document.getElementById('brightness-slider')?.addEventListener('input', (e) => {
            const value = e.target.value / 100;
            this.styleManager.map.setPaintProperty('world-image-layer', 'raster-brightness-max', value);
        });
        
        document.getElementById('contrast-slider')?.addEventListener('input', (e) => {
            const value = (e.target.value - 100) / 100;
            this.styleManager.map.setPaintProperty('world-image-layer', 'raster-contrast', value);
        });
        
        document.getElementById('vignette-slider')?.addEventListener('input', (e) => {
            const value = e.target.value / 100;
            this.styleManager.map.setPaintProperty('vignette-overlay', 'raster-opacity', value);
        });
        
        // Effect toggles
        document.querySelectorAll('.effect-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.currentTarget.classList.toggle('active');
                const effect = e.currentTarget.dataset.effect;
                this.toggleEffect(effect);
            });
        });
        
        // Panel collapsing
        document.querySelectorAll('.panel-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const content = header.nextElementSibling;
                const toggle = header.querySelector('.panel-toggle');
                
                content.classList.toggle('collapsed');
                toggle.classList.toggle('collapsed');
            });
        });
    }
    
    toggleEffect(effectName) {
        // Placeholder for Phase 2 effects
        console.log(`Effect '${effectName}' will be implemented in Phase 2`);
        
        // Show preview of what's coming
        if (effectName === 'particles') {
            this.showParticlePreview();
        }
    }
    
    showParticlePreview() {
        // Create a few sample particles
        const container = document.getElementById('particle-effects');
        
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.className = 'particle magic';
                particle.style.left = Math.random() * window.innerWidth + 'px';
                particle.style.top = Math.random() * window.innerHeight + 'px';
                
                container.appendChild(particle);
                
                // Animate
                particle.animate([
                    { opacity: 0, transform: 'translateY(0) scale(0)' },
                    { opacity: 1, transform: 'translateY(-20px) scale(1)' },
                    { opacity: 0, transform: 'translateY(-40px) scale(0)' }
                ], {
                    duration: 2000,
                    easing: 'ease-out'
                }).onfinish = () => particle.remove();
            }, i * 100);
        }
    }
}
```

### Step 5: Update Main.js to Use Style Manager

Update the main.js file to integrate the style manager:

```javascript
// Add to imports at top
import { MapStyleManager } from './core/MapStyleManager.js';
import { ThemeControls } from './ui/ThemeControls.js';
import { LayerConfig } from './config/LayerConfig.js';

// Update the initialization in DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('D&D Living World Map - Initializing...');
    
    // Start FPS monitoring
    if (Config.ui.enableDevPanel) {
        Utils.fps.update();
    }
    
    // Create map engine
    DNDWorld.engine = new MapEngine('map');
    
    // Listen for ready event
    DNDWorld.engine.on('ready', async () => {
        console.log('Map engine ready!');
        
        // Initialize style manager
        DNDWorld.styleManager = new MapStyleManager(DNDWorld.engine.getMap());
        await DNDWorld.styleManager.initialize();
        
        // Initialize theme controls
        DNDWorld.themeControls = new ThemeControls(DNDWorld.styleManager);
        DNDWorld.themeControls.initialize();
        
        // Set up zoom-based styling
        DNDWorld.engine.getMap().on('zoom', () => {
            const zoom = DNDWorld.engine.getMap().getZoom();
            DNDWorld.styleManager.updateStyleForZoom(zoom);
        });
        
        // Initialize UI and load data
        initializeUI();
        loadWorldData();
    });
    
    // Initialize the map
    await DNDWorld.engine.initialize();
});

// Add style configuration to global object
DNDWorld.layerConfig = LayerConfig;
```

### Step 6: Create Sample Icon Assets

Create placeholder SVG icons in `assets/icons/`:

Create `assets/icons/city.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <g fill="#e94560">
    <path d="M16 4l-8 8v14h6v-8h4v8h6V12z"/>
    <path d="M4 14v12h4v-6h2v6h2V14z"/>
    <path d="M20 14v12h2v-6h2v6h4V14z"/>
  </g>
</svg>
```

Create `assets/icons/dungeon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <g fill="#9d4edd">
    <path d="M16 4L8 12v4h2v-2h4v2h4v-2h4v2h2v-4z"/>
    <path d="M10 18h4v8h-4z"/>
    <path d="M18 18h4v8h-4z"/>
    <circle cx="16" cy="22" r="2"/>
  </g>
</svg>
```

Create `assets/icons/poi.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <g fill="#00d9ff">
    <path d="M16 4C10.5 4 6 8.5 6 14c0 7 10 14 10 14s10-7 10-14c0-5.5-4.5-10-10-10z"/>
    <circle cx="16" cy="14" r="4" fill="#0a0a0a"/>
  </g>
</svg>
```

## Testing Checklist

- [ ] Map loads with enhanced styling
- [ ] Vignette effect visible around edges
- [ ] Grid overlay shows faintly
- [ ] Theme panel appears and functions
- [ ] Layer toggle panel works
- [ ] Effect control panel displays
- [ ] Theme switching changes map appearance
- [ ] Brightness/contrast sliders affect map
- [ ] Grid visibility can be toggled
- [ ] Zoom changes grid and vignette opacity
- [ ] Panel headers collapse/expand content
- [ ] Particle preview shows when clicked

## Troubleshooting

### Styles not applying
- Check console for layer ID errors
- Verify map is loaded before applying styles
- Check that paint properties match layer type

### Theme switching not working
- Ensure body class is being updated
- Check that theme colors are being applied
- Verify CSS transitions are working

### Performance issues
- Reduce vignette resolution if needed
- Disable grid at low zoom levels
- Use simpler gradients for older devices

## Next Step

The next artifact **1_1_3_ImageToVectorTilePipeline** will implement the crucial tile generation system that converts your 20k image into efficient vector tiles for smooth performance at all zoom levels.

---

**PROGRESS UPDATE**: "1_1_2 - BaseMapConfiguration complete"