// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld("athena", {
    registerListenerForTimerTickFromMain: (callback) => {
        const fn = (event, ...message) => {
            callback(message[0]);
        }

        ipcRenderer.on('timer', fn);

        return () => {
            ipcRenderer.removeListener('timer', fn);
        }
    },
    startTimerOnMain: () => {
        try {
            return ipcRenderer.invoke('start-timer');
        } catch (error) {
            throw "error starting timer: " + error.message;
        }
    }, 
    // main asks the renderer for a webcam frame every 5s
    registerListenerForCameraShotFromMain: (callback) => {
        const fn = () => callback();

        ipcRenderer.on('camera-shot', fn);

        return () => {
            ipcRenderer.removeListener('camera-shot', fn);
        }
    },
    storeCameraSnap: (bytes) => ipcRenderer.invoke('store-camera-snap-image-on-disk', bytes),
    selectSnapFolder: () => ipcRenderer.invoke('selectSnapFolder'),
    showRules: () => ipcRenderer.send('show-rules'),
    quitApp: () => ipcRenderer.invoke('quit-app')
})