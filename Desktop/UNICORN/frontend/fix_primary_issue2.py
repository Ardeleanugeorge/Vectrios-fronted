lines = open("components/dashboard/ActionableInsights.tsx", encoding="utf-8").readlines()

for i, line in enumerate(lines):
    if "primary_issue: actionLayer.primary_issue?.title" in line:
        lines[i] = '          primary_issue: actionLayer.primary_issue?.title\n'
        lines[i+1] = '            ? actionLayer.primary_issue\n'
        lines[i+2] = '            : actionLayer.fixes?.[0]\n'
        lines[i+3] = '              ? { title: actionLayer.fixes[0].title, description: actionLayer.fixes[0].why ?? actionLayer.fixes[0].after ?? placeholderLayer.primary_issue.description }\n'
        # Insert closing line
        lines.insert(i+4, '              : placeholderLayer.primary_issue,\n')
        # Remove old placeholder line
        del lines[i+5]
        print(f"Fixed primary_issue at line {i+1}")
        break

with open("components/dashboard/ActionableInsights.tsx", "w", encoding="utf-8") as f:
    f.writelines(lines)
