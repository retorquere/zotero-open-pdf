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

    for (const g of [...icons[mode].doc.querySelectorAll('g')]) {
      g.classList.add(`${mode}-theme`)
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

  const svg = icons.light.doc.querySelector('svg')
  svg.prepend(style)

  let pred = [...icons.light.doc.querySelectorAll('g')].reverse()[0]
  for (const g of [...icons.dark.doc.querySelectorAll('g')]) {
    pred.after(g)
    pred = g
  }

  fs.writeFileSync(`icons/${kind}.svg`, icons.light.dom.serialize())
}

