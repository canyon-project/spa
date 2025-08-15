## Canyon Report SPA

一个基于 Monaco Editor 的前端代码覆盖率可视化组件（Library）。提供按行覆盖次数、变更行标记与语法区块（语句/函数/分支）未覆盖高亮能力，适合在 Web 页面中快速渲染单文件级别的覆盖详情。

### 特性
- **覆盖热度**: 在行号侧显示执行次数与背景色热度条。
- **变更标记**: 支持通过传入 `diff` 高亮变更行。
- **未覆盖高亮**: 对语句、函数与分支未覆盖范围进行渐变背景标注（含 `I/E` 插桩提示）。
- **主题**: 支持 `light`/`dark` 两种主题（Monaco `vs`/`vs-dark`）。
- **零依赖框架**: 以 UMD/ES 模块方式分发，可直接在浏览器或任意框架中使用。

### 安装
```bash
npm i canyon-report-spa monaco-editor
# 或者
pnpm add canyon-report-spa monaco-editor
```

### 快速开始（浏览器 UMD）
在页面中引入 Monaco，并将其实例挂到 `window.monaco`，随后引入本库并调用 `initCanyonSpa`。

```html
<div id="app" style="height:90vh"></div>

<!-- 1) 引入 Monaco（示例使用 CDN ESM 版本） -->
<script type="module">
  import * as monaco from 'https://cdn.jsdelivr.net/npm/monaco-editor@0.47.0/+esm';
  window.monaco = monaco;
  console.log('Monaco loaded', !!window.monaco);
\n  // 2) 引入 Canyon Report SPA（UMD）并初始化
  import { initCanyonSpa } from 'https://unpkg.com/canyon-report-spa/dist/index.js';
  // 引入样式（推荐将本仓库的 src/assets/index.css 内容拷入你的项目样式体系）
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = 'https://unpkg.com/canyon-report-spa/src/assets/index.css';
  document.head.appendChild(style);
\n  // 示例数据（请替换为你实际的内容与覆盖率对象）
  const content = 'function add(a, b) {\n  if (a) {\n    return a + b;\n  }\n  return b;\n}\n';
  const coverage = {/* 见下文“覆盖率数据结构” */};
\n  initCanyonSpa(document.getElementById('app'), {
    coverage,
    content,
    diff: [2, 3], // 变更的行号（1-based）
    theme: 'dark',
  });
</script>
```

### 在工程内使用（ESM）
```ts
import { initCanyonSpa } from 'canyon-report-spa';
// 重要：请确保 window.monaco 已就绪
import * as monaco from 'monaco-editor';
(window as any).monaco = monaco;

// 引入样式（建议将本仓库 `src/assets/index.css` 合并到你的全局样式中）
import 'canyon-report-spa/src/assets/index.css';

initCanyonSpa(document.getElementById('app')!, {
  coverage,  // Istanbul 单文件 coverage 对象
  content,   // 文件完整源码字符串
  diff: [10, 12],
  theme: 'dark',
});
```

### API
```ts
initCanyonSpa(
  dom: HTMLElement,
  options: {
    coverage: FileCoverage; // Istanbul 单文件覆盖率对象
    content: string;        // 源码全文
    diff?: number[];        // 需要额外标记的变更行（1-based）
    theme?: 'dark' | 'light'; // 默认 light（映射为 Monaco 的 vs / vs-dark）
  }
): void
```

### 覆盖率数据结构（Istanbul 兼容）
`coverage` 为 Istanbul 的单文件 `FileCoverage`，关键字段如下：
- **statementMap/s**: 语句位置信息与命中次数
- **fnMap/f**: 函数位置信息与命中次数
- **branchMap/b**: 分支位置信息与命中次数

最小示例：
```json
{
  "statementMap": {
    "0": { "start": {"line": 1, "column": 0}, "end": {"line": 1, "column": 24} }
  },
  "s": { "0": 1 },
  "fnMap": {
    "0": { "name": "add", "decl": {"start": {"line": 1, "column": 0}, "end": {"line": 1, "column": 8}}, "loc": {"start": {"line": 1, "column": 0}, "end": {"line": 5, "column": 1}}, "line": 1 }
  },
  "f": { "0": 1 },
  "branchMap": {},
  "b": {}
}
```

### 样式与字体
- **必须样式**: 组件依赖以下 class 进行渲染：
  - `.line-number-wrapper`、`.line-number`、`.line-change`、`.line-coverage`
  - `.content-class-no-found`（未覆盖语句/函数）、`.content-class-no-found-branch`（未覆盖分支）
  - `.insert-i-decoration`、`.insert-e-decoration`（条件分支 I/E 标签）
- **推荐做法**: 将本仓库 `src/assets/index.css` 内容合并到你的工程全局样式中；或以你项目的构建链路复制等价样式。
- **字体**: 使用 `IBMPlexMono` 等宽字体（见 `src/assets/fonts/IBMPlexMono-Regular.woff2`）。可按需替换。

### 运行与开发
- **本地启动**: `npm run dev` 后访问开发服务器（Vite 默认 `http://localhost:5173`）。
- **构建**: `npm run build` 生成 UMD/ES 产物于 `dist/`。
- **预览**: `npm run preview` 本地预览构建产物。
- **示例入口**: 参见 `index.html` 与 `src/main.ts`（用于本仓库开发调试）。

### 注意事项 / FAQ
- **必须先加载 Monaco**: 在调用 `initCanyonSpa` 前确保 `window.monaco` 可用。
- **样式未生效**: 请确认已引入 `src/assets/index.css` 中的样式或自行实现等价样式。
- **行号与内容错位**: `content` 必须是目标文件的完整源码（包含换行），否则覆盖位置信息可能错位。
- **diff 行号**: 传入的是 1-based 行号（与编辑器显示一致）。

### 许可证
当前仓库尚未声明 License，请在引入到生产环境前确认使用策略。


