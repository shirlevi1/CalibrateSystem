import React, { useEffect, useState, useRef } from "react";
import {
    Camera,
    Image as ImageIcon,
    LoaderCircle,
    Mail,
    Lock,
    Shield,
    Pencil,
    X,
} from "lucide-react";
import {
    getUserProfile,
    changePassword,
    uploadImage,
    updateProfileImage,
} from "../../api/api";
import "./ProfilePage.css";

const AVATARS = [
    { id: "avatar1", src: "/avatars/avatar1.png" },
    { id: "avatar2", src: "/avatars/avatar2.png" },
    { id: "avatar3", src: "/avatars/avatar3.png" },
    { id: "avatar4", src: "/avatars/avatar4.png" },
    { id: "avatar5", src: "/avatars/avatar5.png" },
    { id: "avatar6", src: "/avatars/avatar6.png" },
];

const DEFAULT_AVATAR = "/avatars/default.png";
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function isBuiltInAvatar(imageUrl) {
    return AVATARS.some((avatar) => avatar.src === imageUrl);
}

function getStoredProfileImages(userId) {
    try {
        const storedImages = localStorage.getItem(`profile_images_${userId}`);
        return storedImages ? JSON.parse(storedImages) : [];
    } catch {
        return [];
    }
}

const ProfilePage = () => {
    const [userData, setUserData] = useState(null);
    const [hasPageError, setHasPageError] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [message, setMessage] = useState("");
    const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATAR);
    const [customProfileImages, setCustomProfileImages] = useState([]);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraError, setCameraError] = useState("");

    const messageTimeoutRef = useRef(null);
    const galleryInputRef = useRef(null);
    const videoRef = useRef(null);
    const cameraStreamRef = useRef(null);

    const stopCameraStream = () => {
        if (cameraStreamRef.current) {
            cameraStreamRef.current.getTracks().forEach((track) => track.stop());
            cameraStreamRef.current = null;
        }
    };

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const data = await getUserProfile();
                setUserData(data);

                const savedAvatar =
                    data.profile_image_url || localStorage.getItem(`avatar_${data.id}`);

                if (savedAvatar) {
                    setSelectedAvatar(savedAvatar);
                }

                const storedProfileImages = getStoredProfileImages(data.id);
                const profileImages = savedAvatar && !isBuiltInAvatar(savedAvatar)
                    ? [savedAvatar, ...storedProfileImages]
                    : storedProfileImages;

                setCustomProfileImages([...new Set(profileImages)]);
            } catch {
                setHasPageError(true);
            }
        };

        loadProfile();

        return () => {
            if (messageTimeoutRef.current) {
                clearTimeout(messageTimeoutRef.current);
            }

            stopCameraStream();
        };
    }, []);

    const showMessage = (msg) => {
        setMessage(msg);

        if (messageTimeoutRef.current) {
            clearTimeout(messageTimeoutRef.current);
        }

        messageTimeoutRef.current = setTimeout(() => {
            setMessage("");
        }, 3000);
    };

    const getRoleLabel = (role) => {
        if (role === "admin") return "מנהל מערכת";
        if (role === "entrepreneur") return "יזם";
        return role || "";
    };

    const handleSelectAvatar = async (avatarSrc) => {
        setSelectedAvatar(avatarSrc);
        setIsUploadingProfileImage(true);

        if (userData?.id) {
            localStorage.setItem(`avatar_${userData.id}`, avatarSrc);
        }

        setIsAvatarModalOpen(false);
        try {
            await updateProfileImage(avatarSrc);
            setUserData((currentUserData) =>
                currentUserData
                    ? { ...currentUserData, profile_image_url: avatarSrc }
                    : currentUserData
            );
        } catch {
            showMessage("שמירת האווטר נכשלה");
            setIsUploadingProfileImage(false);
            return;
        }

        setIsUploadingProfileImage(false);
        showMessage("האוואטאר עודכן בהצלחה");
    };

    const addCustomProfileImage = (imageUrl) => {
        if (!imageUrl || isBuiltInAvatar(imageUrl)) {
            return;
        }

        setCustomProfileImages((currentImages) => {
            const nextImages = [
                imageUrl,
                ...currentImages.filter((currentImage) => currentImage !== imageUrl),
            ];

            if (userData?.id) {
                localStorage.setItem(
                    `profile_images_${userData.id}`,
                    JSON.stringify(nextImages)
                );
            }

            return nextImages;
        });
    };

    const saveUploadedProfileImage = async (file, successMessage) => {
        if (!file) {
            return;
        }

        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            showMessage("ניתן להעלות תמונות JPEG, PNG, GIF או WebP בלבד");
            return;
        }

        setIsUploadingProfileImage(true);

        try {
            const uploadedImage = await uploadImage(file);
            await updateProfileImage(uploadedImage.image_url);
            setSelectedAvatar(uploadedImage.image_url);
            addCustomProfileImage(uploadedImage.image_url);

            if (userData?.id) {
                localStorage.setItem(`avatar_${userData.id}`, uploadedImage.image_url);
            }

            setUserData((currentUserData) =>
                currentUserData
                    ? { ...currentUserData, profile_image_url: uploadedImage.image_url }
                    : currentUserData
            );
            setIsAvatarModalOpen(false);
            showMessage(successMessage);
        } catch {
            showMessage("שמירת התמונה נכשלה");
        } finally {
            setIsUploadingProfileImage(false);
        }
    };

    const handleGalleryUpload = (file) => {
        saveUploadedProfileImage(file, "התמונה נשמרה בפרופיל");
    };

    const handleOpenCamera = async () => {
        setCameraError("");
        setIsAvatarModalOpen(false);
        setIsCameraOpen(true);

        if (!navigator.mediaDevices?.getUserMedia) {
            setCameraError("הדפדפן לא תומך בפתיחת מצלמה");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user" },
                audio: false,
            });

            cameraStreamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch {
            setCameraError("לא ניתן לפתוח את המצלמה. בדקי הרשאות מצלמה בדפדפן.");
        }
    };

    const handleCloseCamera = () => {
        stopCameraStream();
        setCameraError("");
        setIsCameraOpen(false);
    };

    const handleCapturePhoto = async () => {
        const video = videoRef.current;

        if (!video || !video.videoWidth || !video.videoHeight) {
            setCameraError("המצלמה עדיין נטענת");
            return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);

        try {
            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob(
                    (photoBlob) =>
                        photoBlob ? resolve(photoBlob) : reject(new Error("Capture failed")),
                    "image/jpeg",
                    0.92
                );
            });
            const photoFile = new File([blob], "profile-camera.jpg", {
                type: "image/jpeg",
            });

            await saveUploadedProfileImage(photoFile, "התמונה מהמצלמה נשמרה בפרופיל");
            handleCloseCamera();
        } catch {
            setCameraError("שמירת התמונה מהמצלמה נכשלה");
        }
    };

    const handleOpenPasswordBox = () => {
        setMessage("");
        setIsChangingPassword(true);
    };

    const handleCancelPasswordChange = () => {
        setNewPassword("");
        setIsChangingPassword(false);
        setMessage("");

        if (messageTimeoutRef.current) {
            clearTimeout(messageTimeoutRef.current);
        }
    };

    const handleChangePassword = async () => {
        const trimmedPassword = newPassword.trim();

        if (!trimmedPassword) {
            showMessage("יש להזין סיסמה חדשה");
            return;
        }

        if (trimmedPassword.length < 6) {
            showMessage("הסיסמה חייבת להכיל לפחות 6 תווים");
            return;
        }

        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).+$/;
        if (!passwordRegex.test(trimmedPassword)) {
            showMessage("הסיסמה חייבת להכיל לפחות אות אחת ומספר");
            return;
        }

        try {
            await changePassword(trimmedPassword);
            setNewPassword("");
            setIsChangingPassword(false);
            showMessage("הסיסמה שונתה בהצלחה");
        } catch {
            showMessage("שגיאה בעדכון הסיסמה");
        }
    };

    if (hasPageError) {
        return null;
    }

    if (!userData) {
        return (
            <div className="page-content">
                <div className="profile-page">
                    <div className="profile-card profile-loading">טוען...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-content">
            <div className="profile-page">
                <div className="profile-card">
                    <div className="profile-header">
                        <div className="profile-avatar-area">
                            <div className="profile-avatar">
                                <img
                                    src={selectedAvatar}
                                    alt="תמונת פרופיל"
                                    className="profile-avatar-img"
                                />
                            </div>

                            <button
                                type="button"
                                className="profile-avatar-pencil"
                                onClick={() => setIsAvatarModalOpen(true)}
                                aria-label="בחירת אווטאר"
                            >
                                <Pencil size={14} />
                            </button>
                        </div>

                        <div className="profile-header-text">
                            <h1 className="profile-name">{userData.name}</h1>

                            <div className={`profile-role-badge ${userData.role}`}>
                                <Shield size={14} />
                                <span>{getRoleLabel(userData.role)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="profile-body">
                        <div className="profile-field">
                            <label className="profile-label">אימייל</label>
                            <div className="profile-input-like">
                                <Mail size={18} />
                                <span>{userData.email}</span>
                            </div>
                        </div>

                        <div className="profile-field">
                            <label className="profile-label">סיסמה</label>

                            <div className="profile-password-row">
                                {!isChangingPassword ? (
                                    <>
                                        <div className="profile-input-like">
                                            <Lock size={18} />
                                            <span>••••••••</span>
                                        </div>

                                        <button
                                            className="profile-change-btn"
                                            onClick={handleOpenPasswordBox}
                                            type="button"
                                        >
                                            שנה
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <input
                                            type="password"
                                            className="profile-password-input"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="סיסמה חדשה"
                                        />

                                        <div className="profile-password-actions">
                                            <button
                                                className="profile-save-btn"
                                                onClick={handleChangePassword}
                                                type="button"
                                            >
                                                שמור
                                            </button>

                                            <button
                                                className="profile-cancel-btn"
                                                onClick={handleCancelPasswordChange}
                                                type="button"
                                            >
                                                ביטול
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {message && <div className="profile-message">{message}</div>}
                    </div>
                </div>
            </div>

            {isCameraOpen && (
                <div className="avatar-modal-overlay" onClick={handleCloseCamera}>
                    <div
                        className="avatar-modal profile-camera-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            className="avatar-modal-close"
                            onClick={handleCloseCamera}
                            aria-label="סגירה"
                        >
                            <X size={18} />
                        </button>

                        <h2>צילום תמונת פרופיל</h2>

                        <div className="profile-camera-frame">
                            {cameraError ? (
                                <div className="profile-camera-error">{cameraError}</div>
                            ) : (
                                <video
                                    ref={videoRef}
                                    className="profile-camera-video"
                                    autoPlay
                                    playsInline
                                    muted
                                />
                            )}
                        </div>

                        <div className="profile-camera-actions">
                            <button
                                type="button"
                                className="profile-save-btn"
                                onClick={handleCapturePhoto}
                                disabled={Boolean(cameraError) || isUploadingProfileImage}
                            >
                                {isUploadingProfileImage ? "שומר..." : "צלם ושמור"}
                            </button>

                            <button
                                type="button"
                                className="profile-cancel-btn"
                                onClick={handleCloseCamera}
                            >
                                ביטול
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isAvatarModalOpen && (
                <div
                    className="avatar-modal-overlay"
                    onClick={() => setIsAvatarModalOpen(false)}
                >
                    <div
                        className="avatar-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            className="avatar-modal-close"
                            onClick={() => setIsAvatarModalOpen(false)}
                            aria-label="סגירה"
                        >
                            <X size={18} />
                        </button>

                        <h2>בחירת אווטאר</h2>
                        <p>בחרי תמונת פרופיל להצגה בחשבון</p>

                        <div className="avatar-options-grid">
                            {AVATARS.map((avatar) => (
                                <button
                                    type="button"
                                    key={avatar.id}
                                    className={`avatar-option ${
                                        selectedAvatar === avatar.src ? "selected" : ""
                                    }`}
                                    onClick={() => handleSelectAvatar(avatar.src)}
                                >
                                    <img src={avatar.src} alt="אווטאר" />
                                </button>
                            ))}

                            {customProfileImages.map((imageUrl) => (
                                <button
                                    type="button"
                                    key={imageUrl}
                                    className={`avatar-option uploaded-avatar-option ${
                                        selectedAvatar === imageUrl ? "selected" : ""
                                    }`}
                                    onClick={() => handleSelectAvatar(imageUrl)}
                                >
                                    <img src={imageUrl} alt="תמונת פרופיל שהועלתה" />
                                </button>
                            ))}
                        </div>

                        <div className="avatar-upload-actions">
                            <button
                                type="button"
                                className="avatar-upload-action"
                                onClick={handleOpenCamera}
                                disabled={isUploadingProfileImage}
                            >
                                <Camera size={18} />
                                <span>צלם תמונה</span>
                            </button>

                            <button
                                type="button"
                                className="avatar-upload-action"
                                onClick={() => galleryInputRef.current?.click()}
                                disabled={isUploadingProfileImage}
                            >
                                {isUploadingProfileImage ? (
                                    <LoaderCircle size={18} className="profile-spin-icon" />
                                ) : (
                                    <ImageIcon size={18} />
                                )}
                                <span>הוסף תמונה מהגלריה</span>
                            </button>

                            <input
                                ref={galleryInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                className="profile-gallery-input"
                                onChange={(event) => {
                                    handleGalleryUpload(event.target.files?.[0]);
                                    event.target.value = "";
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;
