content = open("app/page.tsx", encoding="utf-8").read()

content = content.replace(
    '<img src="/dashboard-example.png" alt="VectriOS Commercial Events dashboard" className="w-full rounded-xl" />',
    '<img src="/dashboard-example.png" alt="VectriOS Commercial Events dashboard" className="w-full rounded-xl" style={{objectFit: "cover", objectPosition: "top", maxHeight: "700px"}} />'
)
print("Done")
open("app/page.tsx", "w", encoding="utf-8").write(content)
