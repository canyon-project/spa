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

  // 计算变更行关联的语句覆盖率（使用用户提供的逻辑）
  const calculateChangeStatementsCoverage = () => {
    if (!addLines.length || !coverage.statementMap || !coverage.s) {
      return null;
    }

    // 收集所有与新增行有交集的语句，作为"相关联语句"全集（分母）
    const relatedStatementKeys = new Set<string>();
    const statementInfoMap = new Map<string, {
      statementId: string;
      startLine: number;
      endLine: number;
      startCol: number;
      endCol: number;
      covered: boolean;
      count: number;
      relatedLines: number[];
    }>();

    Object.entries(coverage.statementMap).forEach(([key, value]: any) => {
      const startLine = value.start.line;
      const endLine = value.end.line;
      const startCol = value.start.column;
      const endCol = value.end.column;
      
      // 检查语句是否与新增行有交集
      const relatedLines: number[] = [];
      for (let line = startLine; line <= endLine; line++) {
        if (addLines.includes(line)) {
          relatedLines.push(line);
        }
      }
      
      if (relatedLines.length > 0) {
        relatedStatementKeys.add(key);
        const count = coverage.s[key] || 0;
        statementInfoMap.set(key, {
          statementId: key,
          startLine,
          endLine,
          startCol,
          endCol,
          covered: count > 0,
          count,
          relatedLines,
        });
      }
    });

    const total = relatedStatementKeys.size;
    let covered = 0;
    relatedStatementKeys.forEach((key) => {
      if (coverage.s[key] > 0) {
        covered++;
      }
    });

    const pct = total > 0 ? Math.round((covered / total) * 100) : 0;

    return {
      total,
      covered,
      skipped: 0,
      pct,
      statements: Array.from(statementInfoMap.values()).sort((a, b) => a.startLine - b.startLine),
    };
  };

  const changeStatementsCoverage = calculateChangeStatementsCoverage();

  const linesState = (() => {
    // 创建语句ID到行号的映射，用于快速查找
    const statementToLinesMap = new Map<string, number[]>();
    if (changeStatementsCoverage) {
      changeStatementsCoverage.statements.forEach(st => {
        st.relatedLines.forEach(lineNum => {
          if (!statementToLinesMap.has(st.statementId)) {
            statementToLinesMap.set(st.statementId, []);
          }
          statementToLinesMap.get(st.statementId)!.push(lineNum);
        });
      });
    }

    return lines.map((line, index) => {
      const lineNum = index + 1;
      // 找出该行关联的变更语句
      const relatedStatements = Array.from(statementToLinesMap.entries())
        .filter(([stId, lines]) => lines.includes(lineNum))
        .map(([stId]) => {
          const st = changeStatementsCoverage?.statements.find(s => s.statementId === stId);
          return st ? { covered: st.covered, count: st.count } : null;
        })
        .filter(Boolean);
      
      return {
        lineNumber: lineNum,
        change: addLines.includes(lineNum),
        hit: line.executionNumber,
        relatedStatements: relatedStatements.length > 0 ? relatedStatements : null,
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
    
    // 创建变更语句覆盖率统计面板
    let statementsPanel = null;
    if (changeStatementsCoverage && changeStatementsCoverage.total > 0) {
      statementsPanel = document.createElement('div');
      statementsPanel.className = 'change-statements-panel';
      const isDark = theme === 'dark';
      if (isDark) {
        statementsPanel.classList.add('dark');
      }
      
      statementsPanel.innerHTML = `
        <div class="statements-header">
          <span class="statements-title">变更语句覆盖率</span>
          <span class="statements-coverage ${changeStatementsCoverage.pct >= 80 ? 'high' : changeStatementsCoverage.pct >= 50 ? 'medium' : 'low'}">
            ${changeStatementsCoverage.pct}% (${changeStatementsCoverage.covered}/${changeStatementsCoverage.total})
          </span>
        </div>
        <div class="statements-list"></div>
      `;
      
      // 插入到dom之前
      if (dom.parentElement) {
        dom.parentElement.insertBefore(statementsPanel, dom);
      } else {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        dom.parentNode?.replaceChild(wrapper, dom);
        wrapper.appendChild(statementsPanel);
        wrapper.appendChild(dom);
      }
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
        
        // 填充语句列表并添加跳转功能
        if (statementsPanel && changeStatementsCoverage && changeStatementsCoverage.statements.length > 0) {
          const statementsList = statementsPanel.querySelector('.statements-list');
          if (statementsList) {
            changeStatementsCoverage.statements.forEach((st) => {
              const item = document.createElement('div');
              item.className = `statement-item ${st.covered ? 'covered' : 'uncovered'}`;
              item.innerHTML = `
                <span class="statement-status">${st.covered ? '✓' : '✗'}</span>
                <span class="statement-info">
                  <span class="statement-location">第 ${st.startLine} 行</span>
                  <span class="statement-count">${st.covered ? `执行 ${st.count} 次` : '未覆盖'}</span>
                </span>
                <button class="statement-jump-btn" data-line="${st.startLine}" data-col="${st.startCol + 1}">
                  跳转
                </button>
              `;
              
              // 添加跳转功能
              const jumpBtn = item.querySelector('.statement-jump-btn');
              jumpBtn?.addEventListener('click', () => {
                const line = parseInt(jumpBtn.getAttribute('data-line') || '1');
                const col = parseInt(jumpBtn.getAttribute('data-col') || '1');
                editor.setPosition({ lineNumber: line, column: col });
                editor.revealLineInCenter(line);
                editor.focus();
                
                // 高亮该语句
                const range = new window.monaco.Range(
                  st.startLine, 
                  st.startCol + 1, 
                  st.endLine, 
                  st.endCol + 1
                );
                editor.setSelection(range);
                
                // 添加临时高亮装饰
                const decorationId = editor.deltaDecorations([], [{
                  range: range,
                  options: {
                    className: 'statement-highlight',
                    hoverMessage: { value: `变更语句${st.covered ? '已覆盖' : '未覆盖'}` },
                  },
                }]);
                
                // 3秒后移除高亮
                setTimeout(() => {
                  editor.deltaDecorations(decorationId, []);
                }, 3000);
              });
              
              statementsList.appendChild(item);
            });
          }
        }

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
        
        // 为变更行关联的语句添加特殊标记
        if (changeStatementsCoverage) {
          changeStatementsCoverage.statements.forEach((st) => {
            arr.push({
              range: new window.monaco.Range(
                st.startLine, 
                st.startCol + 1, 
                st.endLine, 
                st.endCol + 1
              ),
              options: {
                isWholeLine: false,
                inlineClassName: st.covered ? 'change-statement-covered' : 'change-statement-uncovered',
                hoverMessage: { 
                  value: `变更语句${st.covered ? '已覆盖' : '未覆盖'} (执行次数: ${st.count})` 
                },
                glyphMarginClassName: st.covered ? 'change-statement-glyph-covered' : 'change-statement-glyph-uncovered',
              },
            });
          });
        }
        
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
