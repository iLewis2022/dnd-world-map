import { useState, useEffect, useRef } from 'react'
import { MapEngine } from './core/MapEngine.js'
import { Config } from './core/Config.js'
import { Utils } from './core/Utils.js'
import './App.css'
import 'maplibre-gl/dist/maplibre-gl.css'

function App() {
  const mapContainerRef = useRef(null)
  const [mapEngine, setMapEngine] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentEpisode, setCurrentEpisode] = useState(1)
  const [locationName, setLocationName] = useState('The Beginning')
  const [zoomLevel, setZoomLevel] = useState(3)
  const [fps, setFps] = useState(60)
  const [tileCount, setTileCount] = useState(0)

  // Global app data
  const [worldData] = useState({
    currentEpisode: 1,
    locations: new Map(),
    episodes: new Map()
  })

  // Initialize map when component mounts
  useEffect(() => {
    const initializeMap = async () => {
      try {
        console.log('D&D Living World Map - Initializing...')
        
        // Start FPS monitoring if dev panel enabled
        if (Config.ui.enableDevPanel) {
          const fpsMonitor = () => {
            Utils.fps.update()
            setFps(Utils.fps.current)
            requestAnimationFrame(fpsMonitor)
          }
          fpsMonitor()
        }

        // Create map engine
        const engine = new MapEngine('map')
        
        // Listen for ready event
        engine.on('ready', () => {
          console.log('Map engine ready!')
          setIsLoading(false)
          setupMapListeners(engine)
          loadWorldData()
        })

        // Initialize the map
        await engine.initialize()
        setMapEngine(engine)

        // Make available globally for debugging
        window.DNDWorld = {
          engine,
          config: Config,
          utils: Utils,
          data: worldData
        }

      } catch (error) {
        console.error('Failed to initialize map:', error)
      }
    }

    if (mapContainerRef.current) {
      initializeMap()
    }
  }, [])

  // Set up map event listeners
  const setupMapListeners = (engine) => {
    const map = engine.getMap()
    
    // Update zoom level display
    map.on('zoom', () => {
      setZoomLevel(parseFloat(map.getZoom().toFixed(2)))
    })

    // Handle map clicks
    map.on('click', (e) => {
      console.log('Map clicked at:', e.lngLat)
      // Future: Add location pin, show details, etc.
    })

    // Update tile count for performance monitoring
    map.on('moveend', () => {
      const tiles = map.queryRenderedFeatures()
      setTileCount(tiles.length)
    })
  }

  // Load world data
  const loadWorldData = async () => {
    try {
      // Try to load from storage first
      const savedData = await Utils.loadFromStorage('worldData')
      
      if (savedData) {
        console.log('Loaded saved world data')
        Object.assign(worldData, savedData)
      } else {
        // Load default data (would be from JSON file in real implementation)
        const defaultData = {
          version: "0.1.0",
          worldName: "Your Campaign World",
          episodeCount: 112,
          currentEpisode: 1,
          episodes: {
            "1": {
              title: "The Beginning",
              description: "Where it all started",
              date: "Session 1",
              partyLocation: [0, 0]
            }
          }
        }
        Object.assign(worldData, defaultData)
      }

      // Auto-save periodically
      setInterval(async () => {
        await Utils.saveToStorage('worldData', worldData)
        console.log('World data auto-saved')
      }, Config.data.autoSaveInterval)

    } catch (error) {
      console.error('Error loading world data:', error)
    }
  }

  // Handle timeline changes
  const handleTimelineChange = (episode) => {
    setCurrentEpisode(episode)
    worldData.currentEpisode = episode
    
    // Update location name based on episode
    const episodeData = worldData.episodes[episode.toString()]
    if (episodeData) {
      setLocationName(episodeData.title)
    } else {
      setLocationName(`Episode ${episode} Location`)
    }

    console.log(`Loading data for Episode ${episode}`)
    // Future: Load location pins, update fog of war, show journey paths, etc.
  }

  // Control button handlers
  const handleZoomIn = () => {
    if (mapEngine) {
      mapEngine.getMap().zoomIn()
    }
  }

  const handleZoomOut = () => {
    if (mapEngine) {
      mapEngine.getMap().zoomOut()
    }
  }

  const handleResetView = () => {
    if (mapEngine) {
      mapEngine.flyTo({
        center: Config.map.defaultCenter,
        zoom: Config.map.defaultZoom,
        pitch: 0,
        bearing: 0,
        duration: 1000
      })
    }
  }

  const handleToggle3D = () => {
    if (mapEngine) {
      const map = mapEngine.getMap()
      const currentPitch = map.getPitch()
      map.flyTo({
        pitch: currentPitch === 0 ? 60 : 0,
        duration: 1000
      })
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!Config.ui.enableKeyboardShortcuts) return
      
      switch(e.key) {
        case '+':
        case '=':
          handleZoomIn()
          break
        case '-':
        case '_':
          handleZoomOut()
          break
        case 'r':
          handleResetView()
          break
        case '3':
          handleToggle3D()
          break
        case 'd':
          if (e.ctrlKey) {
            e.preventDefault()
            // Toggle dev panel visibility
            const devPanel = document.getElementById('dev-panel')
            if (devPanel) {
              devPanel.style.display = devPanel.style.display === 'none' ? 'block' : 'none'
            }
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mapEngine])

  return (
    <div className="App">
      {/* Loading Screen */}
      {isLoading && (
        <div id="loading-screen" className="loading-screen">
          <div className="loading-content">
            <h1>Entering the Realm...</h1>
            <div className="loading-bar">
              <div className="loading-progress"></div>
            </div>
            <p className="loading-status">Initializing world engine...</p>
          </div>
        </div>
      )}

      {/* Main Map Container */}
      <div className="map-container">
        <div id="map" className="map" ref={mapContainerRef}></div>
      </div>

      {/* UI Overlay */}
      <div className="ui-overlay">
        {/* Controls */}
        <div className="controls-panel">
          <button 
            id="zoom-in" 
            className="control-btn" 
            title="Zoom In"
            onClick={handleZoomIn}
          >
            +
          </button>
          <button 
            id="zoom-out" 
            className="control-btn" 
            title="Zoom Out"
            onClick={handleZoomOut}
          >
            -
          </button>
          <button 
            id="reset-view" 
            className="control-btn" 
            title="Reset View"
            onClick={handleResetView}
          >
            ⌂
          </button>
          <button 
            id="toggle-3d" 
            className="control-btn" 
            title="Toggle 3D"
            onClick={handleToggle3D}
          >
            3D
          </button>
        </div>

        {/* Info Panel */}
        <div className="info-panel">
          <h2>Episode <span id="current-episode">{currentEpisode}</span> / <span id="total-episodes">112</span></h2>
          <div id="location-name" className="location-name">{locationName}</div>
        </div>

        {/* Timeline */}
        <div className="timeline-container">
          <input 
            type="range" 
            id="episode-timeline" 
            min="1" 
            max="112" 
            value={currentEpisode}
            className="timeline-slider"
            onChange={(e) => handleTimelineChange(parseInt(e.target.value))}
          />
        </div>
      </div>

      {/* Dev Tools */}
      {Config.ui.enableDevPanel && (
        <div id="dev-panel" className="dev-panel">
          <div className="dev-stats">
            <div>FPS: <span id="fps">{fps}</span></div>
            <div>Zoom: <span id="zoom-level">{zoomLevel}</span></div>
            <div>Tiles: <span id="tile-count">{tileCount}</span></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
