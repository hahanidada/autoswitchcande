
import * as vscode from 'vscode';
type ImeMode = 'zh' | 'en';


export   function pythonSceneRecognition(position: vscode.Position, currentLine: string, requestIme: (mode: ImeMode) => Promise<unknown>) {
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
