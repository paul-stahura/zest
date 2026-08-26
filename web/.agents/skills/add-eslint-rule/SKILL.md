---
name: add-eslint-rule
description: Create an ESLint rule as a behavioral guardrail for Codex. Use when you've noticed Codex repeatedly making the same mistake or drifting from an established pattern - the rule becomes a persistent nudge that keeps Codex aligned without repeated instructions.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Creating ESLint Rules as Codex Guardrails

## Philosophy

### Why ESLint rules for Codex?

These rules are **behavioral nudges** - persistent reminders that keep Codex aligned with codebase conventions without you having to re-explain them every session.

When Codex writes code that violates a rule, it sees the lint error immediately. This creates a tight feedback loop: Codex corrects itself in real-time. The alternative - correcting Codex manually each time - doesn't scale and the corrections are lost between sessions.

**A rule is a correction that persists.**

### Why is documentation created at the end?

The process of handling existing violations is a **discovery process**. You can't document fix strategies upfront because you don't know what patterns exist until you run the rule against the codebase.

By writing documentation _after_ fixing violations, you're capturing real knowledge gained through doing the work - not theoretical guidance that may not match reality.

### Why subagents for batch processing?

Fixing violations pollutes context. If the main conversation handles 50 violations, it loses track of the bigger picture. Subagents process violations in small batches (5-10 files), keeping the top-level context clean for coordination and decision-making.

### Why persist fix strategies to documentation?

We're not just fixing violations once - we're building **institutional knowledge**. The next time someone (human or Codex) encounters this error, they should have a concrete, battle-tested guide to fixing it.

The documentation file (`<rule-name>.md`) alongside the rule becomes a living record of how to handle each violation pattern. Error messages point directly to relevant sections, making the fix path clear.

## When to Create a Rule

Create a rule when:

- Codex repeatedly makes the same mistake
- An architectural pattern exists but Codex doesn't follow it consistently
- A convention is important but easy to forget
- You've corrected Codex for the same thing 3+ times
- **Critically: the violation can be expressed as a reliable code pattern**

**The test**: If it's worth correcting Codex for, it's worth automating that correction.

## Limitations - When NOT to Create a Rule

ESLint rules work through AST pattern matching. If you can't express the nudge as a **reliable, detectable code pattern**, a rule is probably the wrong tool.

**Not good fits for rules:**

- **Judgment calls** - "use the simpler approach" can't be detected mechanically
- **Context-dependent decisions** - "don't do X unless Y" where Y requires understanding intent
- **Semantic correctness** - "make sure the logic is right" isn't pattern-matchable
- **Style preferences without structure** - "write clearer variable names" has no AST signal

**Good fits for rules:**

- Structural patterns: class instantiation in the wrong layer
- Missing setup calls: test files missing required configuration
- Wrong return types: functions returning the wrong type shape
- Import violations: importing from forbidden paths
- File location: code in the wrong directory

**The litmus test**: Can you describe the violation as "when I see [specific AST pattern] in [specific file context]"? If yes, it's a good candidate. If you need to understand what the code _means_ rather than what it _looks like_, consider other approaches (documentation, AGENTS.md rules, code review).

## Good Rule Categories

Rules work well for enforcing:

- **Architectural boundaries** - ensuring code goes through the right layers (handlers → services → repos)
- **Validation patterns** - using the right validation approach in the right place (see [Validators docs](.Codex/rules/validators.md))
- **Type safety conventions** - correct use of type guards, return types, and type assertions
- **Testing discipline** - proper setup of mocks, timers, and test utilities
- **File organization** - keeping related code together in the right locations

## Creating a Rule

### Step 1: Write the Rule

See the example template at `.Codex/skills/add-eslint-rule/example-rule.js` for the full structure.

Create `eslint-local-rules/<rule-name>.js` with:

1. **Header comment** - Why this rule exists, what triggers it, how to fix violations
2. **meta.messages** - Actionable error messages that tell Codex what to do instead
3. **create()** - AST visitor that detects violations

### Step 2: Register

In `eslint-local-rules.js`:
```js
module.exports = {
  "<rule-name>": require("./eslint-local-rules/<rule-name>"),
};
```

Only one file needed - the plugin finds `eslint-local-rules.js` at the repo root.

### Step 3: Enable

In `apps/glados/.eslintrc.js`:
```js
rules: {
  "local-rules/<rule-name>": "error",
}
```

### Step 4: Handle Existing Violations

When you enable a new rule, you'll have existing violations to resolve. This is a discovery process - you'll learn the fix patterns as you go.

#### Step 4.1: Find all violations

```bash
npx eslint . --cache --rule 'local-rules/<rule-name>: error' 2>&1
```

The `--cache` flag significantly speeds up subsequent runs.

#### Step 4.2: Review and analyze the violations

Look at a good spread of the violations across different parts of the codebase. Understand the patterns - are they all the same kind of issue, or are there distinct categories? Think about what remediation approaches would make sense for this codebase.

#### Step 4.3: Develop a strategy with the user

Propose possible approaches to the user. Common strategies include:

- **Refactor**: Describe how violations should be fixed (e.g., "Move repo instantiation to the service layer and inject it")
- **Disable with comment**: Add `// eslint-disable-next-line local-rules/<rule-name> -- [reason]` for legitimate exceptions
- **Mixed**: Different approaches for different categories of violations

Engage in discourse with the user to develop a cohesive strategy. The goal is alignment on an approach that makes sense for the codebase, not rigid adherence to a formula. Be flexible - the user knows their codebase best.

#### Step 4.4: Execute with subagents

Once you've agreed on a strategy, spawn subagents to process violations in batches (5-10 files per batch). This keeps top-level context clean for coordination.

Each subagent receives the agreed-upon strategy, applies it to their batch, and reports back. Collect any edge cases that don't fit the strategy and escalate them back to the user for guidance.

#### Step 4.5: Verify

```bash
make lint
```

### Step 5: Document the Fix Strategy (for posterity)

The knowledge gained from fixing violations is valuable for the future. Create documentation alongside the rule:

1. **Create `eslint-local-rules/<rule-name>.md`** with:

   - Why this rule exists
   - Common violation patterns discovered
   - How to fix each pattern (with examples)
   - When it's appropriate to disable (with example comments)

2. **Update the rule's error messages** to point to specific sections of this documentation:
   ```js
   messages: {
     routeHandler: "Don't use {{name}} directly in route handlers. See eslint-local-rules/<rule-name>.md#route-handlers",
     factoryFunction: "Don't instantiate {{name}} in factories. See eslint-local-rules/<rule-name>.md#factory-functions",
   }
   ```

This documentation ensures that anyone encountering this error in the future - human or Codex - has a concrete guide to fixing it. We're not just fixing violations once; we're building institutional knowledge.

**IMPORTANT**: Always get user approval on the fix strategy BEFORE processing any violations. Never auto-fix without confirmation.

## AST Patterns

| To catch            | Use                                        |
| ------------------- | ------------------------------------------ |
| `new SomeClass()`   | `NewExpression`                            |
| `someFunction()`    | `CallExpression`                           |
| `import x from 'y'` | `ImportDeclaration`                        |
| `function foo(): T` | `FunctionDeclaration` + check `returnType` |
| File location       | `context.getFilename()`                    |

Use [AST Explorer](https://astexplorer.net/) to understand code structure.

## Reference

- Example template: `.Codex/skills/add-eslint-rule/example-rule.js`
- ESLint custom rules: https://eslint.org/docs/latest/extend/custom-rules
- Validators guidance: `.Codex/rules/validators.md`
