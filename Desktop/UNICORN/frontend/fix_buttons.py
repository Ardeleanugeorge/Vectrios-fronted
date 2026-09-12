file = r"components/dashboard/RiiTimelineChart.tsx"
with open(file, "r", encoding="utf-8") as f:
    content = f.read()

old = '>Revenue Risk Trend</h2>'
new = '>Revenue Risk Trend</h2><div style={{display:"flex",gap:"4px"}}>{[["30D",30],["90D",90],["6M",180],["1Y",365],["All",0]].map(([label,v])=><button key={label} onClick={()=>setSelectedDays(Number(v))} style={{padding:"2px 8px",fontSize:"11px",borderRadius:"4px",border:"none",cursor:"pointer",background:selectedDays===Number(v)?"#2563eb":"#f3f4f6",color:selectedDays===Number(v)?"white":"#4b5563"}}>{label}</button>)}'

if old in content:
    content = content.replace(old, new, 1)
    print("Replaced OK")
else:
    print("NOT FOUND")

with open(file, "w", encoding="utf-8") as f:
    f.write(content)
