"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSceneRecognition = CSceneRecognition;
/** 只检查当前行光标左侧的 //，不解析字符串或其他注释语法。 */
function CSceneRecognition(position, currentLine, requestIme) {
    const cursor = Math.max(0, Math.min(position.character, currentLine.length));
    const mode = currentLine.slice(0, cursor).includes('//') ? 'zh' : 'en';
    void requestIme(mode).catch((error) => {
        console.error('输入法切换失败：', error);
    });
    return mode;
}
//# sourceMappingURL=CSceneRecognition.js.map