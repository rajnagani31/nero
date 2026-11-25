Please synthesize a comprehensive pull request executive summary and review verdict based on the individual file reviews completed across this pull request.

## Pull Request Context
- **Title**: {pr_title}
- **Description**: {pr_description}
- **Total Files Evaluated**: {total_files}
- **Critical Findings Count**: {critical_findings_count}
- **High Findings Count**: {high_findings_count}

## Per-File Review Summaries
{file_summaries}

## Synthesis Instructions
Generate an executive PR review report in markdown containing:
1. **Overall Verdict**:
   - `APPROVE` if no critical or high severity defects were discovered and the overall change is safe.
   - `COMMENT` if only medium/low/info items were found and merge decision is left to human reviewers.
   - `REQUEST_CHANGES` if one or more critical or high severity defects must be resolved before merging.
2. **Executive Summary**:
   - High-level synopsis of what this pull request accomplishes and its architectural impact.
3. **Key Risks & Defects Table**:
   - Summarize the top findings grouped by risk severity with links or file references.
4. **Positive Highlights**:
   - Commend clean architecture, effective testing, or clear patterns present in the PR.
5. **Pre-Merge Verification Checklist**:
   - Actionable checklist of tests, smoke checks, or security reviews the author should run before pushing to main/production.
