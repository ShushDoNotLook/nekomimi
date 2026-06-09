const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const packageJson = require(path.join(projectRoot, 'package.json'))
const resourceDir = path.join(projectRoot, 'resources', 'fps_unlock')
const scriptPath = path.join(resourceDir, 'start-genshin-keqing.sh')
const unlockerPath = path.join(resourceDir, 'keqing_unlock.exe')

function fail(message) {
  console.error(`[check-genshin-fps-unlocker] ${message}`)
  process.exitCode = 1
}

if (!fs.existsSync(scriptPath)) {
  fail(`missing wrapper: ${path.relative(projectRoot, scriptPath)}`)
}

if (!fs.existsSync(unlockerPath)) {
  fail(`missing binary: ${path.relative(projectRoot, unlockerPath)}`)
}

if (fs.existsSync(scriptPath)) {
  const stat = fs.statSync(scriptPath)
  if ((stat.mode & 0o111) === 0) {
    fail(`wrapper is not executable: ${path.relative(projectRoot, scriptPath)}`)
  }

  const script = fs.readFileSync(scriptPath, 'utf8')
  const forbidden = [
    '/nekomimi/',
    '/suki-yo/nekomimi/',
    '/dev-data/fps_unlock',
  ]
  for (const marker of forbidden) {
    if (script.includes(marker)) {
      fail(`wrapper still contains hardcoded legacy path marker: ${marker}`)
    }
  }
}

const extraResources = packageJson.build?.extraResources ?? []
if (!extraResources.includes('resources/**/*')) {
  fail('package.json build.extraResources must include resources/**/*')
}

