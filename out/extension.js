"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __importStar(require("vscode"));
const node_child_process_1 = require("node:child_process");
const MarkdownSceneRecognition_1 = require("./File_matching_rules/MarkdownSceneRecognition");
const CSceneRecognition_1 = require("./File_matching_rules/CSceneRecognition");
const PythonSceneRecognition_1 = require("./File_matching_rules/PythonSceneRecognition");
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('恭喜，插件已经激活了！！！！');
    // 调用c#脚本获取系统现在输入法，以及切换中英文输入法
    const imeToolPath = context.asAbsolutePath('native/ImeMode.exe');
    function requestIme(action) {
        return new Promise((resolve, reject) => {
            (0, node_child_process_1.execFile)(imeToolPath, [action], {
                windowsHide: true,
                timeout: 3000,
                encoding: 'utf8'
            }, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(stderr.trim() || error.message));
                    return;
                }
                resolve(stdout.trim());
            });
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
            (0, PythonSceneRecognition_1.pythonSceneRecognition)(position, currentLine, requestIme);
        }
        else if (document.languageId === 'markdown') {
            (0, MarkdownSceneRecognition_1.MarkdownSceneRecognition)(position, document, requestIme);
        }
        else if (document.languageId === 'c') {
            (0, CSceneRecognition_1.CSceneRecognition)(position, currentLine, requestIme);
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
        void requestIme('zh').catch((error) => {
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
function deactivate() {
    console.log("插件已经关闭激活了");
}
//# sourceMappingURL=extension.js.map