content = open("services/llm_rewrite.py", encoding="utf-8").read()

old = "        t, a, w = sanitize_playbook_fix_texts(t, a, w, cn)"
new = """        import re as _re
        if page_content and not _re.search(r'\\d[\\d,]+\\+?\\s*(companies|customers|users)', page_content, _re.IGNORECASE):
            a = _re.sub(r'\\d[\\d,]+\\+?\\s*(companies|customers|users)[^.]*\\.?', '', a).strip()
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
