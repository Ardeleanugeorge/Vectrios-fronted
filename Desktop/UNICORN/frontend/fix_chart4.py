file = r"components/dashboard/RiiTimelineChart.tsx"
with open(file, "r", encoding="utf-8") as f:
    content = f.read()

old = '        <h2 className="text-xl font-bold mb-4 uppercase tracking-wide">Revenue Risk Trend (30 Days)</h2>\n        <p className="text-sm text-gray-500 animate-pulse">Loading trend data...</p>'
new = '        <div className="flex items-center justify-between mb-2"><h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Revenue Risk Trend</h2><div className="flex gap-1">{([{label:"30D",v:30},{label:"90D",v:90},{label:"6M",v:180},{label:"1Y",v:365},{label:"All",v:0}]).map(({label,v})=>(<button key={label} onClick={()=>setSelectedDays(v)} className={`px-2 py-1 text-xs rounded font-medium transition ${selectedDays===v?"bg-blue-600 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{label}</button>))}</div></div>\n        <p className="text-sm text-gray-500 animate-pulse">Loading trend data...</p>'

if old in content:
    content = content.replace(old, new)
    print("Replaced OK")
else:
    print("NOT FOUND")

with open(file, "w", encoding="utf-8") as f:
    f.write(content)
