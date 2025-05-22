import {annotateBranches, annotateFunctions, annotateStatements} from "./lib/annotate.ts";
import { coreFn } from "./lib/coreFn.ts";
import {lineNumbers} from "./lib/lineNumbers.ts";

export function initCanyonSpa(dom, options) {
    const { coverage, content } = options;

  const { lines } = coreFn(coverage, content);

  const linesState = (() => {
    return lines.map((line, index) => {
      return {
        lineNumber: index + 1,
        change: [].includes(index + 1),
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
    dom.style.height = "90vh";
    // 默认配置
    const defaultOptions = {
        value: content,
        language: 'javascript',
        theme: 'vs',
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





        const decorations = (() => {
            const annotateFunctionsList = annotateFunctions(coverage, content);
            const annotateStatementsList = annotateStatements(coverage);
            const annotateBranchesList = annotateBranches(coverage, content);
            return [
                ...annotateStatementsList,
                ...annotateFunctionsList,
                ...annotateBranchesList,
            ].map((i) => {
                return {
                    inlineClassName: "content-class-no-found",
                    startLine: i.startLine,
                    startCol: i.startCol,
                    endLine: i.endLine,
                    endCol: i.endCol,
                };
            });
        })()


        if (editor) {
            editor?.deltaDecorations?.(
                [], // oldDecorations 每次清空上次标记的
                decorations.map(
                    ({ inlineClassName, startLine, startCol, endLine, endCol }) => ({
                        range: new window.monaco.Range(
                            startLine,
                            startCol,
                            endLine,
                            endCol,
                        ),
                        options: {
                            isWholeLine: false,
                            inlineClassName: inlineClassName,
                        },
                    }),
                ).concat(                {
                  range: new window.monaco.Range(20, 3, 20, 3), // 第3行第5列前插入
                  options: {
                    beforeContentClassName: 'insert-e-decoration',
                    stickiness: window.monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                  }
                }),
            );
        }


    }
}
