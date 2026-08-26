path = r'C:\Users\George\Desktop\Vectrios-fronted-temp-push\Desktop\UNICORN\frontend\app\dashboard\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

idx = c.find('href="/pricing?from=trial_expired"')
if idx > 0:
    # gasim tag-ul <a complet
    start = c.rfind('<a ', 0, idx)
    end = c.find('</a>', idx) + 4
    old = c[start:end]
    print("Found:", repr(old))
    
    new = '''<button
                onClick={async () => {
                  const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
                  const companyId = localStorage.getItem("company_id") || sessionStorage.getItem("company_id")
                  if (!token || !companyId) { window.location.href = "/login"; return; }
                  try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/create-checkout-session`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ company_id: companyId, billing_cycle: "monthly" })
                    })
                    const data = await res.json()
                    if (data?.checkout_url) { window.location.href = data.checkout_url; }
                    else { window.location.href = "/pricing"; }
                  } catch { window.location.href = "/pricing"; }
                }}
                className="inline-block px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl transition"
              >
                Upgrade to Scale — $299/mo →
              </button>'''
    
    c = c[:start] + new + c[end:]
    print("Replaced OK")
else:
    print("NOT FOUND")

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
