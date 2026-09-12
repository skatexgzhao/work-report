const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

/**
 * Load env: backend/.env first, then /etc/team-report/config.env (production overrides).
 */
function loadEnv() {
  const localEnv = path.join(__dirname, '..', '.env')
  if (fs.existsSync(localEnv)) {
    dotenv.config({ path: localEnv })
  }

  const systemPaths = [
    process.env.TEAM_REPORT_CONFIG,
    '/etc/team-report/config.env'
  ].filter(Boolean)

  for (const configPath of systemPaths) {
    if (fs.existsSync(configPath)) {
      dotenv.config({ path: configPath, override: true })
      break
    }
  }
}

module.exports = { loadEnv }
