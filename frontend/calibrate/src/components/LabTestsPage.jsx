import { useEffect, useMemo, useState } from "react";
import {
    FlaskConical,
    FileText,
    ExternalLink,
    AlertTriangle,
} from "lucide-react";
import { getProjectLabTests } from "../../api/api.js";
import LoadingSpinner from "./LoadingSpinner";
import "./LabTestsPage.css";

const normalizeLabTests = (data) => {
    const rawTests =
        data?.tests ||
        data?.lab_tests ||
        data?.labTests ||
        (Array.isArray(data?.documents) && data.documents.length
            ? [
                {
                    id: "project-lab-tests",
                    title: "בדיקות מעבדה לא תקינות",
                    description:
                        "קיימים מסמכי בדיקות מעבדה לא תקינות עבור פרויקט זה",
                    status: "דורש טיפול",
                    documents: data.documents,
                },
            ]
            : null) ||
        data?.files ||
        [];

    if (!Array.isArray(rawTests)) {
        return [];
    }

    return rawTests.map((test, index) => {
        const documents =
            test.documents ||
            test.files ||
            test.assets ||
            [];

        return {
            id: test.id || test.asset_id || `lab-test-${index}`,
            title:
                test.title ||
                test.name ||
                test.file_name ||
                "בדיקת מעבדה לא תקינה",
            description:
                test.description ||
                test.text ||
                "קיים מסמך בדיקת מעבדה לא תקינה עבור פרויקט זה",
            sampleDate:
                test.sampleDate ||
                test.sample_date ||
                test.created_at ||
                test.updated_at ||
                "",
            status:
                test.status ||
                "דורש טיפול",
            documents: Array.isArray(documents)
                ? documents.map((document, documentIndex) => ({
                    id:
                        document.id ||
                        document.asset_id ||
                        `document-${index}-${documentIndex}`,
                    name:
                        document.name ||
                        document.file_name ||
                        document.title ||
                        "מסמך בדיקת מעבדה",
                    url:
                        document.url ||
                        document.public_url ||
                        document.download_url ||
                        "",
                    fileExtension:
                        document.file_extension ||
                        document.extension ||
                        "",
                }))
                : [],
        };
    });
};

const LabTestsPage = ({ projectId }) => {
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const hasTests = useMemo(() => tests.length > 0, [tests]);

    useEffect(() => {
        const loadLabTests = async () => {
            if (!projectId) {
                setTests([]);
                setError("");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError("");

                const data = await getProjectLabTests(projectId);
                const normalizedTests = normalizeLabTests(data);

                setTests(normalizedTests);
            } catch (err) {
                console.error("Failed to load project laboratory tests:", err);
                setTests([]);
                setError("לא ניתן לטעון את בדיקות המעבדה של הפרויקט");
            } finally {
                setLoading(false);
            }
        };

        loadLabTests();
    }, [projectId]);

    return (
        <main className="lab-tests-page" dir="rtl">
            <section className="lab-tests-container">
                <div className="lab-tests-hero">
                    <div className="lab-tests-hero-icon">
                        <FlaskConical size={30} />
                    </div>

                    <div className="lab-tests-hero-text">
                        <h1>בדיקות מעבדה לא תקינות</h1>
                        <p>
                            מסמכי בדיקות מעבדה לא תקינות שנבחרו לפי הפרויקט הנבחר
                        </p>
                    </div>
                </div>

                {loading ? (
                    <LoadingSpinner text="טוען בדיקות מעבדה..." />
                ) : !projectId ? (
                    <div className="lab-tests-empty">
                        לא נמצא מזהה פרויקט להצגת בדיקות מעבדה
                    </div>
                ) : error ? (
                    <div className="lab-tests-empty error">
                        <AlertTriangle size={24} />
                        {error}
                    </div>
                ) : !hasTests ? (
                    <div className="lab-tests-empty">
                        אין בדיקות מעבדה חריגות לפרויקט זה
                    </div>
                ) : (
                    <div className="lab-tests-list">
                        {tests.map((test) => (
                            <article className="lab-test-card" key={test.id}>
                                <div className="lab-test-header">
                                    <div className="lab-test-icon">
                                        <FlaskConical size={26} />
                                    </div>

                                    <div className="lab-test-content">
                                        <h2>{test.title}</h2>

                                        <p>{test.description}</p>

                                        {test.sampleDate && (
                                            <span>
                                                תאריך עדכון: {test.sampleDate}
                                            </span>
                                        )}
                                    </div>

                                    <span className="lab-test-status">
                                        {test.status}
                                    </span>
                                </div>

                                {test.documents.length > 0 ? (
                                    <div className="lab-test-documents">
                                        {test.documents.map((document) => (
                                            <a
                                                key={document.id}
                                                href={document.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="lab-test-document-link"
                                            >
                                                <FileText size={18} />

                                                <span>
                                                    {document.name}
                                                    {document.fileExtension
                                                        ? `.${document.fileExtension}`
                                                        : ""}
                                                </span>

                                                <ExternalLink size={16} />
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="lab-test-no-documents">
                                        לא נמצאו קישורים למסמכים עבור בדיקה זו
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
};

export default LabTestsPage;
