const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'teamplan.db')

let dbInstance = null

function getDb() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDb() first.')
  }
  return dbInstance
}

function runPragmas(db) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('PRAGMA journal_mode=WAL')
      db.run('PRAGMA foreign_keys=ON')
      db.run('PRAGMA busy_timeout=5000', (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  })
}

function initDb(dbPath = DB_PATH) {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance)
      return
    }
    const db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        reject(err)
        return
      }
      try {
        await runPragmas(db)
        dbInstance = db
        resolve(db)
      } catch (pragmaErr) {
        reject(pragmaErr)
      }
    })
  })
}

function closeDb() {
  return new Promise((resolve, reject) => {
    if (!dbInstance) {
      resolve()
      return
    }
    dbInstance.close((err) => {
      dbInstance = null
      if (err) reject(err)
      else resolve()
    })
  })
}

module.exports = { getDb, initDb, closeDb, DB_PATH }
