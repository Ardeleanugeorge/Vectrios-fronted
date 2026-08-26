path = r'C:\Users\George\Desktop\Vectrios-fronted-temp-push\Desktop\UNICORN\frontend\app\pricing\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

old = '  const [trialAlreadyUsed, setTrialAlreadyUsed] = useState(false)'

new = '''  const [trialAlreadyUsed, setTrialAlreadyUsed] = useState(false)

  useEffect(() => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    const companyId = localStorage.getItem("company_id") || sessionStorage.getItem("company_id")
    if (!token || !companyId) return
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/subscription/${companyId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.plan === null && data.billing_cycle === null) {
          setTrialAlreadyUsed(true)
        }
      })
      .catch(() => {})
  }, [])'''

if old in c:
    c = c.replace(old, new)
    print("Done")
else:
    print("NOT FOUND")

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
