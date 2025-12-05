import {annotateBranches, annotateFunctions, annotateStatements} from "./lib/annotate.ts";
import { coreFn } from "./lib/coreFn.ts";
import {lineNumbers} from "./lib/lineNumbers.ts";

// console.log('加载spa完成')

// @ts-ignore
window.CanyonReportSpa = {initCanyonSpa}

console.log(window.CanyonReportSpa)

export function initCanyonSpa(dom, options) {
    const { 
      coverage, 
      content,
      diff, 
      theme, 
      height,
      // 装饰器显示控制，默认全部显示
      showDecorations = {
        statements: true,  // 显示语句装饰器
        functions: true,   // 显示函数装饰器
        branches: true,    // 显示分支装饰器
      }
    } = options;

    const addLines = diff||[]

  const { lines } = coreFn(coverage, content);

  const linesState = (() => {
    return lines.map((line, index) => {
      return {
        lineNumber: index + 1,
        change: addLines.includes(index + 1),
        hit: line.executionNumber,
      };
    });
  })()

  const lineNumbersMinChars = (() => {
    const maxHit = Math.max(...linesState.map((line) => line.hit));
    return maxHit.toString().length + 8;
  })()


  if (!dom) {
        throw new Error("Container element not found");
    }
    dom.style.height = height||'calc(100vh - 240px)'; // 设置容器高度
    // 默认配置
    const defaultOptions = {
        value: content,
        language: 'javascript',
        theme: theme==='dark'?'vs-dark':'vs',
        lineHeight: 18,
        lineNumbers: (lineNumber) => {
            return lineNumbers(
                lineNumber,
                linesState,
                false,
            );
        },
        lineNumbersMinChars: lineNumbersMinChars,
        readOnly: true,
        folding: false,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        showUnused: false,
        fontSize: 12,
        fontFamily: "IBMPlexMono",
        scrollbar: {
            // handleMouseWheel: false,
        },
        contextmenu: false,
        automaticLayout: true, // 启用自动布局
    };

    // 加载Monaco Editor资源
    if (window.monaco && window.monaco.editor) {
        // 如果已经加载，直接创建编辑器
        const editor = window.monaco.editor.create(dom, defaultOptions);

      const decorations = (()=>{

        const all = []
        
        // 根据参数决定是否添加对应的装饰器
        if (showDecorations.statements) {
          const annotateStatementsList = annotateStatements(coverage, content);
          all.push(...annotateStatementsList);
        }
        
        if (showDecorations.functions) {
          const annotateFunctionsList = annotateFunctions(coverage, content);
          all.push(...annotateFunctionsList);
        }
        
        if (showDecorations.branches) {
          const annotateBranchesList = annotateBranches(coverage, content);
          all.push(...annotateBranchesList);
        }

        const arr = []
        for (let i = 0; i < all.length; i++) {
          const {startLine,
            startCol,
            endLine,
            endCol,
            // type,
          } = all[i]
          if (all[i].type==='S'||all[i].type==='F') {
            arr.push({
              range: new window.monaco.Range(startLine, startCol, endLine, endCol), // 第3行第5列前插入
              options: {
                isWholeLine: false,
                inlineClassName: 'content-class-no-found',
                hoverMessage: { value:all[i].type==='S' ? "statement not covered" : "function not covered" }
              },
            })
          } else if (all[i].type==='B'){
            arr.push({
              range: new window.monaco.Range(startLine, startCol, endLine, endCol), // 第3行第5列前插入
              options: {
                isWholeLine: false,
                inlineClassName: 'content-class-no-found-branch',
                hoverMessage: { value: "branch not covered" }
              },
            })
          } else if (all[i].type==='I'){
            arr.push({
              range: new window.monaco.Range(startLine, startCol, startLine, startCol), // 第3行第5列前插入
              options: {
                beforeContentClassName: 'insert-i-decoration',
                stickiness: window.monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
              }
            })
          } else if (all[i].type==='E'){
            arr.push({
              range: new window.monaco.Range(startLine, startCol, startLine, startCol), // 第3行第5列前插入
              options: {
                beforeContentClassName: 'insert-e-decoration',
                stickiness: window.monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
              }
            })
          }
        }
        return arr
      })()

      console.log(decorations,'decorations')

        if (editor) {
            editor?.deltaDecorations?.(
                [], // oldDecorations 每次清空上次标记的
              decorations
            );
        }
    }
}
