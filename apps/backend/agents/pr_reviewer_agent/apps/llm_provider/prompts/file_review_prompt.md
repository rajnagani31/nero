Please perform a rigorous code review on the following changed file from a pull request.

## File Information
- **Target Filename**: `{filename}`
- **Git Modification Status**: `{status}`
- **Detected Language/Extension**: `{language}`

## Git Patch Diff
```diff
{patch}
```

## Review Instructions & Criteria
1. **Analyze Diff Chunk**:
   - Inspect every added (`+`) line and modified context.
   - Trace data flow, variable lifetimes, potential exceptions, error handling paths, boundary bounds, and concurrency patterns.
2. **Line Number Accuracy**:
   - Every finding MUST anchor to a valid line number in the target file where the issue occurs (`line_start` and optional `line_end`).
   - Line numbers must be positive integers matching the target file line numbers in the diff header chunks (e.g., `@@ -x,y +a,b @@`).
3. **Structured Response Format**:
   - Return valid structured output strictly conforming to the requested schema.
   - For each finding provide:
     - `severity`: "critical" | "high" | "medium" | "low" | "info"
     - `category`: "security" | "bug" | "performance" | "style" | "maintainability" | "test" | "docs" | "other"
     - `title`: Short, punchy headline summarizing the defect (under 80 characters).
     - `summary`: Clear, technical explanation of why this code is vulnerable, buggy, or problematic.
     - `recommendation`: Exact code patch or actionable advice to fix the issue.
     - `line_start`: Line number in the new file where the issue begins.
     - `line_end`: Optional end line number for multi-line issues.
4. **Summary**:
   - Provide a concise 1-3 sentence summary of the file change impact, safety, and key changes.
