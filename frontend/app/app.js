import { app, BrowserWindow, ipcMain, dialog, Notification, desktopCapturer, session } from "electron";
import path from "path";
import fs from "fs";

const EXAM_DURATION_SECONDS = 10 * 60;

let electronWindow = null;
let startTimestamp = null
let cameraShotPath = null;
let timerInterval = null;
let cameraInterval = null;

function createWindow() {
    electronWindow = new BrowserWindow({
        height: 1000,
        width: 1000,
        // fullscreen: true,
        // kiosk: true,
        webPreferences: {
            devTools: true,
            preload: path.join(import.meta.dirname, 'preload.js')
        }
    })



    electronWindow.loadURL('http://localhost:5173')
}

ipcMain.handle('start-timer', (event) => {
    startTimestamp = Date.now();

    if (timerInterval) clearInterval(timerInterval);
    if (cameraInterval) clearInterval(cameraInterval);

    // Send remaining seconds every 1s, stop when the 10 min are over
    timerInterval = setInterval(() => {
        const elapsed = (Date.now() - startTimestamp) / 1000;
        const remaining = Math.max(0, Math.round(EXAM_DURATION_SECONDS - elapsed));

        electronWindow.webContents.send('timer', remaining);

        if (remaining <= 0) {
            clearInterval(timerInterval);
            clearInterval(cameraInterval);
            timerInterval = null;
            cameraInterval = null;
        }
    }, 1000);

    // Capture user's camera snap every 5s
    cameraInterval = setInterval(() => {
        electronWindow.webContents.send('camera-shot')
    }, 5000);

    return EXAM_DURATION_SECONDS;
})


ipcMain.handle('store-camera-snap-image-on-disk', (_event, data) => {
    const folder = cameraShotPath || path.join(import.meta.dirname, "..", "user-camera-snap");

    fs.mkdirSync(folder, { recursive: true });

    const filePath = path.join(folder, `${Date.now()}.jpg`);
    fs.writeFileSync(filePath, Buffer.from(data));

    return filePath;
})

ipcMain.handle('quit-app', () => {
    app.quit();
})


ipcMain.on("show-rules", () => {
    dialog.showMessageBox(electronWindow, {
        type: "info",
        title: "Athena Exam Rules",
        message: "Exam Rules",
        detail:
            "1. Stay on the exam screen.\n" +
            "2. Camera must remain enabled.\n" +
            "3. Do not leave the exam.\n" +
            "4. Do not use external assistance.\n" +
            "5. Click Exit Exam when finished."
    });
});


app.whenReady().then(async () => {
    createWindow();

    setInterval(async () => {
        const sources = await desktopCapturer.getSources({types: ['screen'], thumbnailSize: {
            width: 1920,
            height: 1080
        }})
        
        const folder = path.join(import.meta.dirname, "..", "screen-captures");
        fs.mkdirSync(folder, { recursive: true });
        const filePath = path.join(folder, `${Date.now()}-screen.png`);
        fs.writeFileSync(filePath, sources[0].thumbnail.toPNG());
        console.log(`Saved screenshot to ${filePath}`);
    }, 5000);

    electronWindow.webContents.on('before-input-event', (event, input) => {
        console.log("Before Input Event:", input);
        if (input.key === 'q') {
            event.preventDefault();
        }
    });
});


async function showMessageBox() {
    const data = await dialog.showMessageBox({
        type: 'info',
        title: 'GuideLines for the exam',
        message: 'We store your data \n We take your capture shots after every 5 seconds \n If you caught cheating your marks will be zero',
        buttons: ['What Next', 'Go previous'],
        checkboxChecked: true,
        checkboxLabel: "Your are Ok with above guidelines"
    })

    const { response, checkboxChecked } = data;
    console.log(data);
    // response -> contains the index of the button
    // checkboxChecked -> contains user clicks the button
}


ipcMain.handle("showMessageBox", async () => {
    await showMessageBox();
})

// showOpenDialog box api can do lot of things can select files and folders
async function selectFile() {
    const response = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{
            name: 'ALl files',
            extensions: ['*']
        }],
    })

    // check what does response have
    const { filePaths, canceled } = response;
    console.log(response);
}

async function selectFolder() {
    const response = await dialog.showOpenDialog({
        title: 'Select the folder',
        buttonLabel: 'OK',
        properties: ['openDirectory'],
        defaultPath: '/'
    });

    console.log(response);
}

async function selectSnapFolder() {
    const { filePaths, canceled } = await dialog.showOpenDialog({
        title: 'Select the folder to store camera snaps',
        buttonLabel: 'OK',
        properties: ['openDirectory']
    });

    if (!canceled && filePaths[0]) {
        cameraShotPath = filePaths[0];
    }

    return cameraShotPath;
}

ipcMain.handle("selectSnapFolder", async () => {
    return await selectSnapFolder();
})

ipcMain.handle("selectFile", async () => {
    await selectFile();
})


ipcMain.handle("selectFolder", async () => {
    await selectFolder();
})


async function showSaveDialogBox() {
    const response = await dialog.showSaveDialog({
        title: 'Where to save file',
        message: 'Select the folder to save the file',
        buttonLabel: 'Save as',
        defaultPath: '/'
    })

    console.log(response);
}


ipcMain.handle("showSaveDialogBox", async () => {
    await showSaveDialogBox();
})





// TASKS
// Task 1
// Add a Button to trigger a folder selection using the Dialog Box element.
// All the Camera Snaps captured should be stored in this folder.

// Task 2
// Add Buttons and a Checkbox to the existing Rules Dialog Box.
// console.log the Checkbox selection and Clicked Button.