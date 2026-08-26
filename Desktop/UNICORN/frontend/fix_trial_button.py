path = r'C:\Users\George\Desktop\Vectrios-fronted-temp-push\Desktop\UNICORN\frontend\app\pricing\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

old = '  const [activePlanFromQuery, setActivePlanFromQuery] = useState<string | null>(null)'

new = '''  const [activePlanFromQuery, setActivePlanFromQuery] = useState<string | null>(null)
  const [trialAlreadyUsed, setTrialAlreadyUsed] = useState(false)'''

if old in c:
    c = c.replace(old, new)
    print("State added")
else:
    print("State NOT FOUND")

# Ascundem butonul de trial daca trial e deja folosit
old2 = '''            <button
              onClick={handleTrial}
              disabled={isProcessing}
              className={`px-10 py-3 font-semibold rounded-lg transition ${
                isProcessing ? "bg-gray-700 text-gray-600 cursor-not-allowed" : "bg-cyan-500 hover:bg-cyan-400 text-black"
              }`}
            >
              Start 14-day free trial
            </button>'''

new2 = '''            {trialAlreadyUsed ? (
              <button
                onClick={() => { void handleSelectPlan("Scale") }}
                disabled={isProcessing}
                className={`px-10 py-3 font-semibold rounded-lg transition ${
                  isProcessing ? "bg-gray-700 text-gray-600 cursor-not-allowed" : "bg-cyan-500 hover:bg-cyan-400 text-black"
                }`}
              >
                Upgrade to Scale &mdash; $299/mo
              </button>
            ) : (
              <button
                onClick={handleTrial}
                disabled={isProcessing}
                className={`px-10 py-3 font-semibold rounded-lg transition ${
                  isProcessing ? "bg-gray-700 text-gray-600 cursor-not-allowed" : "bg-cyan-500 hover:bg-cyan-400 text-black"
                }`}
              >
                Start 14-day free trial
              </button>
            )}'''

if old2 in c:
    c = c.replace(old2, new2)
    print("Button replaced")
else:
    print("Button NOT FOUND")

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
