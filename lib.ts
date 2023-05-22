/* eslint-disable prefer-arrow/prefer-arrow-functions, @typescript-eslint/require-await */

declare const dump: (msg: string) => void
import { patch as $patch$, unpatch as $unpatch$ } from './monkey-patch'

dump('AltOpen PDF: loading\n')

declare const Components: any
const {
  // interfaces: Ci,
  // results: Cr,
  utils: Cu,
  // Constructor: CC,
} = Components

declare const Zotero: any
declare const ZoteroPane: any
declare const Zotero_LocateMenu: any

const NAMESPACE = {
  XUL: 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul',
  HTML: 'http://www.w3.org/1999/xhtml',
}
function createElement(name: string, attrs: Record<string, string> = {}, namespace = NAMESPACE.XUL): HTMLElement {
  const elt: HTMLElement = document.createElementNS(namespace, name) as HTMLElement
  attrs.class = `alt-open-pdf ${attrs.class || ''}`.trim()
  for (const [a, v] of Object.entries(attrs)) {
    elt.setAttribute(a, v)
  }
  return elt
}
function removeElements() {
  for (const elt of Array.from(document.getElementsByClassName('alt-open-pdf'))) {
    elt.remove()
  }
}

if (Zotero.platformMajorVersion < 102 && typeof URL === 'undefined') {
  Cu.importGlobalProperties(['URL'])
}

Zotero.AltOpenPDF = Zotero.AltOpenPDF || new class ZoteroAltOpenPDF {
  log(msg) {
    Zotero.debug(`AltOpen PDF: ${msg}`)
  }

  shutdown() {
    this.log('shutdown')
    $unpatch$()
    removeElements()
  }

  async startup() {
    this.log('startup')
    this.log(`patching ${typeof Zotero_LocateMenu}`)
    $patch$(Zotero_LocateMenu, 'buildContextMenu', original => async function Zotero_LocateMenu_buildContextMenu(menu: HTMLElement, _showIcons: boolean): Promise<void> {
      await original.apply(this, arguments) // eslint-disable-line prefer-rest-params

      let sibling: HTMLElement
      for (const mi of menu.children as unknown as HTMLElement[]) {
        if (mi.style?.listStyleImage !== 'url("chrome://zotero/skin/treeitem-attachment-pdf.png")') continue

        if (mi.getAttribute('zotero-open-pdf-external')) {
          sibling = null
          break
        }

        sibling = mi
      }

      if (sibling) {
        const menuitem = createElement('menuitem')
        for (const att of Array.from(sibling.attributes)) {
          menuitem.setAttribute(att.nodeName, att.nodeValue)
        }
        menuitem.setAttribute('zotero-open-pdf-external', 'true')

        if (Zotero.Prefs.get('fileHandler.pdf')) { // existing Open option = external
          menuitem.setAttribute('label', Zotero.getString('locate.internalViewer.label') as string)
          menuitem.addEventListener('command', async event => { // eslint-disable-line @typescript-eslint/no-misused-promises
            event.stopPropagation()
            const items = ZoteroPane.getSelectedItems()
            for (const item of items) {
              const attachment = item.isAttachment() ? item : (await item.getBestAttachment())
              if (attachment?.attachmentPath.match(/[.]pdf$/i)) {
                await Zotero.Reader.open(attachment.itemID, false, { openInWindow: false })
              }
            }
          }, false)
        }
        else { // existing Open option = internal
          menuitem.setAttribute('label', Zotero.getString('locate.externalViewer.label') as string)
          menuitem.addEventListener('command', async event => { // eslint-disable-line @typescript-eslint/no-misused-promises
            event.stopPropagation()
            const items = ZoteroPane.getSelectedItems()
            for (const item of items) {
              const attachment = item.isAttachment() ? item : (await item.getBestAttachment())
              if (attachment?.attachmentPath.match(/[.]pdf$/i)) {
                Zotero.launchFile(attachment.getFilePath())
              }
            }
          }, false)
        }

        // sibling.after(menuitem)
        sibling.parentNode.insertBefore(menuitem, sibling.nextSibling)
      }
    })
  }
}
