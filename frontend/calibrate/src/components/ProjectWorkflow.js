export const PROJECT_STEPS = ["content_control", "approval", "execution"];

export const PROJECT_STEP_LABELS = {
    content_control: "בקרת תכן",
    approval: "אישור תחילת עבודה",
    execution: "בקרת ביצוע",
};

function getDisplayValue(value) {
    return (
        value && typeof value === "object"
            ? value.display_value || value.label || value.text || ""
            : value || ""
    );
}

function getSerializedDisplayValue(value) {
    if (!value || typeof value !== "string") {
        return "";
    }

    try {
        const parsedValue = JSON.parse(value);
        return getDisplayValue(parsedValue);
    } catch {
        return value;
    }
}

function normalizeStageValue(value) {
    const displayValue = getDisplayValue(value);

    return String(displayValue || "")
        .trim()
        .toLowerCase()
        .replace(/[-\s]+/g, "_");
}

function getColumnStageValues(column) {
    return [
        column?.display_value,
        column?.label,
        column?.text,
        getSerializedDisplayValue(column?.value),
    ].filter(Boolean);
}

function isStageColumn(column) {
    const title = normalizeStageValue(column?.column?.title);

    return (
        column?.id === "color_mm1grhfm" ||
        title.includes("סוג_בקרה") ||
        title.includes("control_type") ||
        title.includes("control_stage") ||
        title.includes("workflow_stage")
    );
}

function getEntityColumnStageValues(entity) {
    return (entity?.column_values || [])
        .filter(isStageColumn)
        .flatMap(getColumnStageValues);
}

function getProjectColumnValue(project, columnId, columnTitle) {
    const normalizedTitle = normalizeStageValue(columnTitle);
    const column = project?.column_values?.find((item) => {
        const title = normalizeStageValue(item?.column?.title);
        return item?.id === columnId || title === normalizedTitle;
    });

    return getColumnStageValues(column)[0] || "";
}

export function getProjectControlTypeLabel(project) {
    const value =
        project?.control_type ||
        project?.project_control_type ||
        project?.controlType ||
        project?.["סוג בקרה"] ||
        getProjectColumnValue(project, "color_mm1grhfm", "סוג בקרה");
    const normalizedValue = normalizeStageValue(value);

    if (normalizedValue === "ביצוע" || normalizedValue.includes("בקרת_ביצוע")) {
        return "ביצוע";
    }

    if (
        normalizedValue === "תכן" ||
        normalizedValue === "תכנון" ||
        normalizedValue.includes("בקרת_תכן")
    ) {
        return "תכן";
    }

    return String(getDisplayValue(value)).trim();
}

export function getProjectControlStageValues(project) {
    const projectValues = [
        project?.control_type,
        project?.project_control_type,
        project?.controlType,
        project?.["סוג בקרה"],
        getProjectColumnValue(project, "color_mm1grhfm", "סוג בקרה"),
        project?.control_stage,
        project?.project_control_stage,
        project?.workflow_stage,
        project?.workflowStage,
        ...getEntityColumnStageValues(project),
    ];
    const subitemValues = (project?.subitems || []).flatMap((subitem) => [
        subitem?.control_type,
        subitem?.project_control_type,
        subitem?.controlType,
        subitem?.control_stage,
        subitem?.project_control_stage,
        subitem?.workflow_stage,
        subitem?.workflowStage,
        subitem?.name,
        ...getEntityColumnStageValues(subitem),
    ]);

    return [...projectValues, ...subitemValues].filter(Boolean);
}

function getStageIndex(value) {
    const stage = normalizeStageValue(value);

    if (
        stage.includes("בקרת_ביצוע") ||
        stage === "ביצוע" ||
        stage.endsWith("_ביצוע") ||
        stage.includes("execution")
    ) {
        return 2;
    }

    if (
        stage.includes("אישור_תחילת_עבודה") ||
        stage === "approval" ||
        stage === "work_start_approval"
    ) {
        return 1;
    }

    if (
        stage.includes("בקרת_תכן") ||
        stage.includes("בקרת_תוכן") ||
        stage === "תכן" ||
        stage === "תכנון" ||
        stage.endsWith("_תכן") ||
        stage.endsWith("_תכנון") ||
        stage === "content_control"
    ) {
        return 0;
    }

    return null;
}

export function getMaxAllowedStepIndex(project) {
    const recognizedIndexes = getProjectControlStageValues(project)
        .map(getStageIndex)
        .filter((index) => index !== null);

    return recognizedIndexes.length ? Math.max(...recognizedIndexes) : 0;
}

export function getHighestAllowedStep(project) {
    return PROJECT_STEPS[getMaxAllowedStepIndex(project)];
}

export function isProjectStepAllowed(project, step) {
    const stepIndex = PROJECT_STEPS.indexOf(step);
    return stepIndex >= 0 && stepIndex <= getMaxAllowedStepIndex(project);
}
