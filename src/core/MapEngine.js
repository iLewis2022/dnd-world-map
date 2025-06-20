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
        return new Promise(async (resolve, reject) => {
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
            
            this.worldImage.onerror = async () => {
                // If the real map fails to load and we're set to use sample map
                if (Config.map.useSampleMap) {
                    try {
                        console.log('Real map not found, creating sample map...');
                        const { setupSampleWorldMap } = await import('../utils/createSampleWorldMap.js');
                        const sampleMapUrl = await setupSampleWorldMap();
                        this.worldImage.src = sampleMapUrl;
                    } catch (error) {
                        reject(new Error('Failed to load world map image and create sample: ' + error.message));
                    }
                } else {
                    reject(new Error('Failed to load world map image'));
                }
            };
            
            this.worldImage.src = Config.map.worldMapPath;
        });
    }
    
    async initializeMapLibrary() {
        // Choose between Mapbox and MapLibre
        let MapLibrary;
        
        if (Config.map.useMapbox && Config.map.mapboxToken) {
            const mapboxgl = await import('mapbox-gl');
            MapLibrary = mapboxgl.default;
            MapLibrary.accessToken = Config.map.mapboxToken;
        } else {
            const maplibregl = await import('maplibre-gl');
            MapLibrary = maplibregl.default;
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
        document.getElementById('zoom-in')?.addEventListener('click', () => {
            this.map.zoomIn();
        });
        
        document.getElementById('zoom-out')?.addEventListener('click', () => {
            this.map.zoomOut();
        });
        
        document.getElementById('reset-view')?.addEventListener('click', () => {
            this.map.flyTo({
                center: Config.map.defaultCenter,
                zoom: Config.map.defaultZoom,
                pitch: 0,
                bearing: 0,
                duration: 1000
            });
        });
        
        document.getElementById('toggle-3d')?.addEventListener('click', () => {
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
                    document.getElementById('reset-view')?.click();
                    break;
                case '3':
                    document.getElementById('toggle-3d')?.click();
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
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
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