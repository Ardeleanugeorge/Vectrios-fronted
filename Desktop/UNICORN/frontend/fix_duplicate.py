path = r'C:\Users\George\Desktop\Vectrios-fronted-temp-push\Desktop\UNICORN\frontend\app\pricing\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# Stergem a doua definitie duplicata
c = c.replace(
    '\n  const [trialAlreadyUsed, setTrialAlreadyUsed] = useState(false)\n\n  useEffect(() => {\n    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")\n    const companyId = localStorage.getItem("company_id") || sessionStorage.getItem("company_id")\n    if (!token || !companyId) return\n    fetch(`${process.env.NEXT_PUBLIC_API_URL}/subscription/${companyId}`, {\n      headers: { Authorization: `Bearer ${token}` }\n    })\n      .then(r => r.ok ? r.json() : null)\n      .then(data => {\n        if (data && data.plan === null && data.billing_cycle === null) {\n          setTrialAlreadyUsed(true)\n        }\n      })\n      .catch(() => {})\n  }, [])\n  const [trialAlreadyUsed, setTrialAlreadyUsed] = useState(false)',
    '\n  const [trialAlreadyUsed, setTrialAlreadyUsed] = useState(false)\n\n  useEffect(() => {\n    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")\n    const companyId = localStorage.getItem("company_id") || sessionStorage.getItem("company_id")\n    if (!token || !companyId) return\n    fetch(`${process.env.NEXT_PUBLIC_API_URL}/subscription/${companyId}`, {\n      headers: { Authorization: `Bearer ${token}` }\n    })\n      .then(r => r.ok ? r.json() : null)\n      .then(data => {\n        if (data && data.plan === null && data.billing_cycle === null) {\n          setTrialAlreadyUsed(true)\n        }\n      })\n      .catch(() => {})\n  }, [])'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print("Done")
