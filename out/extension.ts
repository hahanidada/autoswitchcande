// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { execFile } from 'node:child_process';
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "autoswitchcande" is now active!');

    //实现 Python 场景识别-----先完成“代码／注释／字符串”三类
    function pythonSceneRecognition(position:object, currentLine:String) {
        const line = String(currentLine);
        // VS Code 的 character 从 0 开始，表示光标所在的插入位置。
        const point = position as vscode.Position;
        const cursor = Math.max(0, Math.min(point.character, line.length));
        let scene: '代码' | '注释' | '字符串' = '代码';
        let delimiter: string | null = null;
        let index = 0;

        // 只扫描光标左侧；不读取其他行，也不读取编辑器全局状态。
        while (index < cursor) {
            const character = line[index];

            if (delimiter === null) {
                // 只有字符串外的 # 才开启注释，后续引号不再影响分类。
                if (character === '#') {
                    scene = '注释';
                    break;
                }
                if (character === '"' || character === "'") {
                    const triple = character.repeat(3);
                    delimiter = line.startsWith(triple, index) ? triple : character;
                    index += delimiter.length;
                } else {
                    index++;
                }
                continue;
            }

            // 跳过转义字符；连续反斜杠按两字符一组处理。
            if (character === '\\') { 
                index += 2;
                continue;
            }

            if (line.startsWith(delimiter, index)) {
                const end = index + delimiter.length;
                // 光标越过整个结束引号后才恢复代码场景。
                if (end <= cursor) {
                    delimiter = null;
                }
                index = end;
                continue;
            }

            index++;
        }

        if (scene !== '注释') {
            scene = delimiter === null ? '代码' : '字符串';
        }

        // 代码切英文，注释和字符串切中文；失败时记录错误。
        const mode = scene === '代码' ? 'en' : 'zh';
        void requestIme(mode).catch((error: unknown) => {
            console.error('输入法切换失败：', error);
        });

        return scene;
    }
    // 调用c#脚本获取系统现在输入法，以及切换中英文输入法
    const imeToolPath = context.asAbsolutePath('native/ImeMode.exe');

    function requestIme(action: 'get' | 'zh' | 'en'): Promise<string> {
        return new Promise((resolve, reject) => {
            execFile(
                imeToolPath,
                [action],
                {
                    windowsHide: true,
                    timeout: 3000,
                    encoding: 'utf8'
                },
                (error, stdout, stderr) => {
                    if (error) {
                        reject(new Error(stderr.trim() || error.message));
                        return;
                    }

                    resolve(stdout.trim());
                }
            );
        });
    }
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 0);
    // 当前是否允许自动处理
    let enabled = true;
    statusBar.name = '中英文自动切换';
    //将命令绑定到这个Bar上
    statusBar.command = 'autoswitchcande.toggleEnabled';
    // 根据当前状态刷新文字和悬停提示
    function updateStatusBar() {
        statusBar.text = enabled
            ? '自动输入：已启用'
            : '自动输入：已暂停';
        statusBar.tooltip = enabled
            ? '点击暂停自动切换'
            : '点击恢复自动切换';
    }
    //注册点击和启用命令
    const toggleCommand = vscode.commands.registerCommand('autoswitchcande.toggleEnabled', () => {
        enabled = !enabled;
        updateStatusBar();
        console.log(enabled ? '自动处理已恢复' : '自动处理已暂停');
    });
    //监听光标在文件中的位置和行内容（自动切换启用时）
    const selectionListener = vscode.window.onDidChangeTextEditorSelection((event) => {
        //若为暂停模式不可用
        if (!enabled) {
            return;
        }
        const document = event.textEditor.document;
        // 只处理当前项目支持的两种语言
        if (!['python', 'markdown'].includes(document.languageId)) {
            vscode.window.showWarningMessage('当前只支持python和markdown文件，请重新切换文件使用本插件');
            return;
        }
        const position = event.selections[0]?.active;
        console.log("position 的类型是：", typeof (position));
        const currentLine = document.lineAt(position.line).text;
        console.log("currentLine 的类型是：", typeof (currentLine));
        console.log('当前行内容：', currentLine);
        //当位置存在时，再读取行号
        if (!position) {
            return;
        }
        console.log(`语言：${document.languageId}，` +
            `行：${position.line + 1}，` +
            `列：${position.character + 1}`);

        pythonSceneRecognition(position, currentLine)
    });
    const disposable = vscode.commands.registerCommand('autoswitchcande.helloWorld', () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        vscode.window.showInformationMessage('Hello World from autoSwitchCandE!');
        let tset = 0;
        console.log("hello");
    });
    // c# 脚本是否生效
    const testC_Script = vscode.commands.registerCommand('autoswitchcande.testCScript', () => {
        requestIme('zh');
    });
    updateStatusBar();
    statusBar.show();
    context.subscriptions.push(disposable);
    context.subscriptions.push(selectionListener);
    context.subscriptions.push(statusBar);
    context.subscriptions.push(toggleCommand);
    context.subscriptions.push(testC_Script);
}
// This method is called when your extension is deactivated
function deactivate() {
    console.log("插件已经关闭激活了");
}
