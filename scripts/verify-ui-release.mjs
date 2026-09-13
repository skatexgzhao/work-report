import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const indexPath = path.join(root, 'frontend', 'dist', 'index.html')

if (!fs.existsSync(indexPath)) {
  console.error('FAIL: run npm run build in frontend first')
  process.exit(1)
}

const html = fs.readFileSync(indexPath, 'utf8')
const m = html.match(/src="\/assets\/(index-[^"]+\.js)"/)
if (!m) {
  console.error('FAIL: index.html missing asset script')
  process.exit(1)
}

const js = fs.readFileSync(path.join(root, 'frontend', 'dist', 'assets', m[1]), 'utf8')
const required = ['登录与使用流程', '创建小组', 'teams/public']
const forbidden = ['怎么走']

for (const s of required) {
  if (!js.includes(s)) {
    console.error(`FAIL: bundle missing: ${s}`)
    process.exit(1)
  }
}
for (const s of forbidden) {
  if (js.includes(s)) {
    console.error(`FAIL: bundle still contains: ${s}`)
    process.exit(1)
  }
}

console.log(`OK: ${m[1]} has new home-guide UI`)
process.exit(0)
