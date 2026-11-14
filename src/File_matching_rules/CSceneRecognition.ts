import type { Position } from 'vscode';

/** 只检查当前行光标左侧的 //，不解析字符串或其他注释语法。 */
export function CSceneRecognition(
    position: Position,
    currentLine: string,
    requestIme: (mode: 'zh' | 'en') => Promise<unknown>
): 'zh' | 'en' {
    const cursor = Math.max(0, Math.min(position.character, currentLine.length));
    const mode = currentLine.slice(0, cursor).includes('//') ? 'zh' : 'en';

    void requestIme(mode).catch((error: unknown) => {
        console.error('输入法切换失败：', error);
    });
    return mode;
}
