import * as assert from 'node:assert/strict';
import type { Position, TextDocument } from 'vscode';
import { MarkdownSceneRecognition } from '../File_matching_rules/MarkdownSceneRecognition';

// 用 | 标记光标，使用轻量文档替身，不调用系统输入法。
function recognize(source: string): 'zh' | 'en' {
    const offset = source.indexOf('|');
    assert.ok(offset >= 0, '测试用例需要光标标记');
    const prefix = source.slice(0, offset).split('\n');
    const lines = source.replace('|', '').split('\n');
    const document = {
        lineAt: (line: number) => ({ text: lines[line] })
    } as TextDocument;
    const position = {
        line: prefix.length - 1,
        character: prefix[prefix.length - 1].length
    } as Position;
    const calls: string[] = [];
    const result = MarkdownSceneRecognition(position, document, (mode) => {
        calls.push(mode);
        return Promise.resolve();
    });
    assert.deepEqual(calls, [result], '每次识别应恰好请求一次目标模式');
    return result;
}

suite('Markdown 场景识别', () => {
    const cases: [string, string, 'zh' | 'en'][] = [
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
        ['双反引号内的单反引号', '``a ` b|``', 'en'],
        ['不同长度不闭合', '``a`|', 'en'],
        ['相同长度闭合', '``a ` b``|', 'zh'],
        ['光标在开始标记内部', '`|`code``', 'zh'],
        ['光标在结束标记内部', '``code`|`', 'en'],
        ['正文反斜杠转义反引号', '\\`正文|', 'zh'],
        ['双反斜杠后仍可开始代码', '\\\\`code|', 'en'],
        ['代码内反斜杠不转义反引号', '`code\\`|', 'zh'],
        ['围栏开始前', '|```python', 'zh'],
        ['围栏开始标记内部', '``|`python', 'zh'],
        ['围栏语言说明', '```py|thon', 'en'],
        ['代码块内容', '```python\nprint(|1)\n```', 'en'],
        ['代码块空行', '```\n|\n```', 'en'],
        ['代码块中的汉字', '```\n# 中|文\n```', 'en'],
        ['围栏结束标记之前', '```\ncode\n|```', 'en'],
        ['围栏结束标记内部', '```\ncode\n``|`', 'en'],
        ['围栏结束标记之后', '```\ncode\n```|', 'zh'],
        ['代码块后的正文', '```\ncode\n```\n正文|', 'zh'],
        ['未闭合代码块', '```\ncode\n|', 'en'],
        ['波浪号围栏', '~~~js\nconst a = |1;\n~~~', 'en'],
        ['围栏类型必须相同', '~~~\n```\n|', 'en'],
        ['过短围栏不能关闭', '````\n```\n|', 'en'],
        ['更长围栏可以关闭', '```\n`````\n|', 'zh'],
        ['结束围栏后允许空白', '```\n``` \t\n|', 'zh'],
        ['结束围栏后不能有正文', '```\n``` text\n|', 'en'],
        ['三个空格缩进的围栏', '   ```js\n|', 'en'],
        ['四个空格不作为围栏', '    ```js\n|', 'zh'],
        ['正文中间不作为围栏', '文字 ```js\n|', 'zh'],
        ['反引号说明中不能有反引号', '```foo`bar\n|', 'zh'],
        ['波浪号说明中可以有反引号', '~~~foo`bar\n|', 'en'],
        ['多个代码块之间的正文', '```\na\n```\n正文|\n~~~\nb\n~~~', 'zh'],
        ['第二个代码块', '```\na\n```\n~~~\nb|\n~~~', 'en']
    ];

    for (const [name, source, expected] of cases) {
        test(name, () => {
            assert.equal(recognize(source), expected);
        });
    }

    test('输入法请求失败时记录错误', async () => {
        const error = new Error('模拟失败');
        const messages: unknown[][] = [];
        const originalError = console.error;
        console.error = (...args: unknown[]) => { messages.push(args); };
        try {
            MarkdownSceneRecognition(
                { line: 0, character: 0 } as Position,
                { lineAt: () => ({ text: '' }) } as unknown as TextDocument,
                () => Promise.reject(error)
            );
            await Promise.resolve();
            assert.deepEqual(messages, [['输入法切换失败：', error]]);
        } finally {
            console.error = originalError;
        }
    });
});
