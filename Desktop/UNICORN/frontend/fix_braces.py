lines = open("components/dashboard/ActionableInsights.tsx", encoding="utf-8").readlines()

for i, line in enumerate(lines):
    if "primary_issue: actionLayer.primary_issue?.title" in line:
        # Add missing closing braces after placeholderLayer.primary_issue,
        if "// Do not mix" in lines[i+4]:
            lines.insert(i+3, '        }\n')
            lines.insert(i+4, '      : placeholderLayer\n')
            print(f"Fixed missing braces at line {i+1}")
        break

with open("components/dashboard/ActionableInsights.tsx", "w", encoding="utf-8") as f:
    f.writelines(lines)
