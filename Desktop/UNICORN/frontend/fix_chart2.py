file = r"components/dashboard/RiiTimelineChart.tsx"
with open(file, "r", encoding="utf-8") as f:
    content = f.read()

old = '<h2 className="text-xl font-bold mb-4 uppercase tracking-wide">Revenue Risk Trend (30 Days)</h2>'
new = '<div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Revenue Risk Trend</h2><div className="flex gap-1">{([{label:"30D",days:30},{label:"90D",days:90},{label:"6M",days:180},{label:"1Y",days:365},{label:"All",days:0}]).map(({label,days})=>(<button key={label} onClick={()=>setSelectedDays(days)} className={`px-2 py-1 text-xs rounded font-medium transition ${selectedDays===days?"bg-blue-600 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{label}</button>))}</div></div>'

if old in content:
    content = content.replace(old, new)
    print("Replaced OK")
else:
    print("NOT FOUND - checking variants")
    idx = content.find("Revenue Risk Trend")
    print(repr(content[idx-50:idx+100]))

with open(file, "w", encoding="utf-8") as f:
    f.write(content)
