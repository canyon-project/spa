function genBgColor(hit, isDark) {
  if (hit > 0) {
    return isDark ? "#0A6640" : "rgb(230, 245, 208)";
  } else if (hit === 0) {
    return isDark ? "#7A5474" : "rgb(252, 225, 229)";
  } else {
    return isDark ? "rgb(45, 52, 54)" : "rgb(234, 234, 234)";
  }
}

export const lineNumbers = (lineNumber: number, linesState, isDark) => {
  const line = linesState.find((line) => line.lineNumber === lineNumber) || {
    change: false,
    hit: 0,
    lineNumber: lineNumber,
    relatedStatements: null,
  };
  const maxHit = Math.max(...linesState.map((line) => line.hit));
  const len = maxHit.toString().length;
  
  // 如果有关联的变更语句，显示状态图标
  let statementIcon = '';
  if (line.relatedStatements && line.relatedStatements.length > 0) {
    const allCovered = line.relatedStatements.every((s: any) => s.covered);
    const hasUncovered = line.relatedStatements.some((s: any) => !s.covered);
    
    if (allCovered) {
      statementIcon = '<span class="change-statement-icon covered" title="变更语句已覆盖">✓</span>';
    } else if (hasUncovered) {
      statementIcon = '<span class="change-statement-icon uncovered" title="变更语句未覆盖">✗</span>';
    }
  }
  
  // 根据行号生成标识，后续会处理逻辑
  return `<div class="line-number-wrapper">
              <span class="line-number">${lineNumber}</span>
              <span class="line-change" style="background: ${line.change ? "green" : "unset"}"></span>
              ${statementIcon}
              <span class="line-coverage" style="background: ${genBgColor(line.hit, isDark)};width:${(len + 2) * 7.2}px">${line.hit > 0 ? line.hit + "x" : ""}</span>
            </div>`;
};
