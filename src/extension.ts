// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { execFile } from 'node:child_process';
import { MarkdownSceneRecognition } from './File_matching_rules/MarkdownSceneRecognition';
import { CSceneRecognition } from './File_matching_rules/CSceneRecognition';
import { pythonSceneRecognition } from './File_matching_rules/PythonSceneRecognition'
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('恭喜，插件已经激活了！！！！');


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

    //创建一个状态栏Bar，参数数字0表示优先级
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 500);
    // 当前是否允许自动处理
    let enabled = true;
    statusBar.name = '中英文自动切换';
    //将命令绑定到这个Bar上
    statusBar.command = 'autoswitchcande.toggleEnabled';
    // 根据当前状态刷新文字和悬停提示
    function updateStatusBar() {
        statusBar.text = enabled
            ? '$(autoswitchcande-enabled)'
            : '$(autoswitchcande-disabled)';
        statusBar.tooltip = enabled
            ? '点击暂停'
            : '点击恢复';
        statusBar.accessibilityInformation = {
            label: enabled ? '自动切换：已启用' : '自动切换：已暂停',
            role: 'button'
        };
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
        // 只处理当前项目支持的语言
        if (!['python', 'markdown', 'c'].includes(document.languageId)) {
            vscode.window.showWarningMessage('当前只支持python、markdown和c文件，请重新切换文件使用本插件');
            return;
        }
        const position = event.selections[0]?.active;
        // 先确认位置存在，再读取当前行。
        if (!position) {
            return;
        }
        console.log("position 的类型是：", typeof (position));
        const currentLine = document.lineAt(position.line).text;
        console.log("currentLine 的类型是：", typeof (currentLine));
        console.log('当前行内容：', currentLine);
        console.log(`语言：${document.languageId}，` +
            `行：${position.line + 1}，` +
            `列：${position.character + 1}`);

        if (document.languageId === 'python') {
            pythonSceneRecognition(position, currentLine, requestIme);
        } else if (document.languageId === 'markdown') {
            MarkdownSceneRecognition(position, document, requestIme);
        } else if (document.languageId === 'c') {
            CSceneRecognition(position, currentLine, requestIme);
        }
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
        void requestIme('zh').catch((error: unknown) => {
            console.error('输入法切换失败：', error);
        });
    });
    // 插件激活就显示StatusBar
    updateStatusBar();
    statusBar.show();

    //注册方法
    context.subscriptions.push(disposable);
    context.subscriptions.push(selectionListener);
    context.subscriptions.push(statusBar);
    context.subscriptions.push(toggleCommand);
    context.subscriptions.push(testC_Script);
}
// This method is called when your extension is deactivated
export function deactivate() {
    console.log("插件已经关闭激活了");
}
