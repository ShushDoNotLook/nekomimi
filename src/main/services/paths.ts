// Path resolution - Node.js only
// This file uses Node APIs, so it can ONLY be imported in main process

import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { APP_NAME } from '../../shared/constants'

export function expandHome(value: string): string {
  if (value === '~') {
    return app.getPath('home')
  }

  if (value.startsWith('~/') || value.startsWith('~\\')) {
    return path.join(app.getPath('home'), value.slice(2))
  }

  return value
}

// Base directory for all app data.
// Override with SOLACE_DATA_DIR for explicit isolation. In development, prefer
// the repo-local dev-data tree when present so local runs keep using seeded data.
const getBaseDir = (): string => {
  const override = process.env.SOLACE_DATA_DIR ?? process.env.NEKOMIMI_DATA_DIR
  if (override && override.trim().length > 0) {
    return path.resolve(override)
  }

  const candidateDevDataDirs = app.isPackaged
    ? [
        ...(process.env.APPIMAGE ? [path.resolve(path.dirname(process.env.APPIMAGE), '..', 'dev-data')] : []),
        path.resolve(path.dirname(app.getPath('exe')), '..', 'dev-data'),
        path.resolve(path.dirname(app.getPath('exe')), '..', '..', 'dev-data'),
      ]
    : [path.resolve(process.cwd(), 'dev-data')]

  for (const candidate of candidateDevDataDirs) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  const defaultBase = path.join(app.getPath('home'), '.local', 'share', APP_NAME)
  const legacyBase = path.join(app.getPath('home'), '.local', 'share', 'nekomimi')

  if (fs.existsSync(legacyBase) && !fs.existsSync(defaultBase)) {
    return legacyBase
  }

  try {
    const stat = fs.lstatSync(defaultBase)
    if (stat.isSymbolicLink()) {
      const symlinkTarget = fs.readlinkSync(defaultBase)
      return path.resolve(path.dirname(defaultBase), symlinkTarget)
    }
  } catch {
    // Default path does not exist yet; fall back to creating it normally.
  }

  return defaultBase
}

// Resolved paths - call this after app is ready
export const getPaths = () => {
  const base = getBaseDir()

  return {
    // Database
    library: path.join(base, 'library.db'),

    // Per-game configs
    games: path.join(base, 'games'),

    // Runners (Wine/Proton) - bundled or downloaded
    runners: path.join(base, 'runners'),

    // XXMI Launcher + importers - bundled or downloaded
    xxmi: path.join(base, 'xxmi'),

    // Cache for downloads, patches
    cache: path.join(base, 'cache'),

    // App config
    config: path.join(base, 'config'),

    // Base for convenience
    base,
  }
}

// Type for paths (can be imported by other files)
export type AppPaths = ReturnType<typeof getPaths>

// Singleton instance - set after app is ready
let _paths: AppPaths | null = null

export function initPaths(): AppPaths {
  _paths = getPaths()

  // Ensure the managed app directories exist up front so packaged builds can
  // start cleanly without depending on a pre-seeded dev-data tree.
  fs.mkdirSync(_paths.base, { recursive: true })
  fs.mkdirSync(_paths.games, { recursive: true })
  fs.mkdirSync(_paths.runners, { recursive: true })
  fs.mkdirSync(_paths.xxmi, { recursive: true })
  fs.mkdirSync(_paths.cache, { recursive: true })
  fs.mkdirSync(_paths.config, { recursive: true })

  return _paths
}

export function getPathsInstance(): AppPaths {
  if (!_paths) {
    throw new Error('Paths not initialized. Call initPaths() first.')
  }
  return _paths
}
