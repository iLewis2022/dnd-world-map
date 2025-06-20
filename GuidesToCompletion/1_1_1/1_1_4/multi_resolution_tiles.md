# 1_1_4_MultiResolutionTileGeneration - Advanced Tile Optimization

**ARTIFACT**: 1_1_4_MultiResolutionTileGeneration  
**STATUS**: In Progress  
**PREREQUISITES**: 1_1_3_ImageToVectorTilePipeline complete  

## Overview

This artifact enhances the tile system with multi-resolution support for retina displays, WebP format optimization, progressive loading strategies, and intelligent preloading. This ensures your map looks crisp on all devices while maintaining optimal performance.

## Detailed Implementation

### Step 1: Enhanced Tile Generator with Multi-Format Support

Create `scripts/generate-tiles-advanced.js`:

```javascript
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

class AdvancedTileGenerator {
    constructor(options) {
        this.sourceImage = options.sourceImage;
        this.outputDir = options.outputDir || 'public/tiles';
        this.tileSize = options.tileSize || 512;
        this.minZoom = options.minZoom || 0;
        this.maxZoom = options.maxZoom || 7;
        this.formats = options.formats || ['jpg', 'webp'];
        this.retinaSupport = options.retinaSupport !== false;
        this.quality = {
            jpg: options.jpgQuality || 85,
            webp: options.webpQuality || 80
        };
        
        this.stats = {
            tilesGenerated: 0,
            formatsCreated: {},
            totalSize: 0,
            startTime: Date.now()
        };
    }
    
    async initialize() {
        console.log('🗺️  Advanced D&D World Map Tile Generator');
        console.log('========================================');
        console.log(`Source: ${this.sourceImage}`);
        console.log(`Formats: ${this.formats.join(', ')}`);
        console.log(`Retina Support: ${this.retinaSupport ? 'Yes (@2x)' : 'No'}`);
        console.log('');
        
        // Initialize stats
        this.formats.forEach(format => {
            this.stats.formatsCreated[format] = 0;
        });
        
        // Load and prepare source image
        const metadata = await sharp(this.sourceImage).metadata();
        this.worldSize = Math.max(metadata.width, metadata.height);
        
        console.log(`📐 Image: ${metadata.width}x${metadata.height}`);
        console.log(`📐 World size: ${this.worldSize}x${this.worldSize}`);
        
        // Ensure output directories
        await this.ensureDirectory(this.outputDir);
        
        // Calculate tiles
        this.calculateTileRequirements();
        
        return this.totalTiles;
    }
    
    calculateTileRequirements() {
        this.totalTiles = 0;
        this.tilesByZoom = {};
        
        for (let z = this.minZoom; z <= this.maxZoom; z++) {
            const tilesPerSide = Math.pow(2, z);
            const tilesAtZoom = tilesPerSide * tilesPerSide;
            this.tilesByZoom[z] = tilesAtZoom;
            this.totalTiles += tilesAtZoom;
        }
        
        // Account for formats and retina
        const multiplier = this.formats.length * (this.retinaSupport ? 2 : 1);
        this.totalOperations = this.totalTiles * multiplier;
        
        console.log(`📊 Base tiles: ${this.totalTiles}`);
        console.log(`📊 Total operations: ${this.totalOperations}`);
        console.log('');
    }
    
    async generateAllTiles() {
        console.log('🚀 Starting advanced tile generation...\n');
        
        // Generate standard resolution tiles
        await this.generateTilesAtDensity(1);
        
        // Generate retina tiles if enabled
        if (this.retinaSupport) {
            console.log('\n🔍 Generating @2x retina tiles...\n');
            await this.generateTilesAtDensity(2);
        }
        
        // Generate metadata
        await this.generateAdvancedMetadata();
        
        // Generate optimization report
        await this.generateOptimizationReport();
        
        // Complete
        const duration = ((Date.now() - this.stats.startTime) / 1000).toFixed(2);
        console.log('\n✨ Advanced tile generation complete!');
        console.log(`   Generated ${this.stats.tilesGenerated} tiles in ${duration} seconds`);
        console.log(`   Total size: ${(this.stats.totalSize / 1024 / 1024).toFixed(2)}MB`);
    }
    
    async generateTilesAtDensity(density) {
        const suffix = density === 2 ? '@2x' : '';
        const actualTileSize = this.tileSize * density;
        
        for (let z = this.minZoom; z <= this.maxZoom; z++) {
            console.log(`🔍 Zoom ${z}${suffix}...`);
            
            const tilesPerSide = Math.pow(2, z);
            const scaleFactor = (tilesPerSide * actualTileSize) / this.worldSize;
            
            // Prepare scaled image for this zoom level
            const zoomImage = sharp(this.sourceImage)
                .resize({
                    width: Math.round(this.worldSize * scaleFactor),
                    height: Math.round(this.worldSize * scaleFactor),
                    fit: 'contain',
                    background: { r: 10, g: 10, b: 10 },
                    kernel: sharp.kernel.lanczos3 // Better quality for scaling
                });
            
            // Generate tiles in each format
            for (const format of this.formats) {
                const formatDir = path.join(this.outputDir, format);
                const zoomDir = path.join(formatDir, z.toString());
                await this.ensureDirectory(zoomDir);
                
                let tilesAtThisLevel = 0;
                
                for (let x = 0; x < tilesPerSide; x++) {
                    const xDir = path.join(zoomDir, x.toString());
                    await this.ensureDirectory(xDir);
                    
                    for (let y = 0; y < tilesPerSide; y++) {
                        const filename = `${y}${suffix}.${format}`;
                        const tilePath = path.join(xDir, filename);
                        
                        // Generate tile
                        const tileBuffer = await zoomImage
                            .clone()
                            .extract({
                                left: x * actualTileSize,
                                top: y * actualTileSize,
                                width: actualTileSize,
                                height: actualTileSize
                            })
                            .toFormat(format, this.getFormatOptions(format))
                            .toBuffer();
                        
                        // Optimize tile if mostly empty
                        const optimizedBuffer = await this.optimizeTileIfEmpty(
                            tileBuffer, 
                            format, 
                            actualTileSize
                        );
                        
                        // Save tile
                        await fs.writeFile(tilePath, optimizedBuffer);
                        
                        // Update stats
                        this.stats.tilesGenerated++;
                        this.stats.formatsCreated[format]++;
                        this.stats.totalSize += optimizedBuffer.length;
                        tilesAtThisLevel++;
                        
                        // Progress indicator
                        if (tilesAtThisLevel % 20 === 0) {
                            process.stdout.write(`\r  ${format}: ${tilesAtThisLevel}/${this.tilesByZoom[z]} tiles`);
                        }
                    }
                }
                
                console.log(`\r  ✅ ${format}: ${this.tilesByZoom[z]} tiles${suffix}`);
            }
        }
    }
    
    getFormatOptions(format) {
        switch (format) {
            case 'jpg':
                return {
                    quality: this.quality.jpg,
                    progressive: true,
                    optimizeScans: true,
                    mozjpeg: true
                };
            case 'webp':
                return {
                    quality: this.quality.webp,
                    lossless: false,
                    nearLossless: false,
                    smartSubsample: true,
                    reductionEffort: 4
                };
            case 'png':
                return {
                    compressionLevel: 9,
                    adaptiveFiltering: true,
                    palette: true
                };
            default:
                return {};
        }
    }
    
    async optimizeTileIfEmpty(buffer, format, tileSize) {
        // Analyze tile
        const stats = await sharp(buffer).stats();
        const mean = (stats.channels[0].mean + stats.channels[1].mean + stats.channels[2].mean) / 3;
        
        // If tile is mostly black (empty), create a tiny placeholder
        if (mean < 15) {
            return sharp({
                create: {
                    width: tileSize,
                    height: tileSize,
                    channels: 3,
                    background: { r: 10, g: 10, b: 10 }
                }
            })
            .toFormat(format, { quality: 50 })
            .toBuffer();
        }
        
        return buffer;
    }
    
    async generateAdvancedMetadata() {
        const metadata = {
            version: '2.0.0',
            name: 'D&D World Map Tiles (Advanced)',
            description: 'Multi-format, multi-resolution tile set',
            generated: new Date().toISOString(),
            source: {
                image: this.sourceImage,
                dimensions: `${this.worldSize}x${this.worldSize}`
            },
            tiles: {
                formats: this.formats,
                tileSize: this.tileSize,
                retinaSupport: this.retinaSupport,
                minZoom: this.minZoom,
                maxZoom: this.maxZoom,
                bounds: [-this.worldSize/2, -this.worldSize/2, this.worldSize/2, this.worldSize/2],
                center: [0, 0]
            },
            urls: {},
            statistics: {
                totalTiles: this.stats.tilesGenerated,
                totalSize: this.stats.totalSize,
                byFormat: this.stats.formatsCreated,
                generationTime: Date.now() - this.stats.startTime
            }
        };
        
        // Add URL patterns for each format
        this.formats.forEach(format => {
            metadata.urls[format] = {
                standard: `tiles/${format}/{z}/{x}/{y}.${format}`,
                retina: this.retinaSupport ? `tiles/${format}/{z}/{x}/{y}@2x.${format}` : null
            };
        });
        
        await fs.writeFile(
            path.join(this.outputDir, 'metadata-advanced.json'),
            JSON.stringify(metadata, null, 2)
        );
        
        console.log('\n📄 Advanced metadata generated');
    }
    
    async generateOptimizationReport() {
        const report = {
            title: 'Tile Optimization Report',
            generated: new Date().toISOString(),
            summary: {
                totalTiles: this.stats.tilesGenerated,
                totalSizeMB: (this.stats.totalSize / 1024 / 1024).toFixed(2),
                averageTileSizeKB: (this.stats.totalSize / this.stats.tilesGenerated / 1024).toFixed(2)
            },
            formats: {}
        };
        
        // Calculate format-specific stats
        for (const format of this.formats) {
            const count = this.stats.formatsCreated[format];
            report.formats[format] = {
                tileCount: count,
                percentOfTotal: ((count / this.stats.tilesGenerated) * 100).toFixed(1) + '%'
            };
        }
        
        // Size comparison
        if (this.formats.includes('jpg') && this.formats.includes('webp')) {
            const jpgSize = await this.calculateFormatSize('jpg');
            const webpSize = await this.calculateFormatSize('webp');
            report.optimization = {
                webpSavings: ((1 - webpSize / jpgSize) * 100).toFixed(1) + '%',
                webpSizeMB: (webpSize / 1024 / 1024).toFixed(2),
                jpgSizeMB: (jpgSize / 1024 / 1024).toFixed(2)
            };
        }
        
        await fs.writeFile(
            path.join(this.outputDir, 'optimization-report.json'),
            JSON.stringify(report, null, 2)
        );
        
        console.log('📊 Optimization report generated');
    }
    
    async calculateFormatSize(format) {
        let totalSize = 0;
        const formatDir = path.join(this.outputDir, format);
        
        const walkDir = async (dir) => {
            const files = await fs.readdir(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = await fs.stat(fullPath);
                
                if (stat.isDirectory()) {
                    await walkDir(fullPath);
                } else if (file.endsWith(`.${format}`)) {
                    totalSize += stat.size;
                }
            }
        };
        
        await walkDir(formatDir);
        return totalSize;
    }
    
    async ensureDirectory(dir) {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') throw error;
        }
    }
}

// Progressive Tile Loader Generator
class ProgressiveTileManifest {
    constructor(tilesDir) {
        this.tilesDir = tilesDir;
        this.manifest = {
            version: '1.0.0',
            progressive: {},
            critical: {},
            preload: {}
        };
    }
    
    async generate() {
        console.log('\n📋 Generating progressive loading manifest...');
        
        // Define critical tiles (center of map at low zoom)
        this.defineCriticalTiles();
        
        // Define progressive loading order
        await this.defineProgressiveOrder();
        
        // Define preload patterns
        this.definePreloadPatterns();
        
        // Save manifest
        await fs.writeFile(
            path.join(this.tilesDir, 'progressive-manifest.json'),
            JSON.stringify(this.manifest, null, 2)
        );
        
        console.log('✅ Progressive manifest generated');
    }
    
    defineCriticalTiles() {
        // Critical tiles are the center tiles at zoom levels 0-3
        this.manifest.critical.tiles = [];
        
        for (let z = 0; z <= 3; z++) {
            const tilesPerSide = Math.pow(2, z);
            const centerTile = Math.floor(tilesPerSide / 2);
            
            // Add center tile and immediate neighbors
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const x = centerTile + dx;
                    const y = centerTile + dy;
                    
                    if (x >= 0 && x < tilesPerSide && y >= 0 && y < tilesPerSide) {
                        this.manifest.critical.tiles.push({ z, x, y });
                    }
                }
            }
        }
    }
    
    async defineProgressiveOrder() {
        // Define loading priority based on distance from center
        this.manifest.progressive.rings = [];
        
        for (let z = 0; z <= 7; z++) {
            const tilesPerSide = Math.pow(2, z);
            const center = tilesPerSide / 2;
            const rings = [];
            
            // Create rings of tiles from center outward
            for (let ring = 0; ring < Math.ceil(tilesPerSide / 2); ring++) {
                const tilesInRing = [];
                
                for (let x = 0; x < tilesPerSide; x++) {
                    for (let y = 0; y < tilesPerSide; y++) {
                        const distance = Math.max(
                            Math.abs(x - center),
                            Math.abs(y - center)
                        );
                        
                        if (Math.floor(distance) === ring) {
                            tilesInRing.push({ x, y });
                        }
                    }
                }
                
                if (tilesInRing.length > 0) {
                    rings.push(tilesInRing);
                }
            }
            
            this.manifest.progressive.rings[z] = rings;
        }
    }
    
    definePreloadPatterns() {
        // Define smart preload patterns
        this.manifest.preload.patterns = {
            // Preload one zoom level up and down
            zoomChange: {
                up: 1,
                down: 1
            },
            // Preload tiles around viewport
            viewport: {
                buffer: 1, // tiles around visible area
                direction: true // preload in movement direction
            },
            // Preload along paths
            paths: {
                enabled: true,
                lookAhead: 3 // tiles ahead on path
            }
        };
    }
}

// CLI
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help')) {
        console.log(`
Advanced D&D World Map Tile Generator

Usage: npm run tile:advanced [options]

Options:
  --sourceImage=path     Source image path
  --formats=jpg,webp     Output formats (comma-separated)
  --retinaSupport=true   Generate @2x tiles
  --jpgQuality=85        JPEG quality (1-100)
  --webpQuality=80       WebP quality (1-100)
  --maxZoom=7            Maximum zoom level
  --progressive          Generate progressive manifest

Example:
  npm run tile:advanced --formats=jpg,webp --retinaSupport=true
        `);
        return;
    }
    
    // Parse options
    const options = {
        sourceImage: 'assets/world-map-20k.jpg',
        outputDir: 'public/tiles',
        formats: ['jpg', 'webp'],
        retinaSupport: true,
        jpgQuality: 85,
        webpQuality: 80,
        maxZoom: 7
    };
    
    args.forEach(arg => {
        const [key, value] = arg.split('=');
        if (key && value) {
            const param = key.replace('--', '');
            if (param === 'formats') {
                options.formats = value.split(',');
            } else if (param === 'retinaSupport') {
                options.retinaSupport = value === 'true';
            } else if (param in options) {
                options[param] = isNaN(value) ? value : parseInt(value);
            }
        }
    });
    
    try {
        // Generate tiles
        const generator = new AdvancedTileGenerator(options);
        await generator.initialize();
        await generator.generateAllTiles();
        
        // Generate progressive manifest if requested
        if (args.includes('--progressive')) {
            const manifest = new ProgressiveTileManifest(options.outputDir);
            await manifest.generate();
        }
        
        console.log('\n🎉 Advanced tile generation complete!');
        console.log('📁 Output directory:', path.resolve(options.outputDir));
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { AdvancedTileGenerator, ProgressiveTileManifest };
```

### Step 2: Smart Tile Loader

Create `js/core/SmartTileLoader.js`:

```javascript
export class SmartTileLoader {
    constructor(map, options = {}) {
        this.map = map;
        this.options = {
            enableWebP: options.enableWebP !== false,
            enableRetina: options.enableRetina !== false,
            preloadBuffer: options.preloadBuffer || 1,
            maxConcurrent: options.maxConcurrent || 6,
            cacheSize: options.cacheSize || 100
        };
        
        this.loading = new Set();
        this.loaded = new Map();
        this.queue = [];
        this.manifest = null;
        this.supportsWebP = false;
        this.devicePixelRatio = window.devicePixelRatio || 1;
        
        this.stats = {
            tilesLoaded: 0,
            bytesLoaded: 0,
            cacheHits: 0,
            format: 'jpg'
        };
    }
    
    async initialize() {
        // Check WebP support
        this.supportsWebP = await this.checkWebPSupport();
        this.stats.format = this.supportsWebP && this.options.enableWebP ? 'webp' : 'jpg';
        
        // Load progressive manifest
        try {
            const response = await fetch('/tiles/progressive-manifest.json');
            if (response.ok) {
                this.manifest = await response.json();
                console.log('✅ Progressive loading manifest loaded');
            }
        } catch (error) {
            console.log('📌 No progressive manifest, using standard loading');
        }
        
        // Set up map event listeners
        this.setupMapListeners();
        
        // Update tile source
        this.updateTileSource();
        
        console.log(`🖼️ Smart Tile Loader initialized`);
        console.log(`   Format: ${this.stats.format}`);
        console.log(`   Retina: ${this.shouldUseRetina() ? 'Yes' : 'No'}`);
    }
    
    async checkWebPSupport() {
        return new Promise(resolve => {
            const webP = new Image();
            webP.onload = webP.onerror = () => {
                resolve(webP.height === 2);
            };
            webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
        });
    }
    
    shouldUseRetina() {
        return this.options.enableRetina && this.devicePixelRatio > 1.5;
    }
    
    updateTileSource() {
        const format = this.stats.format;
        const suffix = this.shouldUseRetina() ? '@2x' : '';
        
        // Update the tile URL template
        const source = this.map.getSource('world-tiles');
        if (source) {
            const tileUrl = `http://localhost:8081/tiles/${format}/{z}/{x}/{y}${suffix}.${format}`;
            
            // Update source
            source.tiles = [tileUrl];
            
            // Force refresh
            this.map.style.sourceCaches['world-tiles'].clearTiles();
            this.map.style.sourceCaches['world-tiles'].update(this.map.transform);
            this.map.triggerRepaint();
        }
    }
    
    setupMapListeners() {
        // Preload tiles on movement
        this.map.on('moveend', () => {
            this.preloadVisibleTiles();
        });
        
        // Track zoom changes
        this.map.on('zoomend', () => {
            this.preloadZoomLevels();
        });
        
        // Monitor tile loading
        this.map.on('dataloading', (e) => {
            if (e.tile) {
                this.onTileLoading(e.tile);
            }
        });
        
        this.map.on('data', (e) => {
            if (e.tile) {
                this.onTileLoaded(e.tile);
            }
        });
        
        this.map.on('error', (e) => {
            if (e.tile) {
                this.onTileError(e.tile);
            }
        });
    }
    
    async preloadVisibleTiles() {
        const bounds = this.map.getBounds();
        const zoom = Math.floor(this.map.getZoom());
        
        // Get visible tile coordinates
        const tiles = this.getTilesInBounds(bounds, zoom, this.options.preloadBuffer);
        
        // Use progressive loading if manifest available
        if (this.manifest && this.manifest.progressive.rings[zoom]) {
            const rings = this.manifest.progressive.rings[zoom];
            
            // Load tiles in rings from center outward
            for (const ring of rings) {
                const ringTiles = ring
                    .filter(({ x, y }) => 
                        tiles.some(t => t.x === x && t.y === y && t.z === zoom)
                    );
                
                await this.preloadTiles(ringTiles.map(t => ({ ...t, z: zoom })));
            }
        } else {
            // Standard preloading
            await this.preloadTiles(tiles);
        }
    }
    
    async preloadZoomLevels() {
        const currentZoom = Math.floor(this.map.getZoom());
        const bounds = this.map.getBounds();
        
        // Preload one level up and down
        const zoomLevels = [
            currentZoom - 1,
            currentZoom + 1
        ].filter(z => z >= 0 && z <= 22);
        
        for (const zoom of zoomLevels) {
            const tiles = this.getTilesInBounds(bounds, zoom, 0);
            await this.preloadTiles(tiles, true); // Low priority
        }
    }
    
    getTilesInBounds(bounds, zoom, buffer = 0) {
        const tiles = [];
        const tileCount = Math.pow(2, zoom);
        
        // Convert bounds to tile coordinates
        const minTile = this.lngLatToTile(
            bounds.getWest(),
            bounds.getNorth(),
            zoom
        );
        const maxTile = this.lngLatToTile(
            bounds.getEast(),
            bounds.getSouth(),
            zoom
        );
        
        // Add buffer
        minTile.x = Math.max(0, minTile.x - buffer);
        minTile.y = Math.max(0, minTile.y - buffer);
        maxTile.x = Math.min(tileCount - 1, maxTile.x + buffer);
        maxTile.y = Math.min(tileCount - 1, maxTile.y + buffer);
        
        // Collect all tiles in range
        for (let x = minTile.x; x <= maxTile.x; x++) {
            for (let y = minTile.y; y <= maxTile.y; y++) {
                tiles.push({ x, y, z: zoom });
            }
        }
        
        return tiles;
    }
    
    lngLatToTile(lng, lat, zoom) {
        const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
        const y = Math.floor(
            (1 - Math.log(
                Math.tan(lat * Math.PI / 180) + 
                1 / Math.cos(lat * Math.PI / 180)
            ) / Math.PI) / 2 * Math.pow(2, zoom)
        );
        return { x, y };
    }
    
    async preloadTiles(tiles, lowPriority = false) {
        const format = this.stats.format;
        const suffix = this.shouldUseRetina() ? '@2x' : '';
        
        for (const tile of tiles) {
            const url = `http://localhost:8081/tiles/${format}/${tile.z}/${tile.x}/${tile.y}${suffix}.${format}`;
            const key = `${tile.z}/${tile.x}/${tile.y}`;
            
            // Skip if already loaded or loading
            if (this.loaded.has(key) || this.loading.has(key)) {
                this.stats.cacheHits++;
                continue;
            }
            
            // Add to queue
            this.queue.push({
                url,
                key,
                priority: lowPriority ? 1 : 0
            });
        }
        
        // Process queue
        this.processQueue();
    }
    
    async processQueue() {
        // Sort by priority
        this.queue.sort((a, b) => a.priority - b.priority);
        
        // Process up to max concurrent
        while (this.loading.size < this.options.maxConcurrent && this.queue.length > 0) {
            const item = this.queue.shift();
            this.loadTile(item);
        }
    }
    
    async loadTile(item) {
        this.loading.add(item.key);
        
        try {
            const response = await fetch(item.url);
            if (response.ok) {
                const blob = await response.blob();
                
                // Cache the tile
                this.loaded.set(item.key, {
                    url: URL.createObjectURL(blob),
                    size: blob.size,
                    timestamp: Date.now()
                });
                
                // Update stats
                this.stats.tilesLoaded++;
                this.stats.bytesLoaded += blob.size;
                
                // Manage cache size
                this.manageCacheSize();
            }
        } catch (error) {
            console.error(`Failed to load tile ${item.key}:`, error);
        } finally {
            this.loading.delete(item.key);
            
            // Continue processing queue
            this.processQueue();
        }
    }
    
    manageCacheSize() {
        if (this.loaded.size > this.options.cacheSize) {
            // Remove oldest tiles
            const entries = Array.from(this.loaded.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            const toRemove = entries.slice(0, entries.length - this.options.cacheSize);
            for (const [key, data] of toRemove) {
                URL.revokeObjectURL(data.url);
                this.loaded.delete(key);
            }
        }
    }
    
    onTileLoading(tile) {
        // Track loading state
        const key = `${tile.tileID.canonical.z}/${tile.tileID.canonical.x}/${tile.tileID.canonical.y}`;
        this.loading.add(key);
    }
    
    onTileLoaded(tile) {
        // Update loading state
        const key = `${tile.tileID.canonical.z}/${tile.tileID.canonical.x}/${tile.tileID.canonical.y}`;
        this.loading.delete(key);
        
        // Update UI
        this.updateLoadingIndicator();
    }
    
    onTileError(tile) {
        const key = `${tile.tileID.canonical.z}/${tile.tileID.canonical.x}/${tile.tileID.canonical.y}`;
        this.loading.delete(key);
        
        // Retry with fallback format
        if (this.stats.format === 'webp') {
            console.log('WebP tile failed, falling back to JPEG');
            this.stats.format = 'jpg';
            this.updateTileSource();
        }
    }
    
    updateLoadingIndicator() {
        const indicator = document.getElementById('tile-loading-indicator');
        if (indicator) {
            if (this.loading.size > 0) {
                indicator.style.display = 'block';
                indicator.textContent = `Loading ${this.loading.size} tiles...`;
            } else {
                indicator.style.display = 'none';
            }
        }
    }
    
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.loaded.size,
            queueSize: this.queue.length,
            loading: this.loading.size,
            cacheHitRate: this.stats.tilesLoaded > 0 
                ? (this.stats.cacheHits / (this.stats.tilesLoaded + this.stats.cacheHits) * 100).toFixed(1) + '%'
                : '0%',
            averageTileSize: this.stats.tilesLoaded > 0 
                ? (this.stats.bytesLoaded / this.stats.tilesLoaded / 1024).toFixed(1) + 'KB'
                : '0KB'
        };
    }
}
```

### Step 3: Enhanced Tile Server with Format Detection

Update `scripts/tile-server.js`:

```javascript
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');

const app = express();
const PORT = 8081;
const TILE_DIR = path.join(__dirname, '..', 'public', 'tiles');

// Enable CORS
app.use(cors());

// Middleware for format negotiation
app.use((req, res, next) => {
    // Check Accept header for WebP support
    const acceptHeader = req.get('Accept') || '';
    req.supportsWebP = acceptHeader.includes('image/webp');
    next();
});

// Smart tile serving with format fallback
app.get('/tiles/:format/:z/:x/:y:suffix?.:ext', async (req, res) => {
    const { format, z, x, y, suffix, ext } = req.params;
    
    try {
        // Try requested format first
        let tilePath = path.join(TILE_DIR, format, z, x, `${y}${suffix || ''}.${ext}`);
        
        try {
            await fs.access(tilePath);
        } catch (error) {
            // Try fallback formats
            if (format === 'webp' && ext === 'webp') {
                // Fallback to JPEG
                tilePath = path.join(TILE_DIR, 'jpg', z, x, `${y}${suffix || ''}.jpg`);
            } else if (suffix === '@2x') {
                // Fallback to standard resolution
                tilePath = path.join(TILE_DIR, format, z, x, `${y}.${ext}`);
            }
        }
        
        // Check if tile exists
        const stats = await fs.stat(tilePath);
        
        // Set headers
        const headers = {
            'Content-Type': `image/${ext}`,
            'Content-Length': stats.size,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Tile-Format': ext,
            'X-Tile-Resolution': suffix === '@2x' ? 'retina' : 'standard'
        };
        
        // Add performance hints
        if (req.query.preload === 'true') {
            headers['X-Priority'] = 'low';
        }
        
        res.set(headers);
        
        // Stream the tile
        const stream = require('fs').createReadStream(tilePath);
        stream.pipe(res);
        
    } catch (error) {
        // Return 204 No Content for missing tiles
        res.status(204).send();
    }
});

// Metadata endpoints
app.get('/tiles/metadata-advanced.json', async (req, res) => {
    try {
        const metadata = await fs.readFile(
            path.join(TILE_DIR, 'metadata-advanced.json'),
            'utf8'
        );
        res.json(JSON.parse(metadata));
    } catch (error) {
        res.status(404).json({ error: 'Metadata not found' });
    }
});

app.get('/tiles/progressive-manifest.json', async (req, res) => {
    try {
        const manifest = await fs.readFile(
            path.join(TILE_DIR, 'progressive-manifest.json'),
            'utf8'
        );
        res.json(JSON.parse(manifest));
    } catch (error) {
        res.status(404).json({ error: 'Progressive manifest not found' });
    }
});

// Optimization report
app.get('/tiles/optimization-report.json', async (req, res) => {
    try {
        const report = await fs.readFile(
            path.join(TILE_DIR, 'optimization-report.json'),
            'utf8'
        );
        res.json(JSON.parse(report));
    } catch (error) {
        res.status(404).json({ error: 'Optimization report not found' });
    }
});

// Tile statistics endpoint
app.get('/tiles/stats', async (req, res) => {
    const stats = {
        formats: [],
        totalTiles: 0,
        totalSize: 0
    };
    
    try {
        const formats = await fs.readdir(TILE_DIR);
        
        for (const format of formats) {
            if (!['jpg', 'webp', 'png'].includes(format)) continue;
            
            const formatStats = {
                format,
                tiles: 0,
                size: 0
            };
            
            // Count tiles recursively
            const countTiles = async (dir) => {
                const files = await fs.readdir(dir);
                
                for (const file of files) {
                    const fullPath = path.join(dir, file);
                    const stat = await fs.stat(fullPath);
                    
                    if (stat.isDirectory()) {
                        await countTiles(fullPath);
                    } else if (file.endsWith(`.${format}`)) {
                        formatStats.tiles++;
                        formatStats.size += stat.size;
                    }
                }
            };
            
            await countTiles(path.join(TILE_DIR, format));
            stats.formats.push(formatStats);
            stats.totalTiles += formatStats.tiles;
            stats.totalSize += formatStats.size;
        }
        
        res.json(stats);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', tileDir: TILE_DIR });
});

// Start server
app.listen(PORT, () => {
    console.log('🗺️  Advanced Tile Server');
    console.log('=======================');
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`📁 Serving: ${TILE_DIR}`);
    console.log(`🌐 CORS: Enabled`);
    console.log('');
    console.log('Endpoints:');
    console.log(`  Tiles: /tiles/{format}/{z}/{x}/{y}[@2x].{ext}`);
    console.log(`  Metadata: /tiles/metadata-advanced.json`);
    console.log(`  Manifest: /tiles/progressive-manifest.json`);
    console.log(`  Stats: /tiles/stats`);
});
```

### Step 4: Update MapEngine for Smart Loading

Update `js/core/MapEngine.js` to use the smart tile loader:

```javascript
// Add to imports
import { SmartTileLoader } from './SmartTileLoader.js';

// Add to MapEngine class
async initialize() {
    try {
        // ... existing initialization code ...
        
        // After map is ready
        this.smartTileLoader = new SmartTileLoader(this.map, {
            enableWebP: true,
            enableRetina: true,
            preloadBuffer: 1,
            maxConcurrent: 6
        });
        
        await this.smartTileLoader.initialize();
        
        // ... rest of initialization ...
    } catch (error) {
        console.error('Failed to initialize map:', error);
    }
}

// Add method to get tile stats
getTileStats() {
    return this.smartTileLoader ? this.smartTileLoader.getStats() : null;
}
```

### Step 5: Add Performance Monitoring UI

Create `js/ui/PerformanceMonitor.js`:

```javascript
export class PerformanceMonitor {
    constructor() {
        this.stats = {
            fps: 60,
            renderTime: 0,
            tileStats: null,
            memory: null
        };
        
        this.visible = false;
        this.updateInterval = null;
    }
    
    initialize() {
        this.createUI();
        this.bindEvents();
        this.startMonitoring();
    }
    
    createUI() {
        const monitor = document.createElement('div');
        monitor.id = 'performance-monitor';
        monitor.className = 'performance-monitor';
        monitor.innerHTML = `
            <div class="monitor-header">
                <h3>Performance Monitor</h3>
                <button class="monitor-close">×</button>
            </div>
            <div class="monitor-content">
                <div class="stat-group">
                    <h4>Rendering</h4>
                    <div class="stat-row">
                        <span>FPS:</span>
                        <span id="stat-fps" class="stat-value">60</span>
                    </div>
                    <div class="stat-row">
                        <span>Frame Time:</span>
                        <span id="stat-frametime" class="stat-value">16ms</span>
                    </div>
                </div>
                
                <div class="stat-group">
                    <h4>Tiles</h4>
                    <div class="stat-row">
                        <span>Format:</span>
                        <span id="stat-format" class="stat-value">-</span>
                    </div>
                    <div class="stat-row">
                        <span>Loaded:</span>
                        <span id="stat-loaded" class="stat-value">0</span>
                    </div>
                    <div class="stat-row">
                        <span>Cache Hit:</span>
                        <span id="stat-cache" class="stat-value">0%</span>
                    </div>
                    <div class="stat-row">
                        <span>Avg Size:</span>
                        <span id="stat-size" class="stat-value">0KB</span>
                    </div>
                </div>
                
                <div class="stat-group">
                    <h4>Memory</h4>
                    <div class="stat-row">
                        <span>Used:</span>
                        <span id="stat-memory" class="stat-value">-</span>
                    </div>
                    <div class="stat-row">
                        <span>Limit:</span>
                        <span id="stat-memory-limit" class="stat-value">-</span>
                    </div>
                </div>
                
                <div class="stat-group">
                    <h4>Network</h4>
                    <div class="stat-row">
                        <span>Downloaded:</span>
                        <span id="stat-downloaded" class="stat-value">0MB</span>
                    </div>
                    <div class="stat-row">
                        <span>Queue:</span>
                        <span id="stat-queue" class="stat-value">0</span>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(monitor);
        
        // Add styles
        this.addStyles();
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .performance-monitor {
                position: fixed;
                top: 100px;
                right: 20px;
                width: 300px;
                background: rgba(22, 33, 62, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 15px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                color: #f5f5f5;
                font-family: 'Courier New', monospace;
                font-size: 0.9rem;
                z-index: 1000;
                display: none;
            }
            
            .performance-monitor.visible {
                display: block;
            }
            
            .monitor-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .monitor-header h3 {
                margin: 0;
                font-size: 1.1rem;
                color: #e94560;
                font-family: 'Segoe UI', sans-serif;
            }
            
            .monitor-close {
                background: none;
                border: none;
                color: #f5f5f5;
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.3s ease;
            }
            
            .monitor-close:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            
            .monitor-content {
                padding: 20px;
            }
            
            .stat-group {
                margin-bottom: 20px;
            }
            
            .stat-group:last-child {
                margin-bottom: 0;
            }
            
            .stat-group h4 {
                margin: 0 0 10px 0;
                font-size: 0.85rem;
                color: #00d9ff;
                text-transform: uppercase;
                letter-spacing: 1px;
                font-family: 'Segoe UI', sans-serif;
            }
            
            .stat-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
                padding: 3px 0;
            }
            
            .stat-value {
                color: #00ff00;
                font-weight: bold;
            }
            
            .stat-value.warning {
                color: #ffff00;
            }
            
            .stat-value.error {
                color: #ff4444;
            }
        `;
        document.head.appendChild(style);
    }
    
    bindEvents() {
        // Close button
        document.querySelector('.monitor-close').addEventListener('click', () => {
            this.hide();
        });
        
        // Keyboard shortcut (Ctrl+Shift+P)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                this.toggle();
            }
        });
    }
    
    startMonitoring() {
        // Monitor FPS
        this.monitorFPS();
        
        // Update stats every second
        this.updateInterval = setInterval(() => {
            this.updateStats();
        }, 1000);
    }
    
    monitorFPS() {
        let lastTime = performance.now();
        let frames = 0;
        
        const measureFPS = () => {
            frames++;
            const currentTime = performance.now();
            
            if (currentTime >= lastTime + 1000) {
                this.stats.fps = Math.round((frames * 1000) / (currentTime - lastTime));
                this.stats.renderTime = Math.round(1000 / this.stats.fps);
                frames = 0;
                lastTime = currentTime;
            }
            
            if (this.visible) {
                requestAnimationFrame(measureFPS);
            }
        };
        
        measureFPS();
    }
    
    async updateStats() {
        if (!this.visible) return;
        
        // Update FPS
        const fpsElement = document.getElementById('stat-fps');
        if (fpsElement) {
            fpsElement.textContent = this.stats.fps;
            fpsElement.className = 'stat-value';
            
            if (this.stats.fps < 30) {
                fpsElement.className += ' error';
            } else if (this.stats.fps < 50) {
                fpsElement.className += ' warning';
            }
        }
        
        // Update frame time
        document.getElementById('stat-frametime').textContent = `${this.stats.renderTime}ms`;
        
        // Update tile stats
        if (window.DNDWorld && window.DNDWorld.engine) {
            const tileStats = window.DNDWorld.engine.getTileStats();
            if (tileStats) {
                document.getElementById('stat-format').textContent = 
                    tileStats.format.toUpperCase() + (tileStats.format === 'webp' ? ' ✓' : '');
                document.getElementById('stat-loaded').textContent = tileStats.tilesLoaded;
                document.getElementById('stat-cache').textContent = tileStats.cacheHitRate;
                document.getElementById('stat-size').textContent = tileStats.averageTileSize;
                document.getElementById('stat-downloaded').textContent = 
                    (tileStats.bytesLoaded / 1024 / 1024).toFixed(2) + 'MB';
                document.getElementById('stat-queue').textContent = tileStats.queueSize;
            }
        }
        
        // Update memory stats if available
        if (performance.memory) {
            const used = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
            const limit = (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(1);
            
            document.getElementById('stat-memory').textContent = `${used}MB`;
            document.getElementById('stat-memory-limit').textContent = `${limit}MB`;
            
            const memoryElement = document.getElementById('stat-memory');
            memoryElement.className = 'stat-value';
            
            const usage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
            if (usage > 0.9) {
                memoryElement.className += ' error';
            } else if (usage > 0.7) {
                memoryElement.className += ' warning';
            }
        }
    }
    
    show() {
        const monitor = document.getElementById('performance-monitor');
        monitor.classList.add('visible');
        this.visible = true;
        this.monitorFPS();
    }
    
    hide() {
        const monitor = document.getElementById('performance-monitor');
        monitor.classList.remove('visible');
        this.visible = false;
    }
    
    toggle() {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        const monitor = document.getElementById('performance-monitor');
        if (monitor) {
            monitor.remove();
        }
    }
}
```

### Step 6: Update Main.js to Include Performance Monitor

Add to main.js:

```javascript
// Add to imports
import { PerformanceMonitor } from './ui/PerformanceMonitor.js';

// In the ready event handler
DNDWorld.engine.on('ready', async () => {
    // ... existing code ...
    
    // Initialize performance monitor
    DNDWorld.performanceMonitor = new PerformanceMonitor();
    DNDWorld.performanceMonitor.initialize();
    
    // Show hint in console
    console.log('💡 Press Ctrl+Shift+P to toggle performance monitor');
});
```

### Step 7: Add Loading Indicator

Add to index.html:

```html
<!-- Add after map container -->
<div id="tile-loading-indicator" class="tile-loading-indicator">
    <div class="loading-spinner"></div>
    <span>Loading tiles...</span>
</div>
```

Add to css/map.css:

```css
/* Tile Loading Indicator */
.tile-loading-indicator {
    position: fixed;
    bottom: 40px;
    right: 20px;
    background: rgba(22, 33, 62, 0.9);
    backdrop-filter: blur(10px);
    padding: 12px 20px;
    border-radius: 25px;
    display: none;
    align-items: center;
    gap: 12px;
    color: #f5f5f5;
    font-size: 0.9rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 100;
}

.loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-top-color: #e94560;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* Format badges */
.format-badge {
    position: fixed;
    top: 20px;
    right: 100px;
    background: rgba(22, 33, 62, 0.9);
    backdrop-filter: blur(10px);
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 0.85rem;
    color: #f5f5f5;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.format-badge.webp::before {
    content: '✓';
    color: #00ff00;
    font-weight: bold;
}

.format-badge.retina::after {
    content: '@2x';
    color: #00d9ff;
    font-size: 0.75rem;
    vertical-align: super;
}
```

### Step 8: Update Package.json Scripts

```json
{
  "scripts": {
    // ... existing scripts ...
    "tile:advanced": "node scripts/generate-tiles-advanced.js",
    "tile:all": "npm run tile:advanced -- --formats=jpg,webp --retinaSupport=true --progressive"
  }
}
```

## Testing Checklist

- [ ] Run `npm install` for new dependencies
- [ ] Generate advanced tiles: `npm run tile:all`
- [ ] Verify WebP and retina tiles in `public/tiles/`
- [ ] Start tile server: `npm run tile-server`
- [ ] Load map and check format badge shows WebP
- [ ] Open Network tab - verify WebP tiles loading
- [ ] Test on high-DPI display - verify @2x tiles
- [ ] Press Ctrl+Shift+P for performance monitor
- [ ] Check tile cache hit rate improves with navigation
- [ ] Test fallback by disabling WebP in browser
- [ ] Verify progressive loading from center outward
- [ ] Check memory usage stays reasonable
- [ ] Test zoom transitions are smooth

## Troubleshooting

### WebP not loading
- Check browser supports WebP (most modern browsers do)
- Verify WebP tiles were generated
- Check console for format fallback messages

### Performance monitor shows low FPS
- Reduce tile size if needed
- Check GPU acceleration is enabled
- Monitor memory usage for leaks

### Retina tiles not loading
- Verify device pixel ratio > 1.5
- Check @2x tiles exist
- Test with Chrome DevTools device emulation

## Next Step

The next artifact **1_1_5_BasicNavigationControls** will add:
- Smooth zoom animations
- Keyboard navigation
- Touch gesture support
- Custom navigation UI

---

**PROGRESS UPDATE**: "1_1_4 - MultiResolutionTileGeneration complete"