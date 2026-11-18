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
const assert = __importStar(require("node:assert/strict"));
const MarkdownSceneRecognition_1 = require("../File_matching_rules/MarkdownSceneRecognition");
// 用 | 标记光标，使用轻量文档替身，不调用系统输入法。
function recognize(source) {
    const offset = source.indexOf('|');
    assert.ok(offset >= 0, '测试用例需要光标标记');
    const prefix = source.slice(0, offset).split('\n');
    const lines = source.replace('|', '').split('\n');
    const document = {
        lineAt: (line) => ({ text: lines[line] })
    };
    const position = {
        line: prefix.length - 1,
        character: prefix[prefix.length - 1].length
    };
    const calls = [];
    const result = (0, MarkdownSceneRecognition_1.MarkdownSceneRecognition)(position, document, (mode) => {
        calls.push(mode);
        return Promise.resolve();
    });
    assert.deepEqual(calls, [result], '每次识别应恰好请求一次目标模式');
    return result;
}
suite('Markdown 场景识别', () => {
    const cases = [
        ['空文档', '|', 'zh'],
        ['正文和标题', '# Hello |世界', 'zh'],
        ['链接文字', '[说明|](https://example.com)', 'zh'],
        ['行内开始标记之前', '正文 |`code`', 'zh'],
        ['行内开始标记之后', '正文 `|code`', 'en'],
        ['代码内汉字仍为英文', '`中|文`', 'en'],
        ['行内结束标记之前', '`code|`', 'en'],
        ['行内结束标记之后', '`code`| 正文', 'zh'],
        ['未闭合行内代码', '正文 `code|', 'en'],
        ['行内代码不延续到下一行', '`code\n正文|', 'zh'],
        ['多个行内片段', '`a` 正文 `b|`', 'en'],
        ['双引号之前', '正文 |"text"', 'zh'],
        ['双引号内部', '正文 "te|xt"', 'en'],
        ['空双引号内部', '"|"', 'en'],
        ['结束双引号之后', '"text"| 正文', 'zh'],
        ['未闭合双引号', '"text|', 'en'],
        ['多个双引号片段', '"a" 正文 "b|"', 'en'],
        ['双引号中的反引号不改变区域', '"a ` b|"', 'en'],
        ['反引号中的双引号不改变区域', '`a " b|`', 'en'],
        ['不同区域之间恢复正文', '"a" 正文| `b`', 'zh'],
        ['单引号不触发英文', "'正文|'", 'zh'],
        ['双引号不延续到下一行', '"text\n正文|', 'zh'],
        ['不再识别多行代码块', '```python\nprint(|1)\n```', 'zh'],
        ['不再识别波浪号围栏', '~~~js\nconst a = |1;\n~~~', 'zh']
    ];
    for (const [name, source, expected] of cases) {
        test(name, () => {
            assert.equal(recognize(source), expected);
        });
    }
    test('输入法请求失败时记录错误', async () => {
        const error = new Error('模拟失败');
        const messages = [];
        const originalError = console.error;
        console.error = (...args) => { messages.push(args); };
        try {
            (0, MarkdownSceneRecognition_1.MarkdownSceneRecognition)({ line: 0, character: 0 }, { lineAt: () => ({ text: '' }) }, () => Promise.reject(error));
            await Promise.resolve();
            assert.deepEqual(messages, [['输入法切换失败：', error]]);
        }
        finally {
            console.error = originalError;
        }
    });
});
//# sourceMappingURL=MarkdownSceneRecognition.test.js.map