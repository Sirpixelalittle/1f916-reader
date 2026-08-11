import { copyFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const indexPath = resolve('dist/index.html')
const fallbackPath = resolve('dist/404.html')

await copyFile(indexPath, fallbackPath)
console.log('Created dist/404.html for static-host SPA route fallback.')
