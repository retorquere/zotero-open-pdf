/* eslint-disable no-var, prefer-arrow/prefer-arrow-functions, @typescript-eslint/require-await */

// declare const dump: (msg: string) => void

declare const ChromeUtils: any

import { patch as $patch$, unpatch as $unpatch$ } from './monkey-patch'
import unshell from 'shell-quote/parse'

declare const Zotero: any

var window: Window
var document: Document
// var setInterval
// var clearInterval
// var TextDecoder
// var require
// var ErrorEvent
var Zotero_LocateMenu
var ZoteroPane

function newWindow() {
  window = Zotero.getMainWindow()
  ZoteroPane = Zotero.getActiveZoteroPane()
  document = window.document
  // setInterval = window.setInterval.bind(win)
  // clearInterval = window.clearInterval.bind(win)
  // TextDecoder = window.TextDecoder
  // require = window.require
  // ErrorEvent = window.ErrorEvent
  Zotero_LocateMenu = (window as any).Zotero_LocateMenu
}
newWindow()

if (typeof Services == 'undefined') var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm') // eslint-disable-line no-var

declare const Components: any
const {
  // interfaces: Ci,
  // results: Cr,
  utils: Cu,
  // Constructor: CC,
} = Components

function log(msg) {
  if (typeof msg !== 'string') msg = JSON.stringify(msg)
  Zotero.debug(`AltOpen PDF: ${msg}`)
}

const windowListener = {
  onOpenWindow: xulWindow => {
    const win: Window = xulWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindow)
    win.addEventListener('load', function listener() { // eslint-disable-line prefer-arrow/prefer-arrow-functions
      log(`opened ${win.location.href}`)
      newWindow()
      Zotero.AltOpenPDF?.startup()
    }, false)
  },
  // onCloseWindow: () => { },
  // onWindowTitleChange: _xulWindow => { },
}
Services.wm.addListener(windowListener)

const Openers = 'extensions.zotero.open-pdf.with.'

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

if (Zotero.platformMajorVersion < 102) {
  const props = ['URL', 'Blob', 'FormData'].filter(p => typeof p === 'undefined')
  if (props.length) Cu.importGlobalProperties(props)
}

log('AltOpen PDF: lib loading')

function getOpener(opener: string): { label: string, cmdline: string } {
  if (!opener) return { label: '', cmdline: ''}
  const cmdline : string = Zotero.Prefs.get(opener, true)
  if (!cmdline) return { label: '', cmdline: ''}
  const m = cmdline.match(/^\[(.+?)\](.+)/)
  if (m) return { label: m[1], cmdline: m[2] }
  return { label: `Open PDF with ${opener.replace(Openers, '')}`, cmdline }
}

function exec(exe: string, args: string[] = []): void {
  log(`running ${JSON.stringify([exe].concat(args))}`)

  const cmd = Zotero.File.pathToFile(exe)
  if (!cmd.exists()) {
    flash('opening PDF failed', `${exe} not found`)
    return
  }
  if (!cmd.isExecutable()) {
    flash('opening PDF failed', `${exe} is not runnable`)
    return
  }

  const proc = Components.classes['@mozilla.org/process/util;1'].createInstance(Components.interfaces.nsIProcess)
  proc.init(cmd)
  proc.startHidden = true
  proc.runw(false, args, args.length)
}

function flash(title: string, body?: string, timeout = 8): void {
  try {
    log(`flash: ${JSON.stringify({title, body})}`)
    const pw = new Zotero.ProgressWindow()
    pw.changeHeadline(`open-pdf ${title}`)
    if (!body) body = title
    if (Array.isArray(body)) body = body.join('\n')
    pw.addDescription(body)
    pw.show()
    pw.startCloseTimer(timeout * 1000)
  }
  catch (err) {
    const msg = `${err}`
    log(`flash: ${JSON.stringify({title, body, err: msg})}`)
  }
}

Zotero.AltOpenPDF = Zotero.AltOpenPDF || new class ZoteroAltOpenPDF {
  shutdown() {
    log('shutdown')
    $unpatch$()
    removeElements()
  }

  async startup() {
    log(`patching ${typeof Zotero_LocateMenu}`)
    $patch$(Zotero_LocateMenu, 'buildContextMenu', original => async function Zotero_LocateMenu_buildContextMenu(menu: HTMLElement, _showIcons: boolean): Promise<void> {
      await original.apply(this, arguments) // eslint-disable-line prefer-rest-params

      try {
        let sibling: HTMLElement
        for (const mi of menu.children as unknown as HTMLElement[]) {
          if (mi.getAttribute('data-open-pdf-alternate')) { // already in menu
            return
          }

          if (mi.getAttribute('data-l10n-id') === 'item-menu-viewAttachment') { // zotero 7
            sibling = mi
          }

          if (mi.style?.listStyleImage === 'url("chrome://zotero/skin/treeitem-attachment-pdf.png")') { // zotero 6
            sibling = mi
          }
        }

        if (!sibling) {
          log('Error: sibling not found')
          return
        }

        const copyattr = (elt: HTMLElement) => {
          for (const att of Array.from(sibling.attributes)) {
            if (att.nodeName.match(/^data-l10n-/)) continue
            elt.setAttribute(att.nodeName, att.nodeValue)
          }
        }
        const alternate = createElement('menuitem')
        copyattr(alternate)
        alternate.setAttribute('data-open-pdf-alternate', 'true')

        if (Zotero.Prefs.get('fileHandler.pdf')) { // existing Open option = external
          log(`adding internal opener: ${Zotero.getString('locate.internalViewer.label')}`)
          alternate.setAttribute('label', Zotero.getString('locate.internalViewer.label') as string)
          alternate.addEventListener('command', async event => { // eslint-disable-line @typescript-eslint/no-misused-promises
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
          log(`adding external system opener: ${Zotero.getString('locate.externalViewer.label')}`)
          alternate.setAttribute('label', Zotero.getString('locate.externalViewer.label') as string)
          alternate.addEventListener('command', async event => { // eslint-disable-line @typescript-eslint/no-misused-promises
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

        sibling.parentNode.insertBefore(alternate, sibling.nextSibling)

        for (const cmdline of (Zotero.Prefs.rootBranch.getChildList(Openers, {}, {}) as string[]).sort()) {
          const opener = getOpener(cmdline)
          if (!opener.label || !opener.cmdline) continue

          log(`adding ${cmdline}: ${JSON.stringify(opener)}`)
          const custom = createElement('menuitem')
          copyattr(custom)
          custom.setAttribute('label', opener.label)
          custom.setAttribute('data-open-pdf', cmdline)
          custom.addEventListener('command', async event => { // eslint-disable-line @typescript-eslint/no-misused-promises
            event.stopPropagation()

            try {
              const target = event.target as HTMLSelectElement
              const runtime = getOpener(target.getAttribute('data-open-pdf'))
              if (!runtime.cmdline) throw new Error(`No opener for ${target.getAttribute('label')}`)

              const args : string[] = unshell(runtime.cmdline)
              log(`command: ${JSON.stringify(args)}`)
              const cmd = args.shift()
              const items = ZoteroPane.getSelectedItems()
              for (const item of items) {
                const attachment = item.isAttachment() ? item : (await item.getBestAttachment())
                if (attachment?.attachmentPath.match(/[.]pdf$/i)) {
                  exec(cmd, args.map((arg : string) => arg.toLowerCase() === '@pdf' ? attachment.getFilePath() as string : arg))
                }
              }
            }
            catch (err) {
              flash('Could not open attachments', (err.message as string) || 'unknown error')
            }
          }, false)
          alternate.parentNode.insertBefore(custom, alternate.nextSibling)
        }
      }
      catch (err) {
        log(`failed to patch menu: ${err}`)
      }
    })
  }
}
