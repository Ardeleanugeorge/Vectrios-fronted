path = r'C:\Users\George\Desktop\Vectrios-fronted-temp-push\Desktop\UNICORN\frontend\app\login\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace(
    '        localStorage.setItem("user_data", ud)\n        sessionStorage.setItem("user_data", ud)',
    '''        localStorage.setItem("user_data", ud)
        sessionStorage.setItem("user_data", ud)
        // Enterprise: existing user (has company_id from server) -> clear anonymous scan data
        // New user (no company_id) -> keep scan_data for onboarding flow
        if (data.company_id) {
          sessionStorage.removeItem("scan_data")
          localStorage.removeItem("scan_data")
          sessionStorage.removeItem("diagnostic_result_full")
          localStorage.removeItem("diagnostic_result_full")
          sessionStorage.removeItem("diagnostic_result")
          localStorage.removeItem("diagnostic_result")
          sessionStorage.removeItem("diagnostic_result_partial")
          localStorage.removeItem("diagnostic_result_partial")
        }'''
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print('Done')
