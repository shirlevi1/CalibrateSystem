import {
    FileText,
    Users,
    Bell,
    BookOpen,
    Activity,
} from "lucide-react";

export const cardsByStep = {
    content_control: [
        { title: "מסמכי הפרויקט", icon: FileText, path: "/required-docs" },
        { title: "צוות מלווה", icon: Users, path: "/team" },
        { title: "מרכז התראות", icon: Bell, path: "/notifications" },
        { title: "מידע ומדריכים", icon: BookOpen, path: "/guide" },
    ],

    approval: [
        { title: "מסמכי הפרויקט", icon: FileText, path: "/required-docs" },
        { title: "צוות מלווה", icon: Users, path: "/team" },
        { title: "מרכז התראות", icon: Bell, path: "/notifications" },
        { title: "מידע ומדריכים", icon: BookOpen, path: "/guide" },
    ],

    execution: [
        { title: "מרכז התראות", icon: Bell, path: "/notifications" },
        { title: "תוכנית ביקורים", icon: Activity, path: "/arrival" },
        { title: "בדיקות מעבדה", icon: Activity, path: "/lab-tests" },
        { title: "מסמכי תעודת גמר", icon: FileText, path: "/completion-docs" },
        { title: "מידע ומדריכים", icon: BookOpen, path: "/guide" },
        { title: "דגשים לעבודה", icon: Activity, path: "/work-notes" },
    ],
};
