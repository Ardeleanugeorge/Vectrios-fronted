content = open("services/llm_rewrite.py", encoding="utf-8").read()

old = "        t, a, w = sanitize_playbook_fix_texts(t, a, w, cn)"
new = """        # Enterprise guardrail: revert after if LLM fabricated numbers not in page
        import re as _re
        _num_in_after = _re.search(r'\\b\\d[\\d,]+\\b', a)
        _num_in_page = _re.search(r'\\b\\d[\\d,]+\\b', page_content) if page_content else None
        if _num_in_after and not _num_in_page:
            a = orig_after
        t, a, w = sanitize_playbook_fix_texts(t, a, w, cn)"""

if old in content:
    content = content.replace(old, new, 1)
    print("Replaced OK")
else:
    print("NOT FOUND")

open("services/llm_rewrite.py", "w", encoding="utf-8").write(content)
import py_compile
try:
    py_compile.compile("services/llm_rewrite.py", doraise=True)
    print("Syntax OK")
except py_compile.PyCompileError as e:
    print(f"Error: {e}")
