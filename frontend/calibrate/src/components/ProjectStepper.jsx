import "./ProjectStepper.css";
import { Lock } from "lucide-react";
import { PROJECT_STEPS, PROJECT_STEP_LABELS } from "./ProjectWorkflow.js";

export default function ProjectStepper({
    currentStep,
    maxAllowedStepIndex,
    onStepClick,
}) {
    const currentIndex = PROJECT_STEPS.indexOf(currentStep);

    return (
        <div className="stepper-page">
            <div className="stepper">
                {PROJECT_STEPS.map((step, index) => {
                    const isDone = index < currentIndex;
                    const isActive = index === currentIndex;
                    const isLocked = index > maxAllowedStepIndex;

                    return (
                        <div key={step} className="step-wrapper">
                            <div
                                className={`step${isLocked ? " disabled" : ""}`}
                                onClick={() => {
                                    if (!isLocked) {
                                        onStepClick(step);
                                    }
                                }}
                                aria-disabled={isLocked}
                                role="button"
                                tabIndex={isLocked ? -1 : 0}
                                onKeyDown={(event) => {
                                    if (
                                        !isLocked &&
                                        (event.key === "Enter" || event.key === " ")
                                    ) {
                                        event.preventDefault();
                                        onStepClick(step);
                                    }
                                }}
                            >
                                <div
                                    className={[
                                        "circle",
                                        isDone && "done",
                                        isActive && "active",
                                    ]
                                        .filter(Boolean)
                                        .join(" ")}
                                >
                                    {isLocked ? <Lock size={18} /> : index + 1}
                                </div>

                                <div
                                    className={[
                                        "label",
                                        isDone && "done",
                                        isActive && "active",
                                    ]
                                        .filter(Boolean)
                                        .join(" ")}
                                >
                                    {PROJECT_STEP_LABELS[step]}
                                </div>
                            </div>

                            {index !== PROJECT_STEPS.length - 1 && (
                                <div className="line-wrapper">
                                    <div
                                        className={[
                                            "line",
                                            index < currentIndex && "filled",
                                        ]
                                            .filter(Boolean)
                                            .join(" ")}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
