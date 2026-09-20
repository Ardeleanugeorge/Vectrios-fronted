lines = open("components/dashboard/ActionableInsights.tsx", encoding="utf-8").readlines()

for i, line in enumerate(lines):
    if "primary_issue: actionLayer.primary_issue?.title" in line:
        lines[i] = '          primary_issue: actionLayer.primary_issue?.title\n'
        lines[i+1] = '            ? actionLayer.primary_issue\n'
        lines[i+2] = '            : placeholderLayer.primary_issue,\n'
        # Remove the extra lines we added
        del lines[i+3]
        del lines[i+3]
        print(f"Reverted at line {i+1}")
        break

with open("components/dashboard/ActionableInsights.tsx", "w", encoding="utf-8") as f:
    f.writelines(lines)
