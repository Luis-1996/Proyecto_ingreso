const { app, BrowserWindow, dialog, session } = require('electron')
const path = require('path')
const fs = require('fs')
const http = require('http')
const { spawn } = require('child_process')

let mainWindow
let backendProcess
let frontendServer

const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || '8002', 10)
const FRONTEND_PORT = 3000
const isDev = !app.isPackaged

function getBackendDir() {
  if (isDev) {
    return path.join(__dirname, '..', 'backend')
  }
  return path.join(process.resourcesPath, 'backend')
}

function getFrontendDir() {
  if (isDev) {
    return path.join(__dirname, '..', 'frontend', 'out')
  }
  return path.join(process.resourcesPath, 'frontend', 'out')
}

function getPythonCmd() {
  return process.platform === 'win32' ? 'python' : 'python3'
}

function waitForServer(url, maxRetries = 30, interval = 500) {
  return new Promise((resolve, reject) => {
    let retries = 0
    const check = () => {
      http.get(url, (res) => {
        res.resume()
        resolve(true)
      }).on('error', () => {
        retries++
        if (retries >= maxRetries) {
          reject(new Error(`Server at ${url} not ready after ${maxRetries} retries`))
        } else {
          setTimeout(check, interval)
        }
      })
    }
    check()
  })
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

function startFrontendServer() {
  return new Promise((resolve, reject) => {
    const frontendDir = getFrontendDir()

    if (!fs.existsSync(frontendDir)) {
      console.error('Frontend build not found at', frontendDir)
      reject(new Error(`Frontend build not found at ${frontendDir}`))
      return
    }

    console.log('Serving frontend from:', frontendDir)

    frontendServer = http.createServer((req, res) => {
      let filePath = path.join(frontendDir, req.url === '/' ? 'index.html' : req.url.split('?')[0])

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(frontendDir, req.url === '/' ? 'index.html' : path.join(req.url.split('?')[0], 'index.html'))
      }

      if (!fs.existsSync(filePath)) {
        filePath = path.join(frontendDir, 'index.html')
      }

      const ext = path.extname(filePath)
      const contentType = MIME_TYPES[ext] || 'application/octet-stream'

      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(404)
          res.end('Not found')
          return
        }
        res.writeHead(200, { 'Content-Type': contentType })
        res.end(content)
      })
    })

    frontendServer.listen(FRONTEND_PORT, '127.0.0.1', () => {
      console.log(`Frontend server running on http://127.0.0.1:${FRONTEND_PORT}`)
      resolve(true)
    })

    frontendServer.on('error', reject)
  })
}

function startBackend() {
  return new Promise((resolve, reject) => {
    const backendDir = getBackendDir()
    const userDataDir = app.getPath('userData')

    if (isDev) {
      // Development: use python -m uvicorn
      const pythonCmd = getPythonCmd()
      if (!fs.existsSync(path.join(backendDir, 'main.py'))) {
        reject(new Error(`Backend not found at ${backendDir}`))
        return
      }
      backendProcess = spawn(pythonCmd, ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', String(BACKEND_PORT)], {
        cwd: backendDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, SQLITE_PATH: path.join(userDataDir, 'data', 'control_ingreso.db'), BACKEND_PORT: String(BACKEND_PORT) },
      })
    } else {
      // Production: use compiled backend.exe
      const exePath = path.join(backendDir, 'backend.exe')
      if (!fs.existsSync(exePath)) {
        reject(new Error(`Backend executable not found at ${exePath}`))
        return
      }
      console.log('Starting backend from:', exePath)
      backendProcess = spawn(exePath, [], {
        cwd: userDataDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, SQLITE_PATH: path.join(userDataDir, 'data', 'control_ingreso.db'), BACKEND_PORT: String(BACKEND_PORT) },
      })
    }

    backendProcess.stdout.on('data', (data) => {
      const msg = data.toString()
      console.log(`[Backend] ${msg.trim()}`)
      if (msg.includes('Uvicorn running')) {
        resolve(true)
      }
    })

    backendProcess.stderr.on('data', (data) => {
      const msg = data.toString()
      console.log(`[Backend] ${msg.trim()}`)
      if (msg.includes('Uvicorn running')) {
        resolve(true)
      }
    })

    backendProcess.on('error', (err) => {
      console.error('Backend error:', err)
      reject(err)
    })

    backendProcess.on('exit', (code) => {
      console.log(`Backend exited with code ${code}`)
    })

    setTimeout(() => {
      resolve(true)
    }, 10000)
  })
}

async function startApp() {
  console.log('Starting app...')
  console.log('isDev:', isDev)

  try {
    if (!isDev) {
      console.log('Starting frontend server...')
      await startFrontendServer()
    }

    console.log('Starting backend...')
    await Promise.race([
      startBackend(),
      waitForServer(`http://127.0.0.1:${BACKEND_PORT}/api/config/categorias`, 20, 500),
    ])

    createWindow()
  } catch (err) {
    console.error('Failed to start app:', err)
    dialog.showErrorBox(
      'Error al iniciar',
      `No se pudo iniciar la aplicación.\n\n${err.message}\n\nAsegúrate de tener Python 3.10+ instalado.`
    )
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 680,
    minWidth: 900,
    minHeight: 500,
    title: 'Control de Ingreso - Finca Tennis',
    icon: path.join(__dirname, '..', 'frontend', 'public', 'Tennis.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const url = isDev
    ? `http://localhost:${FRONTEND_PORT}`
    : `http://127.0.0.1:${FRONTEND_PORT}`

  session.defaultSession.clearCache().then(() => {
    console.log('Session cache cleared')
  }).catch(() => {})

  mainWindow.loadURL(url)

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(startApp)

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    startApp()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill()
    backendProcess = null
  }
  if (frontendServer) {
    frontendServer.close()
    frontendServer = null
  }
})
