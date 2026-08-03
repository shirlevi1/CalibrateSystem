from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    Login,
    AdminMessageView,
    CurrentUserView,
    UsersView,
    UserDetailView,
    UserProfileView,
    UserProfileImageView,
    ChangePasswordView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    ProjectTrackingView,
    ProjectInspectorsView,
    NotificationsView,
    CSRFView,
    AcceptPrivacyPolicyView,
    PrivacyPolicyView,
    ArchivedUsersView,
    RestoreArchivedUserView,
    RestoreAllArchivedUsersView,
    ProjectsByUserEmailView,
    ProjectMissingDocumentsView,
    ProjectRequiredDocumentsView,
    ProjectLabTestsView,
    ExponetFileDownloadView,
    ExponetZipEntriesView,
    ExponetZipEntryDownloadView,
    ExponetTemplateFileDownloadView,
    ProjectCompletionDocumentsView,
    CompletionDocumentFileView,
    ImageUploadView,
    WorkEmphasesView,
    ChatbotQuestionsView,
    InformationGuideContentView,
)

api_prefix = settings.API_PREFIX

urlpatterns = [
    path("admin/", admin.site.urls),

    path(f"{api_prefix}csrf/", CSRFView.as_view(), name="csrf"),

    path(f"{api_prefix}login/", Login.as_view(), name="login"),
    path(
        f"{api_prefix}token/refresh/",
        TokenRefreshView.as_view(),
        name="token-refresh",
    ),

    path(f"{api_prefix}user/", CurrentUserView.as_view(), name="current-user"),
    path(f"{api_prefix}user/profile/", UserProfileView.as_view(), name="user-profile"),
    path(
        f"{api_prefix}user/profile-image/",
        UserProfileImageView.as_view(),
        name="user-profile-image",
    ),
    path(
        f"{api_prefix}user/change-password/",
        ChangePasswordView.as_view(),
        name="change-password",
    ),

    path(
        f"{api_prefix}password-reset/request/",
        PasswordResetRequestView.as_view(),
        name="password-reset-request",
    ),
    path(
        f"{api_prefix}password-reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),

    path(f"{api_prefix}users/", UsersView.as_view(), name="users"),
    path(f"{api_prefix}users/<int:pk>/", UserDetailView.as_view(), name="user-detail"),

    path(
        f"{api_prefix}users/archive/",
        ArchivedUsersView.as_view(),
        name="archived-users",
    ),
    path(
        f"{api_prefix}users/archive/restore-all/",
        RestoreAllArchivedUsersView.as_view(),
        name="restore-all-archived-users",
    ),
    path(
        f"{api_prefix}users/archive/<int:pk>/restore/",
        RestoreArchivedUserView.as_view(),
        name="restore-archived-user",
    ),

    path(
        f"{api_prefix}projects/by-email/",
        ProjectsByUserEmailView.as_view(),
        name="projects-by-email",
    ),
    path(
        f"{api_prefix}projects/<str:project_id>/tracking/",
        ProjectTrackingView.as_view(),
        name="project-tracking",
    ),
    path(
        f"{api_prefix}projects/<str:project_id>/inspectors/",
        ProjectInspectorsView.as_view(),
        name="project-inspectors",
    ),
    path(
        f"{api_prefix}projects/<str:project_id>/missing-documents/",
        ProjectMissingDocumentsView.as_view(),
        name="project-missing-documents",
    ),
    path(
        f"{api_prefix}projects/<str:project_id>/required-documents/",
        ProjectRequiredDocumentsView.as_view(),
        name="project-required-documents",
    ),
    path(
        f"{api_prefix}projects/<str:project_id>/lab-tests/",
        ProjectLabTestsView.as_view(),
        name="project-lab-tests",
    ),
    path(
        f"{api_prefix}projects/<str:project_id>/completion-documents/",
        ProjectCompletionDocumentsView.as_view(),
        name="project-completion-documents",
    ),

    path(
        f"{api_prefix}files/template/download/",
        ExponetTemplateFileDownloadView.as_view(),
        name="exponet-template-file-download",
    ),
    path(
        f"{api_prefix}files/<str:file_id>/zip-entries/",
        ExponetZipEntriesView.as_view(),
        name="exponet-zip-entries",
    ),
    path(
        f"{api_prefix}files/<str:file_id>/zip-entry/",
        ExponetZipEntryDownloadView.as_view(),
        name="exponet-zip-entry-download",
    ),
    path(
        f"{api_prefix}files/<str:file_id>/download/",
        ExponetFileDownloadView.as_view(),
        name="exponet-file-download",
    ),
    path(
        f"{api_prefix}completion-documents/files/<path:file_id>/",
        CompletionDocumentFileView.as_view(),
        name="completion-document-file",
    ),

    path(
        f"{api_prefix}notifications/<str:project_id>/",
        NotificationsView.as_view(),
        name="notifications",
    ),

    path(
        f"{api_prefix}privacy-policy/",
        PrivacyPolicyView.as_view(),
        name="privacy-policy",
    ),
    path(
        f"{api_prefix}privacy-policy/accept/",
        AcceptPrivacyPolicyView.as_view(),
        name="accept-privacy-policy",
    ),
    path(
        f"{api_prefix}user/accept-privacy-policy/",
        AcceptPrivacyPolicyView.as_view(),
        name="user-accept-privacy-policy",
    ),

    path(
        f"{api_prefix}admin-messages/",
        AdminMessageView.as_view(),
        name="admin-messages",
    ),
    path(
        f"{api_prefix}work-emphases/",
        WorkEmphasesView.as_view(),
        name="work-emphases",
    ),
    path(
        f"{api_prefix}chatbot-questions/",
        ChatbotQuestionsView.as_view(),
        name="chatbot-questions",
    ),
    path(
        f"{api_prefix}uploads/images/",
        ImageUploadView.as_view(),
        name="image-upload",
    ),
    path(
        f"{api_prefix}information-guides/<str:step>/",
        InformationGuideContentView.as_view(),
        name="information-guides",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
