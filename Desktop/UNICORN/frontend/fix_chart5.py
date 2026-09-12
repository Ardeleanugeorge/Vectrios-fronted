file = r"components/dashboard/RiiTimelineChart.tsx"
with open(file, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('Revenue Risk Trend (30 Days)', 'Revenue Risk Trend')
print(f"Done - remaining: {content.count('Revenue Risk Trend (30 Days)')}")

with open(file, "w", encoding="utf-8") as f:
    f.write(content)
