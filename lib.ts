/* eslint-disable no-var, prefer-arrow/prefer-arrow-functions, @typescript-eslint/require-await */

// declare const dump: (msg: string) => void

import { MenuManager, MenuitemOptions } from 'zotero-plugin-toolkit'
const Menu = new MenuManager()

import { DebugLog } from 'zotero-plugin/debug-log'
DebugLog.register('Open PDF', ['extensions.zotero.open-pdf.'])

import unshell from 'shell-quote/parse'

function log(msg) {
  if (typeof msg !== 'string') msg = JSON.stringify(msg)
  Zotero.debug(`AltOpen PDF: ${msg}`)
}

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

log('AltOpen PDF: lib loading')

type Opener = { label: string; cmdline: string }
function getOpener(opener: string): Opener {
  if (!opener) return { label: '', cmdline: '' }
  const cmdline = Zotero.Prefs.get(opener, true) as string
  if (!cmdline) return { label: '', cmdline: '' }
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

function openerMenuItem(opener: Opener): MenuitemOptions {
  return {
    tag: 'menuitem',
    label: opener.label,
    isHidden: async (elem, ev) => !(await selectedPDF()),
    commandListener: async (ev) => {
      const target = ev.target as HTMLSelectElement
      let args: string[] = unshell(opener.cmdline)
      const cmd = args.shift()
      const pdf = await selectedPDF()
      exec(cmd, args.map((arg: string) => arg.replace(/@pdf/i, pdf.getFilePath() as string)))
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
    const openers: MenuitemOptions[] = (Zotero.Prefs.rootBranch.getChildList(Openers) as string[])
      .map(cmdline => getOpener(cmdline))
      .filter(opener => opener.label && opener.cmdline)
      .map(opener => openerMenuItem(opener))

    Menu.register('item', {
      tag: 'menu',
      label: 'Open PDF',
      icon: require('./pdf.png'),
      children: [
        {
          tag: 'menuitem',
          label: Zotero.getString('locate.internalViewer.label') as string,
          isHidden: async (elem, ev) => (!Zotero.Prefs.get('fileHandler.pdf') || !(await selectedPDF())),
          commandListener: async () => Zotero.Reader.open((await selectedPDF())!.id, undefined, { openInWindow: false }),
        },
        {
          tag: 'menuitem',
          label: Zotero.getString('locate.externalViewer.label') as string,
          isHidden: async (elem, ev) => ((Zotero.Prefs.get('fileHandler.pdf') !== 'system') || !(await selectedPDF())),
          commandListener: async () => Zotero.launchFile((await selectedPDF())!.getFilePath() as string),
        },
        ...openers,
      ],
    })
  }

  public async onMainWindowUnLoad() {
    Menu.unregisterAll()
  }
}
Zotero.AltOpenPDF = Zotero.AltOpenPDF || new ZoteroAltOpenPDF()
