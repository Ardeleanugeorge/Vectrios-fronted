lines = open("components/dashboard/ActionableInsights.tsx", encoding="utf-8").readlines()

for i, line in enumerate(lines):
    if "primary_issue: actionLayer.primary_issue?.title" in line:
        # Replace the primary_issue logic to use fixes[0] when available
        lines[i] = '          primary_issue: actionLayer.primary_issue?.title\n'
        lines[i+1] = '            ? actionLayer.primary_issue\n'
        lines[i+2] = '            : actionLayer.fixes?.[0]\n'
        lines[i+3] = '              ? { title: actionLayer.fixes[0].title, description: actionLayer.fixes[0].why || actionLayer.fixes[0].after || placeholderLayer.primary_issue.description }\n'
        lines[i+4] = '              : placeholderLayer.primary_issue,\n'
        print(f"Fixed at line {i+1}")
        break

with open("components/dashboard/ActionableInsights.tsx", "w", encoding="utf-8") as f:
    f.writelines(lines)
