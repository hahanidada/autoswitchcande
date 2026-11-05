# autoSwitchCandE：VS Code 中英文输入法自动切换插件

这个项目准备实现一个 VS Code 插件：根据编辑位置自动切换中英文输入状态，让写代码、注释和文档时少一些手动切换。

**当前状态：项目已有 TypeScript 扩展的基础结构，自动切换功能尚未实现。** 目前唯一的示例命令是 `Test Function`，执行后显示 `Hello World from autoSwitchCandE!`。下面依据当前文件内容介绍项目，方便边开发边学习。

## 1. 项目结构

```text
autoswitchcande/
├── out/                          TypeScript 编译生成的 JavaScript
│   ├── extension.js              插件实际加载的入口
│   ├── extension.js.map          入口代码的源码映射
│   └── test/
│       ├── extension.test.js      编译后的测试
│       └── extension.test.js.map  测试的源码映射
├── src/                          手动维护的 TypeScript 源码
│   ├── extension.ts              插件入口源码
│   └── test/
│       └── extension.test.ts      示例测试源码
├── .vscode-test.mjs               扩展测试运行器配置
├── .vscodeignore                  VSIX 插件安装包的排除规则
├── CHANGELOG.md                   版本更新记录
├── eslint.config.mjs             代码风格和静态检查规则
├── package-lock.json             npm 依赖版本锁定文件
├── package.json                  项目依赖、脚本和 VS Code 扩展声明
├── README.md                     本项目说明和入门文档
├── tsconfig.json                 TypeScript 编译配置
└── vsc-extension-quickstart.md    扩展模板附带的快速入门文档
```

这里列出全部项目自有文件；`node_modules/` 中的第三方文件、`.git/` 中的版本管理文件按目录说明，不逐个展开。

### 1.1 `src/extension.ts`：插件入口源码

这是以后实现主要业务逻辑的起点。当前文件包含：

| 代码 | 作用 |
| --- | --- |
| `import * as vscode from 'vscode'` | 使用 VS Code 提供的扩展 API，例如注册命令、显示消息、读取编辑器状态。运行时的 `vscode` 模块由 VS Code 提供。 |
| `activate(context)` | 插件被激活时调用的初始化函数，可以在这里注册命令和事件监听器。不是每输入一个字符就调用一次。 |
| `console.log(...)` | 激活时输出日志，调试时可以在开发窗口的“调试控制台”查看。 |
| `vscode.commands.registerCommand(...)` | 为命令 ID 注册执行函数。当前 ID 是 `autoswitchcande.helloWorld`。 |
| `vscode.window.showInformationMessage(...)` | 在用户界面显示提示消息；当前示例只完成这个动作。 |
| `context.subscriptions.push(disposable)` | 把命令注册返回的可释放对象交给扩展生命周期管理，在扩展停用时释放注册。以后添加的事件监听器通常也需要这样管理。 |
| `deactivate()` | 插件停用时可执行清理工作的入口；当前函数为空。 |

`activate` 负责注册命令，注册时传入的回调负责执行命令。第一次调用示例命令会触发插件激活，后续再调用时执行的是已经注册的回调。参见官方的[扩展结构说明](https://code.visualstudio.com/api/get-started/extension-anatomy)。

### 1.2 `src/test/extension.test.ts`：测试源码

当前使用 Mocha 风格的 `suite(...)` 和 `test(...)` 组织测试，用 Node.js 的 `assert.strictEqual(...)` 检查结果。

现有 `Sample test` 只验证数组中找不到元素时 `indexOf(...)` 返回 `-1`，并没有测试示例命令或输入法切换。文件虽然导入了 `vscode` 并显示测试开始提示，但插件源码的导入仍被注释。

以后可以在这里增加真实行为测试，例如判断当前位置是否属于注释的规则测试。测试源码会先编译到 `out/test/`，再由扩展测试运行器加载。

### 1.3 `out/`：编译产物

| 文件 | 作用 |
| --- | --- |
| `out/extension.js` | `src/extension.ts` 编译后的 JavaScript，也是 `package.json` 的 `main` 指向的文件。 |
| `out/extension.js.map` | 把编译后的 JavaScript 位置映射回 TypeScript 源码，让调试器能够定位源码断点。 |
| `out/test/extension.test.js` | `src/test/extension.test.ts` 编译后的测试文件。 |
| `out/test/extension.test.js.map` | 测试代码的源码映射，便于调试测试。 |

日常修改 `src/`，然后重新编译；直接修改 `out/` 中的文件会在后续编译时被覆盖。当前仓库已经跟踪了上述四个编译产物，且 `.gitignore` 没有忽略 `out/`。


### 1.6 `eslint.config.mjs`：代码检查规则

`.mjs` 表示使用 JavaScript ES 模块语法，所以文件通过 `import` 加载工具，再用 `export default` 导出配置。

当前配置通过 `typescript-eslint` 解析 TypeScript，指定 ECMAScript 2022 语法和模块形式，并设置以下警告规则：

| 规则 | 作用 |
| --- | --- |
| `@typescript-eslint/naming-convention` | 对导入名称要求使用 `camelCase` 或 `PascalCase`。 |
| `curly` | 检查控制语句的花括号使用。 |
| `eqeqeq` | 提醒使用严格相等比较，减少隐式类型转换。 |
| `no-throw-literal` | 检查抛出字符串等字面量的情况，鼓励抛出错误对象。 |
| `semi` | 检查语句结尾的分号。 |

这些规则都配置成 `warn`。当前 `lint` 脚本也没有使用 `--fix`，所以运行代码检查不会自动修改源文件。


## 2. 详细理解 `package.json`

这个文件同时承担两项工作：作为 npm 项目配置，声明依赖和开发脚本；作为 VS Code 的扩展清单，声明扩展信息、加载入口和提供给编辑器的功能。

下面覆盖当前文件中的全部顶层字段及其子字段。JSON 不允许注释，因此解释写在这里，不把注释加进真实配置。

### 2.1 `name`：内部名称

当前值是 `"autoswitchcande"`。这是供工具和扩展系统识别的名称，使用小写且不带空格。它与展示名称可以不同。

发布时，扩展完整标识通常由 `publisher.name` 组成。当前文件还没有 `publisher`，所以不能仅凭 `name` 写出已经存在的市场扩展标识。

### 2.2 `displayName`：展示名称

当前值是 `"autoSwitchCandE"`，用于扩展列表、详情等面向用户的位置，可以使用更易读的大小写形式。修改它不会自动修改 `name` 或命令 ID。

### 2.3 `description`：简短描述

当前值是 `"firstVsCodeExtension"`，用于简要说明扩展做什么。现在仍是占位描述，还没有表达“自动切换中英文输入法”的目标；本次只补充 README，没有修改它。

### 2.4 `version`：插件版本

当前值是 `"0.0.1"`。版本采用 `主版本.次版本.修订版本` 的形式，一般分别表达不兼容变化、新功能和问题修复。

这是插件自身的版本，不是 VS Code 的版本，也不是 TypeScript 的版本。

### 2.5 `engines` 与 `engines.vscode`：宿主兼容范围

当前配置为：

```json
"engines": {
  "vscode": "^1.144.0"
}
```

`engines` 是运行环境兼容范围对象，里面的 `vscode` 表示允许加载该扩展的 VS Code 版本范围。按通常的稳定版语义，`^1.144.0` 表示 `>=1.144.0 <2.0.0`，因此当前最低要求是 VS Code `1.144.0`。

这个字段不会安装或升级编辑器，也不会指定项目终端里的 Node.js 版本。以后降低最低版本时，还需要确认代码所用 API 在目标版本可用。

### 2.6 `categories`：扩展分类

当前值是 `["Other"]`，即“其他”分类。它是数组，可以包含受支持的市场分类，用于扩展的展示与查找，不会改变运行逻辑。

以上基础清单字段的定义见 [VS Code Extension Manifest](https://code.visualstudio.com/api/references/extension-manifest)。

### 2.7 `activationEvents`：激活时机

当前值是 `[]`，表示没有在此处额外显式声明激活事件。**它不等于“插件永远不会启动”，也不等于“编辑器启动后立即运行”。**

从 VS Code `1.74.0` 开始，通过 `contributes.commands` 声明的命令，在被调用时可以自动触发扩展激活，不必再显式写对应的 `onCommand:...`。当前最低版本高于这一版本，所以执行 `Test Function` 仍然可以激活插件。参见[官方激活事件文档](https://code.visualstudio.com/api/references/activation-events#onCommand)。

当前代码也没有监听光标或文档变化，所以仅打开文件、写注释并不会实现输入法切换。后续开发自动功能时，需要结合目标使用场景选择激活时机，再在 `activate` 中注册必要的监听器。

### 2.8 `main`：运行入口

当前值是 `"./out/extension.js"`，路径相对于插件根目录。VS Code 激活这个扩展时，通过该文件加载入口实现。

这里指向编译后的 JavaScript，而源码位于 `src/extension.ts`。因此源码修改后需要编译；只修改源码而未更新产物，调试时可能仍运行旧逻辑。

### 2.9 `contributes`：向 VS Code 声明功能

当前配置为：

```json
"contributes": {
  "commands": [
    {
      "command": "autoswitchcande.helloWorld",
      "title": "Test Function"
    }
  ]
}
```

| 字段 | 当前含义 |
| --- | --- |
| `contributes` | 扩展贡献点的容器，向编辑器声明扩展提供哪些功能。 |
| `contributes.commands` | 命令声明数组。当前只有一个命令，以后可继续添加命令对象。 |
| `contributes.commands[0].command` | 命令的程序标识 `autoswitchcande.helloWorld`，必须与源码中 `registerCommand(...)` 的第一个参数一致。 |
| `contributes.commands[0].title` | 命令面板中的可读标题 `Test Function`，用户搜索和点击的是这个标题。 |

声明命令和实现命令需要相互配合：这里让 VS Code 知道命令的名称与展示方式，`src/extension.ts` 中的 `registerCommand` 提供实际回调。仅修改标题不会改变回调行为。详见[官方命令开发指南](https://code.visualstudio.com/api/extension-guides/command)。

当前没有 `contributes.configuration` 或 `contributes.keybindings`，所以项目尚未声明插件专属设置项或默认快捷键。