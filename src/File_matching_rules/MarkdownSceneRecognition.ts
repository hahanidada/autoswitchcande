import type { Position, TextDocument } from 'vscode';

/** 只判断当前行：双引号或反引号内部切英文，其他位置切中文。 */
export function MarkdownSceneRecognition(
    position: Position,
    document: TextDocument,
    requestIme: (mode: 'zh' | 'en') => Promise<unknown>
): 'zh' | 'en' {
    const line = document.lineAt(position.line).text;
    const cursor = Math.max(0, Math.min(position.character, line.length));
    let delimiter: '"' | '`' | null = null;

    // 只扫描光标左侧；遇到开始符号进入英文区域，相同符号再次出现则退出。
    for (let index = 0; index < cursor; index++) {
        const character = line[index];
        if (delimiter === null) {
            if (character === '"' || character === '`') {
                delimiter = character;
            }
        } else if (character === delimiter) {
            delimiter = null;
        }
    }

    // 光标前仍未闭合时使用英文，发起切换后直接返回目标模式。
    const mode = delimiter === null ? 'zh' : 'en';
    void requestIme(mode).catch((error: unknown) => {
        console.error('输入法切换失败：', error);
    });
    return mode;
}
