// Utility to create a sample fantasy world map for testing
export function createSampleWorldMap(width = 2000, height = 2000) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    
    // Create a fantasy-style world map
    
    // Background (water)
    const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/2)
    gradient.addColorStop(0, '#1e3a8a')
    gradient.addColorStop(0.7, '#1e40af')
    gradient.addColorStop(1, '#1e3a8a')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
    
    // Add some landmasses
    ctx.fillStyle = '#22c55e'
    
    // Main continent
    ctx.beginPath()
    ctx.ellipse(width * 0.4, height * 0.3, width * 0.25, height * 0.2, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // Islands
    ctx.beginPath()
    ctx.ellipse(width * 0.7, height * 0.6, width * 0.1, height * 0.08, 0, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.beginPath()
    ctx.ellipse(width * 0.2, height * 0.7, width * 0.08, width * 0.06, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // Mountains (darker green)
    ctx.fillStyle = '#16a34a'
    ctx.beginPath()
    ctx.ellipse(width * 0.35, height * 0.25, width * 0.08, height * 0.05, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // Desert (sandy color)
    ctx.fillStyle = '#fbbf24'
    ctx.beginPath()
    ctx.ellipse(width * 0.5, height * 0.4, width * 0.06, height * 0.04, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // Forest (dark green)
    ctx.fillStyle = '#15803d'
    ctx.beginPath()
    ctx.ellipse(width * 0.3, height * 0.35, width * 0.05, height * 0.03, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // Add some fantasy elements
    
    // Cities (small dots)
    ctx.fillStyle = '#dc2626'
    const cities = [
        [width * 0.35, height * 0.3],
        [width * 0.42, height * 0.35],
        [width * 0.7, height * 0.6],
        [width * 0.2, height * 0.7]
    ]
    
    cities.forEach(([x, y]) => {
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fill()
    })
    
    // Add a fantasy-style border
    ctx.strokeStyle = '#92400e'
    ctx.lineWidth = 8
    ctx.strokeRect(20, 20, width - 40, height - 40)
    
    // Convert to blob and return URL
    return new Promise(resolve => {
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob)
            resolve(url)
        })
    })
}

// Create and save sample map
export async function setupSampleWorldMap() {
    const mapUrl = await createSampleWorldMap(2000, 2000)
    
    // Update config to use the sample map
    const { Config } = await import('../core/Config.js')
    Config.map.worldMapPath = mapUrl
    
    console.log('Sample world map created and configured')
    return mapUrl
} 