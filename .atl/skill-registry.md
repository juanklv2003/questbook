# Skill Registry — FlashyIA

Generated: 2026-05-24

## Project Conventions

*No project-level convention files detected.*

## Available Skills

### User-Level Skills

| Skill | Path | Trigger |
|-------|------|---------|
| go-testing | `C:\Users\carlo\.config\opencode\skills\go-testing\SKILL.md` | When writing Go tests, using teatest, or adding test coverage |
| skill-creator | `C:\Users\carlo\.config\opencode\skills\skill-creator\SKILL.md` | When user asks to create a new skill, add agent instructions, or document patterns for AI |
| caveman | `C:\Users\carlo\.agents\skills\caveman\SKILL.md` | When user says "caveman mode", "talk like caveman", "use caveman", "less tokens", "be brief", or invokes /caveman |
| find-skills | `C:\Users\carlo\.agents\skills\find-skills\SKILL.md` | When user asks "how do I do X", "find a skill for X", "is there a skill that can..." |

### SDD Skills (built-in)

| Skill | Path |
|-------|------|
| sdd-init | `C:\Users\carlo\.config\opencode\skills\sdd-init\SKILL.md` |
| sdd-explore | `C:\Users\carlo\.config\opencode\skills\sdd-explore\SKILL.md` |
| sdd-propose | `C:\Users\carlo\.config\opencode\skills\sdd-propose\SKILL.md` |
| sdd-spec | `C:\Users\carlo\.config\opencode\skills\sdd-spec\SKILL.md` |
| sdd-design | `C:\Users\carlo\.config\opencode\skills\sdd-design\SKILL.md` |
| sdd-tasks | `C:\Users\carlo\.config\opencode\skills\sdd-tasks\SKILL.md` |
| sdd-apply | `C:\Users\carlo\.config\opencode\skills\sdd-apply\SKILL.md` |
| sdd-verify | `C:\Users\carlo\.config\opencode\skills\sdd-verify\SKILL.md` |
| sdd-archive | `C:\Users\carlo\.config\opencode\skills\sdd-archive\SKILL.md` |

## Shared Convention Files

| File | Path |
|------|------|
| persistence-contract | `C:\Users\carlo\.config\opencode\skills\_shared\persistence-contract.md` |
| engram-convention | `C:\Users\carlo\.config\opencode\skills\_shared\engram-convention.md` |
| openspec-convention | `C:\Users\carlo\.config\opencode\skills\_shared\openspec-convention.md` |

## Instructions

Sub-agents: load relevant skills via `mem_search(query: "skill-registry", project: "FlashyIA")` or read `.atl/skill-registry.md`.
