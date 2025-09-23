import { JSDOM } from 'jsdom'
import fs from 'fs'

for (const kind of ['pdf', 'snapshot', 'epub']) {
  const icons = {}
  for (const mode of ['light', 'dark']) {
    const svg = fs.readFileSync(`../better-bibtex/submodules/zotero/chrome/skin/default/zotero/item-type/28/${mode}/attachment-${kind}.svg`, 'utf-8')

    icons[mode] = {
      dom: new JSDOM(svg, { contentType: 'image/svg+xml' })
    }
    icons[mode].doc = icons[mode].dom.window.document
    icons[mode].root = icons[mode].doc.querySelector('svg')

    for (const e of [...icons[mode].root.children]) {
      if (e.nodeName !== 'defs') e.classList.add(`${mode}-theme`)
    }
  }

  const style = icons.light.doc.createElement('style')
  style.textContent = `
    .light-theme {
      display: block;
    }

    .dark-theme {
      display: none;
    }

    @media (prefers-color-scheme: dark) {
      .light-theme {
        display: none;
      }

      .dark-theme {
        display: block;
      }
    }
  `

  icons.light.root.prepend(style)

  const clipPath = {
    light: icons.light.doc.querySelector('clipPath'),
    dark: icons.dark.doc.querySelectorAll('[clip-path]'),
  }

  if (clipPath.light) {
    for (const e of [...clipPath.dark]) {
      e.setAttribute('clip-path', clipPath.light.getAttribute('id'))
    }
  }

  let pred = [...icons.light.root.children].filter(e => e.nodeName !== 'defs').reverse()[0]
  for (const e of [...icons.dark.root.children]) {
    if (e.nodeName !== 'defs') {
      pred.after(e)
      pred = e
    }
  }

  fs.writeFileSync(`icons/${kind}.svg`, icons.light.dom.serialize())
}

