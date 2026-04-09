const STEPS = [
  { key: 'connecting', label: 'Connecting to Google Drive' },
  { key: 'reading',    label: 'Reading folder contents' },
  { key: 'extracting', label: 'Extracting document text' },
  { key: 'analyzing',  label: 'Analyzing documents' },
  { key: 'saving',     label: 'Preparing your assistant' },
]

function parseStep(messages) {
  let currentStep = null
  let fileProgress = null

  for (const msg of messages) {
    if (!msg.startsWith('step:')) continue
    const parts = msg.split(':')
    currentStep = parts[1]
    if (parts[1] === 'extracting' && parts[2] && parts[3]) {
      fileProgress = { current: parseInt(parts[3]), total: parseInt(parts[2]) }
    }
  }

  return { currentStep, fileProgress }
}

function getStepState(stepKey, currentStep) {
  const currentIndex = STEPS.findIndex(s => s.key === currentStep)
  const stepIndex = STEPS.findIndex(s => s.key === stepKey)
  if (currentIndex === -1) return 'pending'
  if (stepIndex < currentIndex) return 'done'
  if (stepIndex === currentIndex) return 'active'
  return 'pending'
}

export default function ProgressStream({ messages, loading }) {
  const { currentStep, fileProgress } = parseStep(messages)

  return (
    <div className="py-1">
      <div className="space-y-3">
        {STEPS.map((step) => {
          const state = getStepState(step.key, currentStep)
          const isExtracting = step.key === 'extracting' && state === 'active' && fileProgress

          return (
            <div key={step.key} className="flex items-start gap-3">
              {/* Icon */}
              <div className="shrink-0 w-5 h-5 mt-0.5 flex items-center justify-center">
                {state === 'done' && (
                  <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {state === 'active' && (
                  <div className="w-4 h-4 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
                )}
                {state === 'pending' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#2e2e45] mt-0.5" />
                )}
              </div>

              {/* Label */}
              <div className="flex-1">
                <span className={`text-sm ${
                  state === 'done'   ? 'text-emerald-400' :
                  state === 'active' ? 'text-white font-medium' :
                  'text-[#55556a]'
                }`}>
                  {step.label}
                </span>

                {isExtracting && (
                  <div className="mt-1.5">
                    <div className="flex justify-between text-xs text-[#9090aa] mb-1">
                      <span>Processing files</span>
                      <span>{fileProgress.current} / {fileProgress.total}</span>
                    </div>
                    <div className="h-1 bg-[#2e2e45] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#7c3aed] rounded-full transition-all duration-300"
                        style={{ width: `${(fileProgress.current / fileProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {!currentStep && loading && (
        <div className="flex items-center gap-2 mt-2">
          <div className="w-4 h-4 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#9090aa]">Starting...</span>
        </div>
      )}
    </div>
  )
}
