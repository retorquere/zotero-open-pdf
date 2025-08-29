/* eslint-disable no-var, prefer-arrow/prefer-arrow-functions, @typescript-eslint/require-await */

// declare const dump: (msg: string) => void

import { MenuManager, MenuitemOptions } from 'zotero-plugin-toolkit'
const Menu = new MenuManager()

import unshell from 'shell-quote/parse'

function log(msg) {
  if (typeof msg !== 'string') msg = JSON.stringify(msg)
  Zotero.debug(`AltOpen PDF: ${msg}`)
}

const Openers = {
  pdf: 'extensions.zotero.open-pdf.with.',
  snapshot: 'extensions.zotero.open-snapshot.with.',
}

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

log('AltOpen PDF: lib loading')

type Opener = { type: string, label: string; cmdline: string }
function getOpener(pref: string): Opener {
  const opener = { type: '', label: '', cmdline: '' }

  let m = pref?.match(/^extensions\.zotero\.open-(?<type>pdf|snapshot)\.with\.(?<label>.+)/)
  if (!m) return opener

  opener.type = m.groups.type
  opener.label = `Open ${m.groups.type === 'pdf' ? 'PDF' : m.groups.type} with ${m.groups.label}`
  opener.cmdline = (Zotero.Prefs.get(pref, true) as string) || ''

  if (opener.cmdline) {
    m = opener.cmdline.match(/^\[(?<label>.+?)\](?<cmdline>.+)/)
    if (m) {
      opener.label = m.groups.label
      opener.cmdline = m.groups.cmdline
    }
  }
  return opener
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
    log(`flash: ${JSON.stringify({ title, body })}`)
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
    log(`flash: ${JSON.stringify({ title, body, err: msg })}`)
  }
}

async function selectedPDF() {
  const items = Zotero.getActiveZoteroPane().getSelectedItems()
  if (items.length !== 1) return null
  const attachment = items[0].isAttachment() ? items[0] : await items[0].getBestAttachment()
  if (!attachment) return null
  if (!attachment.getFilePath()) return null
  return attachment.isPDFAttachment() ? attachment : null
}

async function selectedSnapshot() {
  const items = Zotero.getActiveZoteroPane().getSelectedItems()
  if (items.length !== 1) return null
  const attachment = items[0].isAttachment() ? items[0] : await items[0].getBestAttachment()
  if (!attachment) return null
  if (!attachment.getFilePath()) return null
  return attachment.isSnapshotAttachment() ? attachment : null
}

function openerMenuItem(opener: Opener, placeholder, selected): MenuitemOptions {
  return {
    tag: 'menuitem',
    label: opener.label,
    isHidden: async (elem, ev) => !(await selected()),
    commandListener: async (ev) => {
      const target = ev.target as HTMLSelectElement
      let args: string[] = unshell(opener.cmdline)
      const cmd = args.shift()
      const attachment = await selected()
      exec(cmd, args.map((arg: string) => arg.replace(placeholder, attachment.getFilePath() as string)))
    },
  }
}
export class ZoteroAltOpenPDF {
  shutdown() {
    log('shutdown')
    removeElements()
    Menu.unregisterAll()
  }

  public async startup() {
    log('startup')
    await this.onMainWindowLoad()
    log('started')
  }

  public async onMainWindowLoad() {
    const openers: { pdf: MenuitemOptions[]; snapshot: MenuitemOptions[] } = {
      pdf: (Zotero.Prefs.rootBranch.getChildList(Openers.pdf) as string[])
        .map(pref => getOpener(pref))
        .filter(opener => opener.label && opener.cmdline)
        .map(opener => openerMenuItem(opener, /@pdf/ig, selectedPDF)),
      snapshot: (Zotero.Prefs.rootBranch.getChildList(Openers.snapshot) as string[])
        .map(pref => getOpener(pref))
        .filter(opener => opener.label && opener.cmdline)
        .map(opener => openerMenuItem(opener, /@snapshot/ig, selectedSnapshot)),
    }

    Menu.register('item', {
      tag: 'menu',
      label: 'Open PDF',
      icon: require('./pdf.png'),
      isHidden: async (elem, ev) => !(await selectedPDF()),
      children: [
        {
          tag: 'menuitem',
          label: Zotero.getString('locate.internalViewer.label') as string,
          isHidden: (elem, ev) => !Zotero.Prefs.get('fileHandler.pdf'),
          commandListener: async () => Zotero.Reader.open((await selectedPDF())!.id, undefined, { openInWindow: false }),
        },
        {
          tag: 'menuitem',
          label: Zotero.getString('locate.externalViewer.label') as string,
          isHidden: (elem, ev) => Zotero.Prefs.get('fileHandler.pdf') !== 'system',
          commandListener: async () => Zotero.launchFile((await selectedPDF())!.getFilePath() as string),
        },
        ...openers.pdf,
      ],
    })

    Menu.register('item', {
      tag: 'menu',
      label: 'Open Snapshot',
      isHidden: async (elem, ev) => !(await selectedSnapshot()),
      children: [
        {
          tag: 'menuitem',
          label: Zotero.getString('locate.internalViewer.label') as string,
          commandListener: async () => Zotero.Reader.open((await selectedSnapshot())!.id, undefined, { openInWindow: false }),
        },
        {
          tag: 'menuitem',
          label: Zotero.getString('locate.externalViewer.label') as string,
          commandListener: async () => Zotero.launchFile((await selectedSnapshot())!.getFilePath() as string),
        },
        ...openers.snapshot,
      ],
    })
  }

  public async onMainWindowUnLoad() {
    Menu.unregisterAll()
  }
}
Zotero.AltOpenPDF = Zotero.AltOpenPDF || new ZoteroAltOpenPDF()
