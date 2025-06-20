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