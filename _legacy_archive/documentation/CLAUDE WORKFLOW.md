## Workflow Orchestration

### 1. Mandatory Plan Mode (NO COWBOY COMMITS)
- Enter plan mode for EVERY task involving a code change. There are no "trivial" edits.
- If something goes sideways, STOP and re-plan immediately.
- Use plan mode for verification steps, not just building.
- Write detailed specs upfront to reduce ambiguity.

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update the "Living Lessons" section at the bottom of THIS file.
- Write rules for yourself that prevent the same mistake.
- Ruthlessly iterate on these lessons until mistake rate drops.

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes -- don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests -- then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. Plan First: Write plan to tasks/todo.md with checkable items
2. Verify Plan: Check in before starting implementation
3. Track Progress: Mark items complete as you go
4. Explain Changes: High-level summary at each step
5. Document Results: Add review section to tasks/todo.md
6. Capture Lessons: Update tasks/lessons.md after corrections

## Core Principles

- Simplicity First: Make every change as simple as possible. Impact minimal code.
- No Laziness: Find root causes. No temporary fixes. Senior developer standards.
- Minimal Impact: Only touch what's necessary. No side effects with new bugs.
```

##
## Living Lessons & Project-Specific Rules

### Anti-Rush Policy
- **Problem**: Rushing into code creation without formalizing a step-by-step plan.
- **Rule**: ALWAYS present a clear checklist and explain the "Why" before writing a single line of Python or React.
- **Problem**: Creating unnecessary small files for tracking.
- **Rule**: Keep all workflow rules and lessons within `CLAUDE WORKFLOW.md` to avoid cluttering the repository.

### Rebranding Protocol
- **Problem**: Inconsistent renaming across large codebases.
- **Rule**: After any rebranding task, run a global `grep_search` to ensure 100% completion.
