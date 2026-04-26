Open PDF
=================

[English](README.md) | 简体中文

通过下载[最新版本](https://github.com/retorquere/zotero-open-pdf/releases/latest)安装。兼容 Zotero 6 和 7。

Zotero 自己可以设置 PDF 的默认打开方式：

* 用系统 PDF 阅读器打开
* 用 Zotero 内置 PDF 阅读器打开

这个插件主要补了两件事：

* 在条目右键菜单里增加一个“反向打开”的入口。比如你平时默认用 Zotero 内置阅读器打开，这里就能直接改用系统阅读器打开；反过来也一样
* 允许你把自己常用的 PDF 阅读器或编辑器加进菜单

菜单语言默认跟随 Zotero 当前界面语言。如果想手动覆盖，可以在配置编辑器里新增字符串项：

`extensions.zotero.alt-open.locale` = `en` 或 `zh`

如果要加自定义打开方式，进入 Zotero 设置里的“高级”，打开配置编辑器。然后新建一个字符串项，键名要以 `extensions.zotero.alt-open.{pdf|snapshot|epub}.with.` 开头，后面名字可以自己定，比如 `extensions.zotero.alt-open.pdf.with.skim`。值里填写启动程序需要的命令行，并在文件路径位置写 `@pdf`。例如：

`extensions.zotero.alt-open.pdf.with.preview` = `/usr/bin/open -a Preview @pdf`

这样菜单里就会多出一个对应的打开项。如果想自定义菜单文字，可以把显示名称写在前面的方括号里：

`extensions.zotero.alt-open.pdf.with.skim` = `[Open with Skim]/usr/bin/open -a Skim @pdf`

如果可执行文件路径里有空格，需要用引号包起来。比如在 Windows 上用 Edge 打开 PDF：

`extensions.zotero.alt-open.pdf.with.edge` = `"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" @pdf`

复杂一点的例子是通过 Chrome 扩展打开 PDF，比如 Acrobat 扩展：

`extensions.zotero.alt-open.pdf.with.chrome-acrobat` = `"C:\Program Files\Google\Chrome\Application\chrome.exe" "chrome-extension://efaidnbmnnnibpcajpcglclefindmkaj/file:///@pdf"`

这里的 `efaidnbmnnnibpcajpcglclefindmkaj` 是 Acrobat 扩展的 ID。要让扩展能读取 `file:///` 协议，需要在“管理扩展程序”页面打开“允许访问文件网址”。

**新增菜单项后，需要重启插件才会生效。**

有些程序（例如 sioyek）可能会表现得更像命令行程序，启动后会变成 Zotero 的子进程，而不是独立进程，结果就是行为不符合预期。

在 Windows 上，可以用 `start` 命令把它作为独立进程启动。

`extensions.zotero.alt-open.pdf.with.sioyek` = `"C:\Windows\System32\cmd.exe" /c start "" "C:\Users\user\scoop\apps\sioyek\2.0.0\sioyek.exe" --new-window @pdf`

**注意：**

**插件不会去系统 PATH 里查找程序，你需要填写完整的可执行文件路径。路径里如果有空格或反斜杠 `\`，要用英文双引号包起来。**


# 警告

在 Zotero 外部修改 PDF（例如删除、移动、旋转页面），可能会让 Zotero 里的批注和 PDF 内容出现不一致。

如果只是旋转或删除单页，可以直接在 Zotero PDF 阅读器侧边栏的缩略图页签里操作，这样是安全的。相关说明可以看 Zotero 的支持文档：[using an external PDF reader](https://www.zotero.org/support/kb/annotations_in_database)（使用外部 PDF 阅读器）。

# 支持说明，请先看

作者能投入的时间很有限，所以只处理最新版相关的问题和支持请求。

如果你要提交问题，请把自己当前使用的版本号一并写上。等作者看到问题时，最新版本可能已经更新了，你可能需要先升级，再确认问题是否还存在。
