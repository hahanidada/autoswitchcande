// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { execFile } from 'node:child_process';
import { MarkdownSceneRecognition } from './File_matching_rules/MarkdownSceneRecognition';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('恭喜，插件已经激活了！！！！');

    //实现 Python 场景识别-----先完成“代码／注释／字符串”三类
    function pythonSceneRecognition(position: vscode.Position, currentLine: string) {
        const line = currentLine;
        // VS Code 的 character 从 0 开始，表示光标所在的插入位置。
        const cursor = Math.max(0, Math.min(position.character, line.length));

        function handleImeError(error: unknown) {
            console.error('输入法切换失败：', error);
        }

        // 只取紧邻的左右各一个 Unicode 字符，兼容占两个 UTF-16 单元的汉字。
        const leftStart = cursor > 1
            && /[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(line.slice(cursor - 2, cursor))
            ? cursor - 2 : Math.max(0, cursor - 1);
        const left = line.slice(leftStart, cursor);
        const rightCodePoint = line.codePointAt(cursor);
        const right = rightCodePoint === undefined ? '' : String.fromCodePoint(rightCodePoint);

        // 邻接汉字优先：无需继续判断语法场景。
        if (/\p{Script=Han}/u.test(left + right)) {
            void requestIme('zh').catch(handleImeError);
            return 'zh';
        }

        let delimiter: string | null = null;
        let index = 0;

        // 只扫描光标左侧；字符串外遇到 # 即可确定为注释。
        while (index < cursor) {
            const character = line[index];

            if (delimiter === null) {
                if (character === '#') {
                    void requestIme('zh').catch(handleImeError);
                    return 'zh';
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

            // 跳过转义字符，避免把转义引号误判为字符串结束。
            if (character === '\\') {
                index += 2;
                continue;
            }

            if (line.startsWith(delimiter, index)) {
                const end = index + delimiter.length;
                if (end <= cursor) {
                    delimiter = null;
                }
                index = end;
                continue;
            }

            index++;
        }

        // 扫描到光标后仍未闭合，才能确定光标位于字符串内。
        if (delimiter !== null) {
            void requestIme('zh').catch(handleImeError);
            return 'zh';
        }

        void requestIme('en').catch(handleImeError);
        return 'en';
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
        // 只处理当前项目支持的两种语言
        if (!['python', 'markdown'].includes(document.languageId)) {
            vscode.window.showWarningMessage('当前只支持python和markdown文件，请重新切换文件使用本插件');
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
            pythonSceneRecognition(position, currentLine);
        } else if (document.languageId === 'markdown') {
            MarkdownSceneRecognition(position, document, requestIme);
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
