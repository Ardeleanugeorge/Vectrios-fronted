file = r"components/dashboard/RiiTimelineChart.tsx"
with open(file, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)",
    "  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)\n  const [selectedDays, setSelectedDays] = useState(30)"
)
content = content.replace(
    "apiFetch(`/rii-trend/${companyId}`, {",
    "apiFetch(`/rii-trend/${companyId}?days=${selectedDays}`, {"
)
content = content.replace(
    "  }, [companyId])",
    "  }, [companyId, selectedDays])"
)

with open(file, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
