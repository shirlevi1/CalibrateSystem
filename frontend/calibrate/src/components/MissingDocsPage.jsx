import ProjectRequiredDocuments from "./ProjectRequiredDocuments.jsx";

function MissingDocsPage({ projectId, selectedProject, currentStep }) {
    return (
        <ProjectRequiredDocuments
            projectId={projectId}
            selectedProject={selectedProject}
            initialFilter="missing"
            currentStep={currentStep}
        />
    );
}

export default MissingDocsPage;
