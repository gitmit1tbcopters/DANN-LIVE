## Codebase Research Preference

Prefer using `tokensave` MCP tools (``tokensave_context`, `tokensave_search`, `tokensave_callees`, `tokensave_callers`, `tokensave_impact`, `tokensave_node`, `tokensave_files`, or `tokensave_affected`, etc.) for codebase exploration and research instead of spawning Explore sub-agents or running manual grep/glob sweeps.

If a code analysis question cannot be fully answered by tokensave tools, you may query `.tokensave/tokensave.db` directly via SQLite.