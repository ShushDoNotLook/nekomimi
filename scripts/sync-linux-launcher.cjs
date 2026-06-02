const fs = require('fs')
const os = require('os')
const path = require('path')

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function copyIcon(projectRoot) {
  const sourceIconPath = path.join(projectRoot, 'resources', 'icon.png')
  const iconDir = path.join(os.homedir(), '.local', 'share', 'icons', 'hicolor', '512x512', 'apps')
  const targetIconPath = path.join(iconDir, 'solace.png')

  if (!fs.existsSync(sourceIconPath)) {
    throw new Error(`Missing icon source at ${sourceIconPath}`)
  }

  ensureDir(iconDir)
  fs.copyFileSync(sourceIconPath, targetIconPath)
  return targetIconPath
}

function findLatestAppImage(releaseDir, packageVersion) {
  const preferred = path.join(releaseDir, `Solace-${packageVersion}.AppImage`)
  if (fs.existsSync(preferred)) {
    return preferred
  }

  const candidates = fs.readdirSync(releaseDir)
    .filter((entry) => /^Solace-.*\.AppImage$/.test(entry))
    .map((entry) => path.join(releaseDir, entry))
    .filter((entry) => fs.statSync(entry).isFile())
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)

  return candidates[0] || null
}

function main() {
  const projectRoot = path.resolve(__dirname, '..')
  const packageJsonPath = path.join(projectRoot, 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  const releaseDir = path.join(projectRoot, 'release')
  const stableAppImagePath = path.join(releaseDir, 'Solace.AppImage')
  const appImagePath = findLatestAppImage(releaseDir, packageJson.version)
  const installedIconPath = copyIcon(projectRoot)

  if (!appImagePath) {
    throw new Error(`No AppImage found in ${releaseDir}`)
  }

  try {
    fs.unlinkSync(stableAppImagePath)
  } catch (error) {
    if (!error || error.code !== 'ENOENT') {
      throw error
    }
  }
  fs.symlinkSync(appImagePath, stableAppImagePath)

  const desktopDir = path.join(os.homedir(), '.local', 'share', 'applications')
  const desktopPath = path.join(desktopDir, 'solace.desktop')
  ensureDir(desktopDir)

  const desktopEntry = [
    '[Desktop Entry]',
    'Version=1.0',
    'Type=Application',
    'Name=Solace',
    'Comment=Anime game launcher',
    `Exec=${stableAppImagePath}`,
    `TryExec=${stableAppImagePath}`,
    'Icon=solace',
    'Terminal=false',
    'Categories=Game;',
    'StartupNotify=true',
    '',
  ].join('\n')

  try {
    fs.writeFileSync(desktopPath, desktopEntry, 'utf8')
    console.log(`[linux-launcher] Desktop entry: ${desktopPath}`)
  } catch (error) {
    const message = error && error.code ? `${error.code}: ${error.message}` : String(error)
    console.warn(`[linux-launcher] Failed to update desktop entry: ${message}`)
  }

  console.log(`[linux-launcher] Stable AppImage: ${stableAppImagePath} -> ${appImagePath}`)
  console.log(`[linux-launcher] Installed icon: ${installedIconPath}`)
}

main()
