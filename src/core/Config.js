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
        
        // Your world map (will fall back to sample if not found)
        worldMapPath: '/src/assets/world-map-20k.jpg',
        worldMapBounds: null, // Will be calculated
        useSampleMap: true, // Set to false when you have your real map
        
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
if (import.meta.env.DEV) {
    Config.ui.enableDevPanel = true;
} else {
    Config.ui.enableDevPanel = false;
} 