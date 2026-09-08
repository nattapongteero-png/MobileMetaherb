import pp from 'puppeteer-core'
import { writeFileSync } from 'node:fs'
const ICONS = {
  home: 'M12 2.6 1.8 11.2c-.5.4-.2 1.3.5 1.3H4v8.2c0 .7.6 1.3 1.3 1.3h3.9c.7 0 1.3-.6 1.3-1.3v-4.2h3v4.2c0 .7.6 1.3 1.3 1.3h3.9c.7 0 1.3-.6 1.3-1.3v-8.2h1.7c.7 0 1-.9.5-1.3z',
  box: 'M12 1.7 2.6 6.1c-.4.2-.6.5-.6.9v10c0 .4.2.7.6.9l9.4 4.4c.3.1.5.1.8 0l9.4-4.4c.4-.2.6-.5.6-.9V7c0-.4-.2-.7-.6-.9l-9.4-4.4c-.3-.1-.5-.1-.8 0zm0 2.1 7 3.3-7 3.3-7-3.3z',
  leaf: 'M20.9 2.6C11.6 2.2 3 6.6 3 15.4c0 2 .5 3.7 1.4 5.1.3.5 1.1.4 1.3-.2C7.8 14 12 10.9 16.4 9.4c-3.7 2.4-6.9 5.6-8.4 11.3-.1.5.3 1 .8 1 7.8.2 13-5.5 13-14.4 0-1.3-.1-2.6-.3-3.8-.1-.5-.4-.8-.6-.9z',
  person: 'M12 12.2a4.7 4.7 0 1 0 0-9.4 4.7 4.7 0 0 0 0 9.4zM12 14c-4.5 0-8.2 2.9-8.2 6.5 0 .8.6 1.4 1.4 1.4h13.6c.8 0 1.4-.6 1.4-1.4C20.2 16.9 16.5 14 12 14z',
}
const b = await pp.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new'})
const p = await b.newPage()
await p.setViewport({width:96, height:96, deviceScaleFactor:1})
for (const [name, d] of Object.entries(ICONS)) {
  await p.setContent(`<style>html,body{margin:0;background:transparent}</style><svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24"><path d="${d}" fill="#1F1F1F"/></svg>`)
  await new Promise(r => setTimeout(r, 200))
  writeFileSync(`assets/tabicons/${name}.png`, await p.screenshot({ omitBackground: true }))
  console.log(name)
}
await b.close()
