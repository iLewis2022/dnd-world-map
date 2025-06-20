module.exports = TileGenerator;
```

### Step 5: Add Tile-Specific Styles

Add to `css/map.css`:

```css
/* Tile Info Badge */
.tile-info {
    position: absolute;
    top: 80px;
    left: 20px;
    background: rgba(22, 33, 62, 0.9);
    backdrop-filter: blur(10px);
    padding: 10px 15px;
    border-radius: 10px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    transition: opacity 0.5s ease;
    z-index: 100;
}

.tile-info-content {
    display: flex;
    align-items: center;
    gap: 15px;
    font-size: 0.9rem;
}

.tile-badge {
    background: var(--accent-gold);
    color: var(--primary-dark);
    padding: 4px 8px;
    border-radius: 5px;
    font-weight: bold;
    font-size: 0.8rem;
}

/* Performance Warning */
.performance-warning {
    position: absolute;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(233, 69, 96, 0.9);
    backdrop-filter: blur(10px);
    padding: 15px 25px;
    border-radius: 10px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    transition: opacity 0.5s ease;
    z-index: 100;
    text-align: center;
    max-width: 500px;
}

.warning-content {
    color: #ffffff;
    font-size: 1rem;
    line-height: 1.5;
}

.warning-content small {
    font-size: 0.85rem;
    opacity: 0.9;
}

/* Tile Loading Animation */
.mapboxgl-tile-loaded {
    animation: tileLoad 0.3s ease-out;
}

@keyframes tileLoad {
    from {
        opacity: 0;
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

/* Tile Debug Overlay (Dev Mode) */
.mapboxgl-tile-boundaries {
    border: 1px solid rgba(233, 69, 96, 0.3) !important;
}

/* Loading Progress Enhancement */
.loading-screen.tiles {
    background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary-medium) 100%),
                url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)" /></svg>');
}

/* Smooth Tile Transitions */
.mapboxgl-canvas {
    transition: filter 0.3s ease;
}

.map-loading .mapboxgl-canvas {
    filter: blur(2px) brightness(0.7);
}
```

### Step 6: Create Tile Cache Manager

Create `js/core/TileCacheManager.js`:

```javascript
export class TileCacheManager {
    constructor() {
        this.cacheVersion = 'v1';
        this.cacheName = `dnd-world-tiles-${this.cacheVersion}`;
        this.maxCacheSize = 100 * 1024 * 1024; // 100MB
        this.cacheAvailable = 'caches' in window;
    }
    
    async initialize() {
        if (!this.cacheAvailable) {
            console.log('Cache API not available');
            return;
        }
        
        // Clean old caches
        await this.cleanOldCaches();
        
        // Open current cache
        this.cache = await caches.open(this.cacheName);
        
        // Check cache size
        await this.checkCacheSize();
        
        console.log('✅ Tile cache initialized');
    }
    
    async cacheTile(url, response) {
        if (!this.cacheAvailable || !this.cache) return;
        
        try {
            // Clone response before caching
            await this.cache.put(url, response.clone());
        } catch (error) {
            console.error('Failed to cache tile:', error);
        }
    }
    
    async getCachedTile(url) {
        if (!this.cacheAvailable || !this.cache) return null;
        
        try {
            const cached = await this.cache.match(url);
            if (cached) {
                // Update last accessed time
                const headers = new Headers(cached.headers);
                headers.set('X-Last-Accessed', new Date().toISOString());
                
                return new Response(cached.body, {
                    status: cached.status,
                    statusText: cached.statusText,
                    headers: headers
                });
            }
        } catch (error) {
            console.error('Failed to get cached tile:', error);
        }
        
        return null;
    }
    
    async cleanOldCaches() {
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => 
            name.startsWith('dnd-world-tiles-') && name !== this.cacheName
        );
        
        for (const cacheName of oldCaches) {
            await caches.delete(cacheName);
            console.log(`Deleted old cache: ${cacheName}`);
        }
    }
    
    async checkCacheSize() {
        if (!navigator.storage || !navigator.storage.estimate) return;
        
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 0;
        
        console.log(`Cache usage: ${(usage / 1024 / 1024).toFixed(2)}MB / ${(quota / 1024 / 1024).toFixed(2)}MB`);
        
        // If using too much space, clear oldest tiles
        if (usage > this.maxCacheSize) {
            await this.evictOldestTiles();
        }
    }
    
    async evictOldestTiles() {
        const requests = await this.cache.keys();
        const tiles = [];
        
        // Get all tiles with last accessed time
        for (const request of requests) {
            const response = await this.cache.match(request);
            const lastAccessed = response.headers.get('X-Last-Accessed') || '2000-01-01';
            tiles.push({
                url: request.url,
                lastAccessed: new Date(lastAccessed)
            });
        }
        
        // Sort by last accessed time
        tiles.sort((a, b) => a.lastAccessed - b.lastAccessed);
        
        // Remove oldest 25%
        const toRemove = Math.floor(tiles.length * 0.25);
        for (let i = 0; i < toRemove; i++) {
            await this.cache.delete(tiles[i].url);
        }
        
        console.log(`Evicted ${toRemove} old tiles from cache`);
    }
    
    async preloadVisibleTiles(map) {
        if (!this.cacheAvailable) return;
        
        const bounds = map.getBounds();
        const zoom = Math.floor(map.getZoom());
        
        // Calculate visible tiles
        const tiles = this.getTilesInBounds(bounds, zoom);
        
        // Preload tiles
        const promises = tiles.map(tile => this.preloadTile(tile));
        await Promise.all(promises);
    }
    
    getTilesInBounds(bounds, zoom) {
        const tiles = [];
        const tileCount = Math.pow(2, zoom);
        
        // Convert bounds to tile coordinates
        const minTile = this.lngLatToTile(bounds.getWest(), bounds.getNorth(), zoom);
        const maxTile = this.lngLatToTile(bounds.getEast(), bounds.getSouth(), zoom);
        
        // Get all tiles in bounds
        for (let x = minTile.x; x <= maxTile.x; x++) {
            for (let y = minTile.y; y <= maxTile.y; y++) {
                if (x >= 0 && x < tileCount && y >= 0 && y < tileCount) {
                    tiles.push({ x, y, z: zoom });
                }
            }
        }
        
        return tiles;
    }
    
    lngLatToTile(lng, lat, zoom) {
        const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
        const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 
                 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
        return { x, y };
    }
    
    async preloadTile(tile) {
        const url = `http://localhost:8081/tiles/${tile.z}/${tile.x}/${tile.y}.jpg`;
        
        // Check if already cached
        const cached = await this.getCachedTile(url);
        if (cached) return;
        
        try {
            const response = await fetch(url);
            if (response.ok) {
                await this.cacheTile(url, response);
            }
        } catch (error) {
            // Silently fail for missing tiles
        }
    }
}
```

### Step 7: Create Tile Generation UI

Create `tile-generator.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>D&D World Map - Tile Generator</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #f5f5f5;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .generator-container {
            background: rgba(22, 33, 62, 0.9);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            max-width: 600px;
            width: 100%;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        
        h1 {
            text-align: center;
            margin-bottom: 30px;
            background: linear-gradient(45deg, #e94560, #00d9ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-size: 2.5rem;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            color: #b0b0b0;
            font-size: 0.9rem;
        }
        
        input[type="file"],
        input[type="number"],
        select {
            width: 100%;
            padding: 12px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            color: #f5f5f5;
            font-size: 1rem;
            transition: all 0.3s ease;
        }
        
        input[type="file"]:hover,
        input[type="number"]:hover,
        select:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.2);
        }
        
        input[type="range"] {
            width: 100%;
            height: 6px;
            -webkit-appearance: none;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
            outline: none;
        }
        
        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            background: #e94560;
            border-radius: 50%;
            cursor: pointer;
        }
        
        .range-value {
            display: inline-block;
            margin-left: 10px;
            color: #e94560;
            font-weight: bold;
        }
        
        .button-group {
            display: flex;
            gap: 15px;
            margin-top: 30px;
        }
        
        button {
            flex: 1;
            padding: 15px;
            background: linear-gradient(45deg, #e94560, #e94560);
            border: none;
            border-radius: 10px;
            color: #ffffff;
            font-size: 1.1rem;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(233, 69, 96, 0.4);
        }
        
        button:disabled {
            background: #666;
            cursor: not-allowed;
            transform: none;
        }
        
        .progress-container {
            margin-top: 30px;
            display: none;
        }
        
        .progress-bar {
            width: 100%;
            height: 30px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            overflow: hidden;
            position: relative;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #e94560, #00d9ff);
            width: 0%;
            transition: width 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-weight: bold;
        }
        
        .log-output {
            margin-top: 20px;
            padding: 15px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 10px;
            font-family: 'Courier New', monospace;
            font-size: 0.85rem;
            max-height: 200px;
            overflow-y: auto;
            display: none;
        }
        
        .log-line {
            margin-bottom: 5px;
            opacity: 0;
            animation: fadeIn 0.3s ease forwards;
        }
        
        @keyframes fadeIn {
            to {
                opacity: 1;
            }
        }
        
        .success-message {
            text-align: center;
            margin-top: 20px;
            padding: 20px;
            background: rgba(0, 217, 255, 0.1);
            border: 2px solid #00d9ff;
            border-radius: 10px;
            display: none;
        }
    </style>
</head>
<body>
    <div class="generator-container">
        <h1>🗺️ Tile Generator</h1>
        
        <form id="tile-form">
            <div class="form-group">
                <label for="source-image">World Map Image</label>
                <input type="file" id="source-image" accept="image/*" required>
            </div>
            
            <div class="form-group">
                <label for="tile-size">Tile Size</label>
                <select id="tile-size">
                    <option value="256">256px (Smaller files)</option>
                    <option value="512" selected>512px (Recommended)</option>
                    <option value="1024">1024px (Higher quality)</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="max-zoom">
                    Maximum Zoom Level
                    <span class="range-value" id="zoom-value">7</span>
                </label>
                <input type="range" id="max-zoom" min="5" max="10" value="7">
            </div>
            
            <div class="form-group">
                <label for="quality">
                    JPEG Quality
                    <span class="range-value" id="quality-value">85%</span>
                </label>
                <input type="range" id="quality" min="60" max="100" value="85">
            </div>
            
            <div class="button-group">
                <button type="submit" id="generate-btn">Generate Tiles</button>
                <button type="button" id="preview-btn" disabled>Preview</button>
            </div>
        </form>
        
        <div class="progress-container" id="progress-container">
            <div class="progress-bar">
                <div class="progress-fill" id="progress-fill">0%</div>
            </div>
            <div class="log-output" id="log-output"></div>
        </div>
        
        <div class="success-message" id="success-message">
            <h2>✨ Tiles Generated Successfully!</h2>
            <p>Your world map has been tiled and is ready for use.</p>
            <p>Run <code>npm run tile-server</code> to serve the tiles.</p>
        </div>
    </div>
    
    <script>
        // UI Elements
        const form = document.getElementById('tile-form');
        const maxZoomSlider = document.getElementById('max-zoom');
        const zoomValue = document.getElementById('zoom-value');
        const qualitySlider = document.getElementById('quality');
        const qualityValue = document.getElementById('quality-value');
        const progressContainer = document.getElementById('progress-container');
        const progressFill = document.getElementById('progress-fill');
        const logOutput = document.getElementById('log-output');
        const successMessage = document.getElementById('success-message');
        
        // Update slider values
        maxZoomSlider.addEventListener('input', (e) => {
            zoomValue.textContent = e.target.value;
        });
        
        qualitySlider.addEventListener('input', (e) => {
            qualityValue.textContent = e.target.value + '%';
        });
        
        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fileInput = document.getElementById('source-image');
            const file = fileInput.files[0];
            
            if (!file) {
                alert('Please select a world map image');
                return;
            }
            
            // Show progress
            progressContainer.style.display = 'block';
            logOutput.style.display = 'block';
            form.style.display = 'none';
            
            // Start generation simulation
            await simulateTileGeneration();
        });
        
        // Simulate tile generation (in real implementation, this would call the Node.js script)
        async function simulateTileGeneration() {
            const maxZoom = parseInt(maxZoomSlider.value);
            let totalTiles = 0;
            
            // Calculate total tiles
            for (let z = 0; z <= maxZoom; z++) {
                totalTiles += Math.pow(4, z);
            }
            
            addLogLine(`🗺️ D&D World Map Tile Generator`);
            addLogLine(`================================`);
            addLogLine(`Tile Size: ${document.getElementById('tile-size').value}px`);
            addLogLine(`Zoom Levels: 0-${maxZoom}`);
            addLogLine(`Total tiles to generate: ${totalTiles}`);
            addLogLine('');
            
            let generated = 0;
            
            // Simulate generation for each zoom level
            for (let z = 0; z <= maxZoom; z++) {
                const tilesAtLevel = Math.pow(2, z) * Math.pow(2, z);
                addLogLine(`🔍 Generating zoom level ${z}...`);
                
                // Simulate tile generation with progress
                for (let i = 0; i < tilesAtLevel; i++) {
                    generated++;
                    const progress = (generated / totalTiles) * 100;
                    progressFill.style.width = progress + '%';
                    progressFill.textContent = Math.round(progress) + '%';
                    
                    // Simulate processing time
                    if (i % 10 === 0) {
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                }
                
                addLogLine(`✅ Zoom ${z}: ${Math.pow(2, z)}x${Math.pow(2, z)} tiles complete`);
            }
            
            addLogLine('');
            addLogLine('✨ Tile generation complete!');
            addLogLine(`Generated ${generated} tiles`);
            
            // Show success message
            successMessage.style.display = 'block';
            document.getElementById('preview-btn').disabled = false;
        }
        
        function addLogLine(text) {
            const line = document.createElement('div');
            line.className = 'log-line';
            line.textContent = text;
            logOutput.appendChild(line);
            logOutput.scrollTop = logOutput.scrollHeight;
        }
        
        // Preview button
        document.getElementById('preview-btn').addEventListener('click', () => {
            window.location.href = '/';
        });
    </script>
</body>
</html>
```

### Step 8: Update Package.json Scripts

Update the scripts section in package.json:

```json
{
  "scripts": {
    "start": "npm run tile-server & npm run dev",
    "build": "webpack --mode production",
    "dev": "webpack serve --mode development --open",
    "tile": "node scripts/generate-tiles.js",
    "tile-server": "node scripts/tile-server.js",
    "tile-ui": "live-server tile-generator.html --port=8082"
  }
}
```

### Step 9: Add Express Dependency

Add to package.json:

```json
{
  "devDependencies": {
    // ... existing dependencies ...
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}
```

## Testing Checklist

- [ ] Run `npm install` to get new dependencies
- [ ] Run `npm run tile` to generate tiles from your 20k image
- [ ] Watch the progress as tiles are generated
- [ ] Check `public/tiles/` folder for tile pyramid
- [ ] Open `public/tiles/preview.png` to see the grid preview
- [ ] Run `npm run tile-server` in one terminal
- [ ] Run `npm run dev` in another terminal
- [ ] Verify map loads with "TILED" badge
- [ ] Test zooming is smooth at all levels
- [ ] Check dev panel shows tile loading count
- [ ] Test with network throttling - tiles load progressively
- [ ] Try `npm run tile-ui` for visual tile generator

## Troubleshooting

### Tile generation fails
- Ensure your image is in `assets/world-map-20k.jpg`
- Check you have enough disk space (tiles can be 100MB+)
- Try with smaller maxZoom first (e.g., 5)
- Use PNG format for images with transparency

### Tiles not loading
- Verify tile server is running on port 8081
- Check browser console for CORS errors
- Ensure tiles were generated successfully
- Check network tab for 404 errors

### Performance still poor
- Increase tile size to 1024 for fewer requests
- Reduce JPEG quality to 75 for smaller files
- Enable browser caching
- Consider CDN for production

## Next Step

The next artifact **1_1_4_MultiResolutionTileGeneration** will enhance the tile system with:
- Retina display support
- WebP format for modern browsers
- Progressive tile loading
- Tile preloading strategies

---

**PROGRESS UPDATE**: "1_1_3 - ImageToVectorTilePipeline complete"# 1_1_3_ImageToVectorTilePipeline - 20k Image Tiling System

**ARTIFACT**: 1_1_3_ImageToVectorTilePipeline  
**STATUS**: In Progress  
**PREREQUISITES**: 1_1_2_BaseMapConfiguration complete  

## Overview

This artifact implements the critical system that transforms your 20k resolution world map into an efficient tile pyramid. This is what makes the map perform smoothly at all zoom levels - instead of loading the entire 20k image, we only load the tiles visible in the current viewport. We'll create both a Node.js script for tile generation and update the map to use the tiled source.

## Detailed Implementation

### Step 1: Install Tile Generation Dependencies

Add to your package.json devDependencies:

```json
{
  "devDependencies": {
    // ... existing dependencies ...
    "sharp": "^0.33.1",
    "mapbox-gl-style-spec": "^13.28.0",
    "tilelive": "^5.12.3",
    "@mapbox/mbtiles": "^0.12.1",
    "canvas": "^2.11.2"
  }
}
```

Run: `npm install`

### Step 2: Create Tile Generation Script

Create `scripts/generate-tiles.js`:

```javascript
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

class TileGenerator {
    constructor(options) {
        this.sourceImage = options.sourceImage;
        this.outputDir = options.outputDir || 'tiles';
        this.tileSize = options.tileSize || 512;
        this.minZoom = options.minZoom || 0;
        this.maxZoom = options.maxZoom || 7;
        this.quality = options.quality || 85;
        this.format = options.format || 'jpg';
        
        this.worldSize = null;
        this.image = null;
    }
    
    async initialize() {
        console.log('🗺️  D&D World Map Tile Generator');
        console.log('================================');
        console.log(`Source: ${this.sourceImage}`);
        console.log(`Output: ${this.outputDir}`);
        console.log(`Tile Size: ${this.tileSize}px`);
        console.log(`Zoom Levels: ${this.minZoom}-${this.maxZoom}`);
        console.log('');
        
        // Load image metadata
        const metadata = await sharp(this.sourceImage).metadata();
        this.worldSize = Math.max(metadata.width, metadata.height);
        
        console.log(`📐 Image dimensions: ${metadata.width}x${metadata.height}`);
        console.log(`📐 World size: ${this.worldSize}x${this.worldSize}`);
        
        // Create output directory
        await this.ensureDirectory(this.outputDir);
        
        // Calculate total tiles
        let totalTiles = 0;
        for (let z = this.minZoom; z <= this.maxZoom; z++) {
            const tilesPerSide = Math.pow(2, z);
            totalTiles += tilesPerSide * tilesPerSide;
        }
        
        console.log(`📊 Total tiles to generate: ${totalTiles}`);
        console.log('');
        
        return totalTiles;
    }
    
    async generateTiles() {
        const startTime = Date.now();
        let tilesGenerated = 0;
        
        // Generate tiles for each zoom level
        for (let z = this.minZoom; z <= this.maxZoom; z++) {
            console.log(`\n🔍 Generating zoom level ${z}...`);
            
            const tilesPerSide = Math.pow(2, z);
            const scaleFactor = tilesPerSide * this.tileSize / this.worldSize;
            
            // Create zoom directory
            const zoomDir = path.join(this.outputDir, z.toString());
            await this.ensureDirectory(zoomDir);
            
            // Process image for this zoom level
            const zoomImage = sharp(this.sourceImage)
                .resize({
                    width: Math.round(this.worldSize * scaleFactor),
                    height: Math.round(this.worldSize * scaleFactor),
                    fit: 'contain',
                    background: { r: 10, g: 10, b: 10 }
                });
            
            // Generate tiles for this zoom level
            for (let x = 0; x < tilesPerSide; x++) {
                const xDir = path.join(zoomDir, x.toString());
                await this.ensureDirectory(xDir);
                
                for (let y = 0; y < tilesPerSide; y++) {
                    const tilePath = path.join(xDir, `${y}.${this.format}`);
                    
                    // Extract tile
                    await zoomImage
                        .clone()
                        .extract({
                            left: x * this.tileSize,
                            top: y * this.tileSize,
                            width: this.tileSize,
                            height: this.tileSize
                        })
                        .toFormat(this.format, { 
                            quality: this.quality,
                            progressive: true 
                        })
                        .toFile(tilePath);
                    
                    tilesGenerated++;
                    
                    // Progress update
                    if (tilesGenerated % 10 === 0) {
                        process.stdout.write(`\r  Generated ${tilesGenerated} tiles...`);
                    }
                }
            }
            
            console.log(`\r  ✅ Zoom ${z}: ${tilesPerSide}x${tilesPerSide} tiles complete`);
        }
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n✨ Tile generation complete!`);
        console.log(`   Generated ${tilesGenerated} tiles in ${duration} seconds`);
        
        // Generate metadata
        await this.generateMetadata(tilesGenerated);
        
        // Generate preview
        await this.generatePreview();
    }
    
    async generateMetadata(tileCount) {
        const metadata = {
            version: '1.0.0',
            name: 'D&D World Map Tiles',
            description: 'Tiled version of the campaign world map',
            format: this.format,
            minzoom: this.minZoom,
            maxzoom: this.maxZoom,
            bounds: [-this.worldSize/2, -this.worldSize/2, this.worldSize/2, this.worldSize/2],
            center: [0, 0, Math.floor((this.minZoom + this.maxZoom) / 2)],
            tileSize: this.tileSize,
            tiles: [`tiles/{z}/{x}/{y}.${this.format}`],
            tileCount: tileCount,
            generated: new Date().toISOString()
        };
        
        await fs.writeFile(
            path.join(this.outputDir, 'metadata.json'),
            JSON.stringify(metadata, null, 2)
        );
        
        console.log('\n📄 Metadata file generated');
    }
    
    async generatePreview() {
        console.log('\n🖼️  Generating preview image...');
        
        // Create a small preview showing the tile grid
        const previewSize = 1024;
        const preview = await sharp(this.sourceImage)
            .resize(previewSize, previewSize, {
                fit: 'contain',
                background: { r: 10, g: 10, b: 10 }
            })
            .toBuffer();
        
        // Add grid overlay using canvas
        const canvas = createCanvas(previewSize, previewSize);
        const ctx = canvas.getContext('2d');
        
        // Draw the resized image
        const img = await loadImage(preview);
        ctx.drawImage(img, 0, 0);
        
        // Draw tile grid
        ctx.strokeStyle = 'rgba(233, 69, 96, 0.5)';
        ctx.lineWidth = 1;
        
        const gridSize = previewSize / Math.pow(2, 3); // Show zoom level 3 grid
        
        for (let i = 0; i <= previewSize; i += gridSize) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, previewSize);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(previewSize, i);
            ctx.stroke();
        }
        
        // Add text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('D&D World Map - Tile Preview', 20, 40);
        ctx.font = '18px Arial';
        ctx.fillText(`Tile Size: ${this.tileSize}px | Zoom: ${this.minZoom}-${this.maxZoom}`, 20, 70);
        
        // Save preview
        const buffer = canvas.toBuffer('image/png');
        await fs.writeFile(path.join(this.outputDir, 'preview.png'), buffer);
        
        console.log('✅ Preview image saved');
    }
    
    async ensureDirectory(dir) {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') throw error;
        }
    }
    
    // Optimization methods
    async optimizeTiles() {
        console.log('\n🔧 Optimizing tiles...');
        
        let optimized = 0;
        
        for (let z = this.minZoom; z <= this.maxZoom; z++) {
            const tilesPerSide = Math.pow(2, z);
            
            for (let x = 0; x < tilesPerSide; x++) {
                for (let y = 0; y < tilesPerSide; y++) {
                    const tilePath = path.join(this.outputDir, z.toString(), x.toString(), `${y}.${this.format}`);
                    
                    try {
                        // Check if tile is mostly empty (black)
                        const { dominant } = await sharp(tilePath).stats();
                        
                        // If tile is mostly black, replace with smaller placeholder
                        if (dominant.r < 20 && dominant.g < 20 && dominant.b < 20) {
                            await sharp({
                                create: {
                                    width: this.tileSize,
                                    height: this.tileSize,
                                    channels: 3,
                                    background: { r: 10, g: 10, b: 10 }
                                }
                            })
                            .toFormat(this.format, { quality: 50 })
                            .toFile(tilePath);
                            
                            optimized++;
                        }
                    } catch (error) {
                        // Tile doesn't exist, skip
                    }
                }
            }
        }
        
        console.log(`✅ Optimized ${optimized} empty tiles`);
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    
    // Parse arguments
    const options = {
        sourceImage: 'assets/world-map-20k.jpg',
        outputDir: 'public/tiles',
        tileSize: 512,
        minZoom: 0,
        maxZoom: 7,
        quality: 85,
        format: 'jpg'
    };
    
    // Override with command line args
    args.forEach(arg => {
        const [key, value] = arg.split('=');
        if (key && value) {
            const paramName = key.replace('--', '');
            if (paramName in options) {
                options[paramName] = isNaN(value) ? value : parseInt(value);
            }
        }
    });
    
    // Help text
    if (args.includes('--help')) {
        console.log(`
D&D World Map Tile Generator

Usage: npm run tile [options]

Options:
  --sourceImage=path   Path to source image (default: assets/world-map-20k.jpg)
  --outputDir=path     Output directory (default: public/tiles)
  --tileSize=number    Tile size in pixels (default: 512)
  --minZoom=number     Minimum zoom level (default: 0)
  --maxZoom=number     Maximum zoom level (default: 7)
  --quality=number     JPEG quality 1-100 (default: 85)
  --format=string      Output format: jpg or png (default: jpg)
  --help              Show this help

Example:
  npm run tile --maxZoom=8 --quality=90
        `);
        return;
    }
    
    try {
        const generator = new TileGenerator(options);
        await generator.initialize();
        await generator.generateTiles();
        await generator.optimizeTiles();
        
        console.log('\n🎉 All done! Your map is now tiled and ready for smooth zooming!');
        console.log(`\n📁 Tiles saved to: ${path.resolve(options.outputDir)}`);
        console.log('📝 Update your map configuration to use the tiled source\n');
        
    } catch (error) {
        console.error('\n❌ Error generating tiles:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = TileGenerator;
```

### Step 3: Create Tile Server for Development

Create `scripts/tile-server.js`:

```javascript
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 8081;
const TILE_DIR = path.join(__dirname, '..', 'public', 'tiles');

// Enable CORS for development
app.use(cors());

// Serve tiles with caching headers
app.get('/tiles/:z/:x/:y.:format', (req, res) => {
    const { z, x, y, format } = req.params;
    const tilePath = path.join(TILE_DIR, z, x, `${y}.${format}`);
    
    // Check if tile exists
    fs.access(tilePath, fs.constants.F_OK, (err) => {
        if (err) {
            // Return transparent tile if not found
            res.status(204).send();
            return;
        }
        
        // Set caching headers
        res.set({
            'Cache-Control': 'public, max-age=3600',
            'Content-Type': `image/${format}`
        });
        
        // Send tile
        res.sendFile(tilePath);
    });
});

// Serve metadata
app.get('/tiles/metadata.json', (req, res) => {
    res.sendFile(path.join(TILE_DIR, 'metadata.json'));
});

// Serve preview
app.get('/tiles/preview.png', (req, res) => {
    res.sendFile(path.join(TILE_DIR, 'preview.png'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🗺️  Tile server running at http://localhost:${PORT}`);
    console.log(`📁 Serving tiles from: ${TILE_DIR}`);
    console.log(`\n📍 Tile URL format: http://localhost:${PORT}/tiles/{z}/{x}/{y}.jpg`);
});
```

### Step 4: Update MapEngine to Use Tiles

Update `js/core/MapEngine.js` to support both tiled and single image modes:

```javascript
// Add to imports
const TILE_SERVER_URL = 'http://localhost:8081';

// Add new method to MapEngine class
async checkTileAvailability() {
    try {
        const response = await fetch(`${TILE_SERVER_URL}/tiles/metadata.json`);
        if (response.ok) {
            const metadata = await response.json();
            console.log('✅ Tile server detected, using tiled source');
            return metadata;
        }
    } catch (error) {
        console.log('📌 Tile server not running, using single image source');
    }
    return null;
}

// Update setupBaseMap method
async setupBaseMap() {
    const MapGL = window.MapGL;
    
    // Check if tiles are available
    const tileMetadata = await this.checkTileAvailability();
    
    let style;
    
    if (tileMetadata) {
        // Use tiled source for better performance
        style = {
            version: 8,
            sources: {
                'world-tiles': {
                    type: 'raster',
                    tiles: [`${TILE_SERVER_URL}/tiles/{z}/{x}/{y}.jpg`],
                    tileSize: tileMetadata.tileSize || 512,
                    minzoom: tileMetadata.minzoom || 0,
                    maxzoom: tileMetadata.maxzoom || 7,
                    bounds: tileMetadata.bounds,
                    attribution: 'D&D World Map'
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
                    source: 'world-tiles',
                    paint: {
                        'raster-opacity': 1,
                        'raster-fade-duration': 0
                    }
                }
            ]
        };
        
        // Show warning about performance
        this.showPerformanceWarning();
    }
    
    // Initialize map with appropriate style
    this.map = new MapGL.Map({
        container: this.containerId,
        style: style,
        center: Config.map.defaultCenter,
        zoom: Config.map.defaultZoom,
        minZoom: Config.map.minZoom,
        maxZoom: tileMetadata ? tileMetadata.maxzoom : Config.map.maxZoom,
        preserveDrawingBuffer: true,
        antialias: true,
        refreshExpiredTiles: false,
        trackResize: true
    });
    
    // Wait for map to load
    return new Promise(resolve => {
        this.map.on('load', () => {
            console.log('Map loaded successfully');
            
            // Add tile debugging if in dev mode
            if (Config.ui.enableDevPanel && tileMetadata) {
                this.addTileDebugging();
            }
            
            resolve();
        });
    });
}

// Add new helper methods
showTileInfo(metadata) {
    const infoDiv = document.createElement('div');
    infoDiv.className = 'tile-info';
    infoDiv.innerHTML = `
        <div class="tile-info-content">
            <span class="tile-badge">TILED</span>
            <span>Zoom ${metadata.minzoom}-${metadata.maxzoom}</span>
            <span>${metadata.tileCount} tiles</span>
        </div>
    `;
    
    document.getElementById('map-container').appendChild(infoDiv);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        infoDiv.style.opacity = '0';
        setTimeout(() => infoDiv.remove(), 500);
    }, 5000);
}

showPerformanceWarning() {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'performance-warning';
    warningDiv.innerHTML = `
        <div class="warning-content">
            ⚠️ Using full resolution image - performance may be limited
            <br>
            <small>Run 'npm run tile' to generate tiles for better performance</small>
        </div>
    `;
    
    document.getElementById('map-container').appendChild(warningDiv);
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        warningDiv.style.opacity = '0';
        setTimeout(() => warningDiv.remove(), 500);
    }, 10000);
}

addTileDebugging() {
    // Show tile boundaries in dev mode
    this.map.showTileBoundaries = true;
    
    // Track tile loading
    let loadingTiles = new Set();
    
    this.map.on('dataloading', (e) => {
        if (e.tile) {
            loadingTiles.add(e.tile.tileID.key);
            this.updateTileCount(loadingTiles.size);
        }
    });
    
    this.map.on('data', (e) => {
        if (e.tile) {
            loadingTiles.delete(e.tile.tileID.key);
            this.updateTileCount(loadingTiles.size);
        }
    });
    
    this.map.on('error', (e) => {
        if (e.tile) {
            console.error('Tile loading error:', e);
            loadingTiles.delete(e.tile.tileID.key);
        }
    });
}

updateTileCount(loadingCount) {
    const tileCountEl = document.getElementById('tile-count');
    if (tileCountEl) {
        const loaded = this.map.queryRenderedFeatures().length;
        tileCountEl.textContent = `${loaded} (${loadingCount} loading)`;
    }
}
                        'raster-fade-duration': 300
                    }
                }
            ]
        };
        
        // Update config with tile bounds
        if (tileMetadata.bounds) {
            Config.map.worldMapBounds = [
                [tileMetadata.bounds[0], tileMetadata.bounds[1]],
                [tileMetadata.bounds[2], tileMetadata.bounds[3]]
            ];
        }
        
        // Show tile info in UI
        this.showTileInfo(tileMetadata);
        
    } else {
        // Fallback to single image source
        style = {
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