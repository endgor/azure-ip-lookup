/**
 * Step indicator component for the RBAC calculator wizard
 * Shows current step and allows navigation between completed steps
 */

import { memo } from 'react';

export type Step = 'provider' | 'resource' | 'actions' | 'results';

interface StepIndicatorProps {
  currentStep: Step;
  completedSteps: Set<Step>;
  onStepClick: (step: Step) => void;
}

const STEPS: { id: Step; label: string; number: number }[] = [
  { id: 'provider', label: 'Provider', number: 1 },
  { id: 'resource', label: 'Resource', number: 2 },
  { id: 'actions', label: 'Actions', number: 3 },
  { id: 'results', label: 'Results', number: 4 },
];

const StepIndicator = memo(function StepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
}: StepIndicatorProps) {
  const getCurrentStepIndex = () => {
    return STEPS.findIndex((step) => step.id === currentStep);
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="mb-8">
      <nav aria-label="Progress">
        <ol className="flex items-center justify-center gap-2 md:gap-4">
          {STEPS.map((step, index) => {
            const isCompleted = completedSteps.has(step.id);
            const isCurrent = step.id === currentStep;
            const isClickable = isCompleted && !isCurrent;

            return (
              <li key={step.id} className="flex items-center">
                {/* Step circle and label */}
                <button
                  onClick={() => isClickable && onStepClick(step.id)}
                  disabled={!isClickable}
                  className={`flex items-center gap-2 transition ${
                    isClickable ? 'cursor-pointer hover:opacity-80' : ''
                  } ${!isClickable && !isCurrent ? 'cursor-default' : ''}`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition md:h-10 md:w-10 md:text-base ${
                      isCurrent
                        ? 'border-sky-500 bg-sky-500 text-white dark:border-sky-400 dark:bg-sky-400 dark:text-slate-900'
                        : isCompleted
                          ? 'border-sky-500 bg-white text-sky-600 dark:border-sky-400 dark:bg-slate-900 dark:text-sky-300'
                          : 'border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-500'
                    }`}
                  >
                    {isCompleted && !isCurrent ? (
                      <svg
                        className="h-5 w-5 md:h-6 md:w-6"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      step.number
                    )}
                  </div>
                  <span
                    className={`hidden text-sm font-medium sm:inline md:text-base ${
                      isCurrent
                        ? 'text-slate-900 dark:text-slate-100'
                        : isCompleted
                          ? 'text-sky-600 dark:text-sky-300'
                          : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </button>

                {/* Connector line */}
                {index < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 w-8 transition md:mx-4 md:w-12 ${
                      index < currentStepIndex
                        ? 'bg-sky-500 dark:bg-sky-400'
                        : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
});

export default StepIndicator;
