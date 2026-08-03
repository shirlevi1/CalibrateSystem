const API_ROUTES = {
    LOGIN: "/api/login/",
    USER: "/api/user/",
    PROFILE: "/api/user/profile/",
    PROFILE_IMAGE: "/api/user/profile-image/",
    CHANGE_PASSWORD: "/api/user/change-password/",
    PASSWORD_RESET_REQUEST: "/api/password-reset/request/",
    PASSWORD_RESET_CONFIRM: "/api/password-reset/confirm/",
    REFRESH: "/api/token/refresh/",
    USERS: "/api/users/",
    ARCHIVED_USERS: "/api/users/archive/",
    RESTORE_ALL_ARCHIVED_USERS: "/api/users/archive/restore-all/",

    PROJECTS_BY_EMAIL: "/api/projects/by-email/",
    PROJECTS: "/api/projects/",

    FILES: "/api/files/",
    COMPLETION_DOCUMENT_FILES: "/api/completion-documents/files/",

    NOTIFICATIONS: "/api/notifications/",
    PRIVACY_POLICY: "/api/privacy-policy/",
    ACCEPT_PRIVACY_POLICY: "/api/user/accept-privacy-policy/",
    ADMIN_MESSAGES: "/api/admin-messages/",
    WORK_EMPHASES: "/api/work-emphases/",
    CHATBOT_QUESTIONS: "/api/chatbot-questions/",
    IMAGE_UPLOADS: "/api/uploads/images/",
    INFORMATION_GUIDES: "/api/information-guides/",
    LOGOUT: "/api/logout/",
};

export class ApiError extends Error {
    constructor(message, status, data = null) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.data = data;
    }
}

function dispatchApiError(error) {
    window.dispatchEvent(
        new CustomEvent("api-error", {
            detail: {
                status: error.status || 500,
                message: error.message || "Request failed",
                data: error.data || null,
            },
        })
    );
}

function getCSRFToken() {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : null;
}

function clearLocalAuth() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("selectedProject");
    localStorage.removeItem("selectedProjectId");
    localStorage.removeItem("selectedExponetProjectId");
}

async function request(endpoint, options = {}, retry = true) {
    const token = localStorage.getItem("accessToken");
    const method = options.method || "GET";

    const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    };

    const csrfToken = getCSRFToken();

    if (csrfToken && method !== "GET") {
        headers["X-CSRFToken"] = csrfToken;
    }

    const response = await fetch(endpoint, {
        ...options,
        credentials: "include",
        headers,
    });

    let data;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (response.status === 401 && retry && localStorage.getItem("refreshToken")) {
        try {
            await refreshAccessToken();
            return request(endpoint, options, false);
        } catch (error) {
            clearLocalAuth();
            dispatchApiError(error);
            throw error;
        }
    }

    if (!response.ok) {
        const error = new ApiError(
            data?.message ||
            data?.detail ||
            data?.error ||
            "Request failed",
            response.status,
            data
        );

        dispatchApiError(error);
        throw error;
    }

    return data;
}

async function uploadRequest(endpoint, formData, retry = true) {
    const token = localStorage.getItem("accessToken");

    const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const csrfToken = getCSRFToken();

    if (csrfToken) {
        headers["X-CSRFToken"] = csrfToken;
    }

    const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers,
        body: formData,
    });

    let data;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (response.status === 401 && retry && localStorage.getItem("refreshToken")) {
        try {
            await refreshAccessToken();
            return uploadRequest(endpoint, formData, false);
        } catch (error) {
            clearLocalAuth();
            dispatchApiError(error);
            throw error;
        }
    }

    if (!response.ok) {
        const error = new ApiError(
            data?.message ||
            data?.detail ||
            data?.error ||
            "Upload failed",
            response.status,
            data
        );

        dispatchApiError(error);
        throw error;
    }

    return data;
}

export async function loginUser(email, password) {
    const data = await request(API_ROUTES.LOGIN, {
        method: "POST",
        body: JSON.stringify({
            email,
            password,
        }),
    });

    if (data?.password_change_required) {
        clearLocalAuth();
        return data;
    }

    if (data?.access) {
        localStorage.setItem("accessToken", data.access);
    }

    if (data?.refresh) {
        localStorage.setItem("refreshToken", data.refresh);
    }

    if (data?.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
    }

    return data;
}

export async function getCurrentUser() {
    return request(API_ROUTES.USER, {
        method: "GET",
    });
}

export async function getUserProfile() {
    return request(API_ROUTES.PROFILE, {
        method: "GET",
    });
}

export async function updateProfileImage(imageUrl) {
    return request(API_ROUTES.PROFILE_IMAGE, {
        method: "PATCH",
        body: JSON.stringify({
            image_url: imageUrl,
        }),
    });
}

export async function changePassword(newPassword) {
    return request(API_ROUTES.CHANGE_PASSWORD, {
        method: "POST",
        body: JSON.stringify({
            new_password: newPassword,
        }),
    });
}

export async function requestPasswordReset(email) {
    return request(
        API_ROUTES.PASSWORD_RESET_REQUEST,
        {
            method: "POST",
            body: JSON.stringify({
                email,
            }),
        },
        false
    );
}

export async function confirmPasswordReset({
                                               uid,
                                               token,
                                               newPassword,
                                               confirmPassword,
                                           }) {
    return request(
        API_ROUTES.PASSWORD_RESET_CONFIRM,
        {
            method: "POST",
            body: JSON.stringify({
                uid,
                token,
                new_password: newPassword,
                confirm_password: confirmPassword,
            }),
        },
        false
    );
}

export async function refreshAccessToken() {
    const refresh = localStorage.getItem("refreshToken");

    if (!refresh) {
        clearLocalAuth();
        throw new ApiError("No refresh token", 401);
    }

    const response = await fetch(API_ROUTES.REFRESH, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            refresh,
        }),
    });

    let data;

    try {
        data = await response.json();
    } catch {
        throw new ApiError("Invalid refresh response", response.status || 500);
    }

    if (!response.ok) {
        clearLocalAuth();

        throw new ApiError(
            data?.message || data?.detail || data?.error || "Refresh failed",
            response.status,
            data
        );
    }

    if (data?.access) {
        localStorage.setItem("accessToken", data.access);
    }

    return data;
}

export async function logoutUser() {
    try {
        await request(
            API_ROUTES.LOGOUT,
            {
                method: "POST",
            },
            false
        );
    } catch {
        // Logout still clears local auth even if the server session is already gone.
    } finally {
        clearLocalAuth();
    }
}

export async function getUsers() {
    return request(API_ROUTES.USERS, {
        method: "GET",
    });
}

export async function createUser(userData) {
    return request(API_ROUTES.USERS, {
        method: "POST",
        body: JSON.stringify(userData),
    });
}

export async function updateUser(userId, userData) {
    return request(`${API_ROUTES.USERS}${userId}/`, {
        method: "PATCH",
        body: JSON.stringify(userData),
    });
}

export async function deleteUser(userId) {
    return request(`${API_ROUTES.USERS}${userId}/`, {
        method: "DELETE",
    });
}

export async function getArchivedUsers() {
    return request(API_ROUTES.ARCHIVED_USERS, {
        method: "GET",
    });
}

export async function restoreArchivedUser(archivedUserId) {
    return request(`${API_ROUTES.ARCHIVED_USERS}${archivedUserId}/restore/`, {
        method: "POST",
    });
}

export async function restoreAllArchivedUsers() {
    return request(API_ROUTES.RESTORE_ALL_ARCHIVED_USERS, {
        method: "POST",
    });
}

export async function getProjectsByUserEmail(email = "") {
    const trimmedEmail = String(email || "").trim();

    const endpoint = trimmedEmail
        ? `${API_ROUTES.PROJECTS_BY_EMAIL}?email=${encodeURIComponent(trimmedEmail)}`
        : API_ROUTES.PROJECTS_BY_EMAIL;

    return request(endpoint, {
        method: "GET",
    });
}

export async function getProjectTracking(projectId) {
    return request(`${API_ROUTES.PROJECTS}${projectId}/tracking/`, {
        method: "GET",
    });
}

export async function getProjectInspectors(projectId) {
    return request(`${API_ROUTES.PROJECTS}${projectId}/inspectors/`, {
        method: "GET",
    });
}

export async function getProjectMissingDocuments(projectId) {
    return request(`${API_ROUTES.PROJECTS}${projectId}/missing-documents/`, {
        method: "GET",
    });
}

export async function getProjectRequiredDocuments(projectId, options = {}) {
    const query = new URLSearchParams();

    if (options.stage) {
        query.set("stage", options.stage);
    }

    const queryString = query.toString();
    const endpoint = `${API_ROUTES.PROJECTS}${projectId}/required-documents/${
        queryString ? `?${queryString}` : ""
    }`;

    return request(endpoint, {
        method: "GET",
    });
}

export async function getProjectCompletionDocuments(projectId) {
    return request(`${API_ROUTES.PROJECTS}${projectId}/completion-documents/`, {
        method: "GET",
    });
}

export async function getProjectLabTests(projectId) {
    return request(`${API_ROUTES.PROJECTS}${projectId}/lab-tests/`, {
        method: "GET",
    });
}

export async function getExponetFileBlob(
    fileId,
    fileName,
    disposition = "inline",
    retry = true
) {
    const token = localStorage.getItem("accessToken");

    const query = new URLSearchParams({
        disposition,
        filename: fileName || `file-${fileId}`,
    });

    const response = await fetch(
        `${API_ROUTES.FILES}${fileId}/download/?${query.toString()}`,
        {
            method: "GET",
            credentials: "include",
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        }
    );

    if (response.status === 401 && retry && localStorage.getItem("refreshToken")) {
        try {
            await refreshAccessToken();
            return getExponetFileBlob(fileId, fileName, disposition, false);
        } catch (error) {
            clearLocalAuth();
            dispatchApiError(error);
            throw error;
        }
    }

    if (!response.ok) {
        const error = new ApiError("Failed to load file", response.status);
        dispatchApiError(error);
        throw error;
    }

    return response.blob();
}

export async function getExponetZipEntries(fileId, retry = true) {
    const token = localStorage.getItem("accessToken");

    const response = await fetch(`${API_ROUTES.FILES}${fileId}/zip-entries/`, {
        method: "GET",
        credentials: "include",
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    if (response.status === 401 && retry && localStorage.getItem("refreshToken")) {
        try {
            await refreshAccessToken();
            return getExponetZipEntries(fileId, false);
        } catch (error) {
            clearLocalAuth();
            dispatchApiError(error);
            throw error;
        }
    }

    if (!response.ok) {
        const error = new ApiError("Failed to load ZIP entries", response.status);
        dispatchApiError(error);
        throw error;
    }

    return response.json();
}

export async function getExponetZipEntryBlob(
    fileId,
    entryName,
    retry = true
) {
    const token = localStorage.getItem("accessToken");
    const query = new URLSearchParams({ entry: entryName });

    const response = await fetch(
        `${API_ROUTES.FILES}${fileId}/zip-entry/?${query.toString()}`,
        {
            method: "GET",
            credentials: "include",
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        }
    );

    if (response.status === 401 && retry && localStorage.getItem("refreshToken")) {
        try {
            await refreshAccessToken();
            return getExponetZipEntryBlob(fileId, entryName, false);
        } catch (error) {
            clearLocalAuth();
            dispatchApiError(error);
            throw error;
        }
    }

    if (!response.ok) {
        const error = new ApiError("Failed to download ZIP entry", response.status);
        dispatchApiError(error);
        throw error;
    }

    return response.blob();
}

export async function getExponetTemplateFileBlob(
    { fileId, fileUrl, fileName },
    retry = true
) {
    const token = localStorage.getItem("accessToken");
    const csrfToken = getCSRFToken();

    const response = await fetch(`${API_ROUTES.FILES}template/download/`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
        },
        body: JSON.stringify({
            file_id: fileId || null,
            file_url: fileUrl || null,
            filename: fileName || "template-file",
        }),
    });

    if (response.status === 401 && retry && localStorage.getItem("refreshToken")) {
        try {
            await refreshAccessToken();
            return getExponetTemplateFileBlob({ fileId, fileUrl, fileName }, false);
        } catch (error) {
            clearLocalAuth();
            dispatchApiError(error);
            throw error;
        }
    }

    if (!response.ok) {
        const error = new ApiError("Failed to download template file", response.status);
        dispatchApiError(error);
        throw error;
    }

    return response.blob();
}

export async function getCompletionDocumentFileBlob(
    fileId,
    fileName,
    disposition = "inline",
    retry = true
) {
    const token = localStorage.getItem("accessToken");

    const query = new URLSearchParams({
        disposition,
        filename: fileName || fileId,
    });

    const response = await fetch(
        `${API_ROUTES.COMPLETION_DOCUMENT_FILES}${encodeURIComponent(fileId)}/?${query.toString()}`,
        {
            method: "GET",
            credentials: "include",
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        }
    );

    if (response.status === 401 && retry && localStorage.getItem("refreshToken")) {
        try {
            await refreshAccessToken();

            return getCompletionDocumentFileBlob(
                fileId,
                fileName,
                disposition,
                false
            );
        } catch (error) {
            clearLocalAuth();
            dispatchApiError(error);
            throw error;
        }
    }

    if (!response.ok) {
        const error = new ApiError(
            "Failed to load completion document file",
            response.status
        );

        dispatchApiError(error);
        throw error;
    }

    return response.blob();
}

export async function getProjectNotifications(projectId, options = {}) {
    const query = new URLSearchParams();

    if (options.stage) {
        query.set("stage", options.stage);
    }

    const queryString = query.toString();
    const endpoint = `${API_ROUTES.NOTIFICATIONS}${projectId}/${
        queryString ? `?${queryString}` : ""
    }`;

    return request(endpoint, {
        method: "GET",
    });
}

export async function getPrivacyPolicy(retry = true) {
    const token = localStorage.getItem("accessToken");

    const response = await fetch(API_ROUTES.PRIVACY_POLICY, {
        method: "GET",
        credentials: "include",
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    if (response.status === 401 && retry && localStorage.getItem("refreshToken")) {
        try {
            await refreshAccessToken();
            return getPrivacyPolicy(false);
        } catch (error) {
            clearLocalAuth();
            dispatchApiError(error);
            throw error;
        }
    }

    if (!response.ok) {
        const text = await response.text();

        throw new ApiError(
            `Failed to load privacy policy: ${text || response.statusText}`,
            response.status,
            text
        );
    }

    return response.blob();
}

export function acceptPrivacyPolicy() {
    return request(API_ROUTES.ACCEPT_PRIVACY_POLICY, {
        method: "POST",
    });
}

export async function sendAdminMessage(message, projectId = null) {
    return request(API_ROUTES.ADMIN_MESSAGES, {
        method: "POST",
        body: JSON.stringify({
            message,
            project_id: projectId,
        }),
    });
}

export async function getWorkEmphases() {
    return request(API_ROUTES.WORK_EMPHASES, {
        method: "GET",
    });
}

export async function updateWorkEmphases(items) {
    return request(API_ROUTES.WORK_EMPHASES, {
        method: "PATCH",
        body: JSON.stringify({
            items,
        }),
    });
}

export async function getChatbotQuestions() {
    return request(API_ROUTES.CHATBOT_QUESTIONS, {
        method: "GET",
    });
}

export async function updateChatbotQuestions(items) {
    return request(API_ROUTES.CHATBOT_QUESTIONS, {
        method: "PATCH",
        body: JSON.stringify({
            items,
        }),
    });
}

export async function getInformationGuideContent(step) {
    return request(`${API_ROUTES.INFORMATION_GUIDES}${step}/`, {
        method: "GET",
    });
}

export async function updateInformationGuideContent(step, contentData) {
    return request(`${API_ROUTES.INFORMATION_GUIDES}${step}/`, {
        method: "PATCH",
        body: JSON.stringify({
            content_data: contentData,
        }),
    });
}

export async function uploadImage(imageFile) {
    const formData = new FormData();
    formData.append("image", imageFile);

    return uploadRequest(API_ROUTES.IMAGE_UPLOADS, formData);
}
