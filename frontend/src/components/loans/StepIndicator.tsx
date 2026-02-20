import React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
    id: number
    name: string
}

interface StepIndicatorProps {
    steps: Step[]
    currentStep: number
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentStep }) => {
    return (
        <div className="flex items-center justify-between w-full max-w-2xl mx-auto mb-12">
            {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                    {/* Step Item */}
                    <div className="flex flex-col items-center relative gap-2">
                        <div
                            className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 border-2 z-10 bg-white",
                                currentStep > step.id ? "bg-primary border-primary text-white" :
                                    currentStep === step.id ? "border-primary text-primary ring-4 ring-blue-50" :
                                        "border-gray-200 text-gray-400"
                            )}
                        >
                            {currentStep > step.id ? <Check size={18} /> : step.id}
                        </div>
                        <span
                            className={cn(
                                "text-xs font-bold whitespace-nowrap uppercase tracking-wider",
                                currentStep >= step.id ? "text-primary" : "text-gray-400"
                            )}
                        >
                            {step.name}
                        </span>
                    </div>

                    {/* Connector Line */}
                    {index < steps.length - 1 && (
                        <div className="flex-1 h-[2px] bg-gray-100 mx-2 -mt-6">
                            <div
                                className="h-full bg-primary transition-all duration-500"
                                style={{ width: currentStep > step.id ? '100%' : '0%' }}
                            />
                        </div>
                    )}
                </React.Fragment>
            ))}
        </div>
    )
}
