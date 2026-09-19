import os

for path in [
    "components/dashboard/ExecutiveInterpretation.tsx",
    "components/dashboard/FinancialExposureCard.tsx"
]:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    changed = False
    if "meaningful upside" in content:
        content = content.replace(
            "meaningful upside at scale driven by ICP and positioning clarity",
            "the primary structural opportunity concentrated in ICP and positioning clarity"
        )
        content = content.replace(
            "meaningful upside at scale",
            "the primary structural opportunity"
        )
        changed = True
        print(f"Fixed: {path}")
    if "upside at scale" in content:
        content = content.replace("upside at scale", "structural optimization opportunity")
        changed = True
        print(f"Fixed upside: {path}")
    if changed:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)

print("Done")
