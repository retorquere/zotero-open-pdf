/* eslint-disable no-var, prefer-arrow/prefer-arrow-functions, @typescript-eslint/require-await */

// declare const dump: (msg: string) => void

import { DebugLog } from 'zotero-plugin/debug-log'
import { jwk as pubkey } from './public'
DebugLog.register('Open PDF', ['alt-open.', 'fileHandler.'], pubkey)

type ItemMenu = _ZoteroTypes.MenuManager.MenuData<_ZoteroTypes.MenuManager.LibraryMenuContext>

import unshell from 'shell-quote/parse'

import { log } from './lib/log'

log('lib loading')

const pluginID = 'zotero-open-pdf@iris-advies.com'

const Kinds = ['PDF', 'Snapshot', 'ePub']
const KindLabels = {
  en: {
    pdf: 'PDF',
    snapshot: 'Snapshot',
    epub: 'ePub',
  },
  zh: {
    pdf: 'PDF',
    snapshot: '快照',
    epub: 'ePub',
  },
} as const

const Messages = {
  en: {
    headline: 'Open PDF',
    openFailed: 'Opening failed',
    openMenu: 'Open {kind}',
    openWith: 'Open with {name}',
    notFound: '{path} not found',
    notRunnable: '{path} is not runnable',
  },
  zh: {
    headline: '打开附件',
    openFailed: '打开失败',
    openMenu: '打开 {kind}',
    openWith: '使用 {name} 打开',
    notFound: '未找到 {path}',
    notRunnable: '{path} 无法运行',
  },
} as const

type Locale = keyof typeof Messages

function normalizeLocale(locale: string): Locale | null {
  const normalized = locale.trim().toLowerCase()
  if (!normalized) return null
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en'
  if (normalized === 'zh' || normalized.startsWith('zh-')) return 'zh'
  return null
}

function locale(): Locale {
  const override = normalizeLocale(`${Zotero.Prefs.get('extensions.zotero.alt-open.locale', true) || ''}`)
  if (override) return override

  for (const source of [
    `${Zotero.locale || ''}`,
    `${Services?.locale?.requestedLocale || ''}`,
    `${Services?.locale?.appLocaleAsBCP47 || ''}`,
    `${Services?.locale?.lastFallbackLocale || ''}`,
  ]) {
    const detected = normalizeLocale(source)
    if (detected) return detected
  }

  return 'en'
}

function t(key: keyof typeof Messages.en, vars: Record<string, string> = {}): string {
  let text: string = Messages[locale()][key]
  for (const [name, value] of Object.entries(vars)) {
    text = text.replace(`{${name}}`, value)
  }
  return text
}

function kindLabel(kind: string): string {
  return KindLabels[locale()][kind] || kind
}

type Opener = { label: string; cmdline: string }
function getOpener(opener: string): Opener {
  if (!opener) return { label: '', cmdline: '' }
  const cmdline = Zotero.Prefs.get(opener, true) as string
  if (!cmdline) return { label: '', cmdline: '' }
  const m = cmdline.match(/^\[(.+?)\](.+)/)
  if (m) return { label: m[1], cmdline: m[2] }
  return {
    label: t('openWith', { name: opener.replace(/^extensions\.zotero\.alt-open\.[a-z]+\.with\./, '') }),
    cmdline,
  }
}

function exec(exe: string, args: string[] = []): void {
  log(`running ${JSON.stringify([exe].concat(args))}`)

  const cmd = Zotero.File.pathToFile(exe)
  if (!cmd.exists()) {
    flash(t('openFailed'), t('notFound', { path: exe }))
    return
  }
  if (!cmd.isExecutable()) {
    flash(t('openFailed'), t('notRunnable', { path: exe }))
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
    pw.changeHeadline(t('headline'))
    pw.addDescription(body ? `${title}\n${body}` : title)
    pw.show()
    pw.startCloseTimer(timeout * 1000)
  }
  catch (err) {
    const msg = `${err}`
    log(`flash: ${JSON.stringify({ title, body, err: msg })}`)
  }
}

async function selectedAttachment(kind: string) {
  const items = Zotero.getActiveZoteroPane().getSelectedItems()
  if (items.length !== 1) return null
  const attachment = items[0].isAttachment() ? items[0] : await items[0].getBestAttachment()
  if (!attachment) return null
  if (!attachment.getFilePath()) return null
  switch (kind) {
    case 'pdf':
      if (!attachment.isPDFAttachment()) return null
      break
    case 'snapshot':
      if (!attachment.isSnapshotAttachment()) return null
      break
    case 'epub':
      if (!attachment.isEPUBAttachment()) return null
      break
    default:
      return null
  }
  return attachment
}

export class ZoteroAltOpenPDF {
  shutdown() {
    log('shutdown done')
  }

  public async startup() {
    for (const kind of Kinds.map(k => k.toLowerCase())) {
      const prefix = `extensions.zotero.open-${kind}.with.`
      for (const old of Zotero.Prefs.rootBranch.getChildList(prefix) as string[]) {
        const migrated = old.replace(prefix, `alt-open.${kind}.with.`)
        Zotero.Prefs.set(old.replace(prefix, `alt-open.${kind}.with.`), Zotero.Prefs.get(old, true) as string)
        Zotero.Prefs.clear(old, true)
      }
    }

    log('startup')
    await this.onMainWindowLoad({ window: Zotero.getMainWindow() })
    log('startup done')
  }

  public async onMainWindowLoad({ window }) {
    log('onMainWindowLoad')

    for (const Kind of Kinds) {
      const kind = Kind.toLowerCase()
      if (window.document.getElementById(`alt-open-${kind}-internal`)) continue

      // filehandler: '' == internal, 'system' = system, other = custom
      const system: ItemMenu[] = [
        {
          menuType: 'menuitem',
          onShowing: async (_event, context) => {
            context.menuElem.setAttribute('label', Zotero.getString('locate.internalViewer.label') as string)
            // : internal is not the default
            context.setVisible(!!Zotero.Prefs.get(`fileHandler.${kind}`) && !!(await selectedAttachment(kind)))
          },
          onCommand: async (_event, _context) => {
            Zotero.Reader.open((await selectedAttachment(kind))!.id, undefined, { openInWindow: false })
          },
        },
        {
          menuType: 'menuitem',
          onShowing: async (_event, context) => {
            context.menuElem.setAttribute('label', Zotero.getString('locate.externalViewer.label') as string)
            // system is not the default
            context.setVisible(Zotero.Prefs.get(`fileHandler.${kind}`) !== 'system' && !!(await selectedAttachment(kind)))
          },
          onCommand: async (_event, _context) => {
            Zotero.launchFile((await selectedAttachment(kind))!.getFilePath() as string)
          },
        },
      ]

      const placeholder = new RegExp(`@${kind}`, 'i')
      const custom: ItemMenu[] = (Zotero.Prefs.rootBranch.getChildList(`extensions.zotero.alt-open.${kind}.with.`) as string[])
        .map(cmdline => getOpener(cmdline))
        .filter(opener => opener.label && opener.cmdline)
        .map(opener => ({
          menuType: 'menuitem',
          onShowing: async (_event, context) => {
            context.menuElem.setAttribute('label', opener.label)
            context.setVisible(!!(await selectedAttachment(kind)))
          },
          onCommand: async (_event, _context) => {
            let args: string[] = unshell(opener.cmdline)
            const cmd = args.shift()
            const pdf = await selectedAttachment(kind)
            if (cmd && pdf) exec(cmd, args.map((arg: string) => arg.replace(placeholder, pdf.getFilePath() as string)))
          },
        }))

      if (custom.length) {
        Zotero.MenuManager.registerMenu({
          menuID: `${pluginID}-menu-item`,
          pluginID,
          target: 'main/library/item',
          menus: [{
            menuType: 'submenu',
            onShowing: async (_event, context) => {
              context.menuElem.setAttribute('label', t('openMenu', { kind: kindLabel(kind) }))
              context.setVisible(!!(await selectedAttachment(kind)))
            },
            menus: [...system, ...custom],
          }],
        })
      }
      else {
        Zotero.MenuManager.registerMenu({
          menuID: `${pluginID}-menu-item`,
          pluginID,
          target: 'main/library/item',
          menus: system,
        })
      }
    }
    log('onMainWindowLoad done')
  }

  public async onMainWindowUnLoad() {
    log('onMainWindowUnload done')
  }
}
Zotero.AltOpenPDF = Zotero.AltOpenPDF || new ZoteroAltOpenPDF()
log('lib loaded')
