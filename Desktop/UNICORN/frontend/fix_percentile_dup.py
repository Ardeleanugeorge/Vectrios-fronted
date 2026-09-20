file = r"components/dashboard/BenchmarkPanel.tsx"
with open(file, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Remove lines 184-186 (0-indexed 183-185) - duplicate percentile text
del lines[183:186]
print(f"Removed duplicate percentile lines")

with open(file, "w", encoding="utf-8") as f:
    f.writelines(lines)
