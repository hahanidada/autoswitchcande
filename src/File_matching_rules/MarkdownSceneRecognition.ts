import type { Position, TextDocument } from 'vscode';

type ImeMode = 'zh' | 'en';

interface Fence {
    marker: string;
    length: number;
    end: number;
    tail: string;
}

function readFence(line: string): Fence | undefined {
    const match = /^( {0,3})(`{3,}|~{3,})(.*)$/.exec(line);
    if (!match) {
        return undefined;
    }
    return {
        marker: match[2][0],
        length: match[2].length,
        end: match[1].length + match[2].length,
        tail: match[3]
    };
}

function canOpenFence(fence: Fence): boolean {
    return fence.marker !== '`' || !fence.tail.includes('`');
}

function canCloseFence(open: Fence, candidate: Fence): boolean {
    return candidate.marker === open.marker
        && candidate.length >= open.length
        && /^[ \t]*$/.test(candidate.tail);
}

/** 正文切中文，围栏代码块和单行行内代码切英文；返回本次请求的模式。 */
export function MarkdownSceneRecognition(
    position: Position,
    document: TextDocument,
    requestIme: (mode: ImeMode) => Promise<unknown>
): ImeMode {
    function switchIme(mode: ImeMode): ImeMode {
        void requestIme(mode).catch((error: unknown) => {
            console.error('输入法切换失败：', error);
        });
        return mode;
    }

    let openFence: Fence | undefined;
    // 围栏状态取决于前面的行，不能仅根据当前行判断。
    for (let lineNumber = 0; lineNumber < position.line; lineNumber++) {
        const fence = readFence(document.lineAt(lineNumber).text);
        if (!fence) {
            continue;
        }
        if (openFence) {
            if (canCloseFence(openFence, fence)) {
                openFence = undefined;
            }
        } else if (canOpenFence(fence)) {
            openFence = fence;
        }
    }

    const line = document.lineAt(position.line).text;
    const cursor = Math.max(0, Math.min(position.character, line.length));
    const currentFence = readFence(line);

    if (openFence) {
        if (currentFence && canCloseFence(openFence, currentFence)
            && cursor >= currentFence.end) {
            return switchIme('zh');
        }
        return switchIme('en');
    }

    if (currentFence && canOpenFence(currentFence)) {
        return switchIme(cursor >= currentFence.end ? 'en' : 'zh');
    }

    let delimiterLength = 0;
    let index = 0;
    while (index < cursor) {
        // 只有正文中的反斜杠有转义作用；代码内的反斜杠按普通字符处理。
        if (delimiterLength === 0 && line[index] === '\\') {
            index += 2;
            continue;
        }
        if (line[index] !== '`') {
            index++;
            continue;
        }

        const start = index;
        while (line[index] === '`') {
            index++;
        }
        const length = index - start;
        // 光标在标记内部时保留进入该标记之前的模式。
        if (index > cursor) {
            return switchIme(delimiterLength === 0 ? 'zh' : 'en');
        }
        if (delimiterLength === 0) {
            delimiterLength = length;
        } else if (length === delimiterLength) {
            delimiterLength = 0;
        }
    }

    return switchIme(delimiterLength === 0 ? 'zh' : 'en');
}
