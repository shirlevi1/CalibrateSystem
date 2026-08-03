import json
import html as html_lib
import os
import re
import zipfile
import urllib.error
import urllib.parse
import urllib.request
import uuid
from html.parser import HTMLParser
from io import BytesIO
from pathlib import Path

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.core.files.storage import default_storage
from django.core.mail import send_mail, EmailMultiAlternatives
from django.db import transaction
from django.http import FileResponse, Http404, HttpResponse
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.utils.encoding import force_bytes, force_str
from django.utils.html import escape, strip_tags
from django.utils.http import (
    content_disposition_header,
    urlsafe_base64_decode,
    urlsafe_base64_encode,
)
from django.utils.text import get_valid_filename
from django.views.decorators.csrf import ensure_csrf_cookie

from rest_framework import generics, permissions, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .emails import send_user_access_email
from .models import (
    ArchivedUser,
    ChatbotQuestion,
    CustomUser,
    InformationGuideContent,
    WorkEmphasis,
)
from .serializers import (
    ArchivedUserSerializer,
    ChatbotQuestionSerializer,
    InformationGuideContentSerializer,
    LoginSerializer,
    UserSerializer,
    WorkEmphasisSerializer,
)


CONTACTS_BOARD_ID = 5090828020
PROJECTS_BOARD_ID = 5090828016
CONTACT_EMAIL_COLUMN_ID = "contact_email"
CONTACT_PROJECT_ACCESS_COLUMN_ID = "board_relation_mm3hk41v"
PROJECT_ESCORT_TEAM_COLUMN_ID = "multiple_person_mm3gb8p0"
PROJECT_EXPONET_ID_COLUMN_ID = "text_mm1he76h"
PROJECT_CITY_COLUMN_ID = "text_mm3wgzsm"
PROJECT_ADDRESS_COLUMN_ID = "text_mm3wgq0t"
PROJECT_NUMBER_COLUMN_ID = "autonumber_mm3wrwgs"
PROJECT_STATUS_COLUMN_ID = "project_status"
PROJECT_EXISTING_STATUS_COLUMN_ID = "color_mm1grhfm"
ESCORT_TEAM_LINKED_ITEM_COLUMN_QUERY = (
    'column_values(ids: ["text_mm1h52s3", "phone_mm1hae40", "email_mm1hke1", '
    '"color_mm3xs6pb"]) { '
    "id text value "
    "... on StatusValue { label } "
    "} "
)
BOARD_RELATION_VALUE_QUERY = (
    "... on BoardRelationValue { "
    "display_value linked_item_ids "
    f"linked_items {{ id name {ESCORT_TEAM_LINKED_ITEM_COLUMN_QUERY} }} "
    "} "
)
COMPLETION_MOCK_FILES_DIR = Path(settings.BASE_DIR) / "mock_files"


class MondayAPIError(Exception):
    pass


ALLOWED_IMAGE_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
}

ALLOWED_IMAGE_SIGNATURES = {
    ".jpg": (b"\xff\xd8\xff",),
    ".png": (b"\x89PNG\r\n\x1a\n",),
    ".gif": (b"GIF87a", b"GIF89a"),
    ".webp": (b"RIFF",),
}

ALLOWED_PROFILE_IMAGE_PREFIXES = (
    "/avatars/",
    "/media/",
    "http://",
    "https://",
)

DEFAULT_WORK_EMPHASES = [
    {
        "position": 1,
        "title": "בטיחות ויציבות המבנה",
        "icon": "shield",
        "content": "בדיקת אלמנטים נושאים, יציבות וביסוס לפי תקנים הנדסיים מחייבים.",
    },
    {
        "position": 2,
        "title": "איכות ודיוק ביצוע הנדסי",
        "icon": "clipboard",
        "content": "בקרה על התאמה לתכנון, דיוק ביצוע ושמירה על מפרטים.",
    },
    {
        "position": 3,
        "title": "הנחיות בקר אחראי",
        "icon": "hard-hat",
        "content": "עמידה בהנחיות בקרת שטח ותיאום מול צוותי ביצוע.",
    },
    {
        "position": 4,
        "title": "מניעת ליקויים קריטיים בשטח",
        "icon": "alert",
        "content": "זיהוי מוקדם של חריגות ביצוע ומניעת כשלים הנדסיים קריטיים באתר.",
    },
]

DEFAULT_CHATBOT_QUESTIONS = [
    {
        "position": 1,
        "question": "איפה רואים מסמכים חסרים?",
        "answer": "את המסמכים החסרים ניתן לראות דרך מסמכי הפרויקט ולסנן לפי חסרים. שם יוצגו מסמכים שעדיין דורשים טיפול או השלמה.",
    },
    {
        "position": 2,
        "question": "איפה רואים מסמכים נדרשים?",
        "answer": "את כל המסמכים הנדרשים לפרויקט ניתן לראות במסמכי הפרויקט. המסך מציג את כלל הטפסים והמסמכים הרלוונטיים לפרויקט.",
    },
    {
        "position": 3,
        "question": "איך מורידים מסמך?",
        "answer": "במסך המסמכים, ליד מסמך שיש לו קובץ זמין, מופיע כפתור הורדה או צפייה במסמך. לחיצה עליו תפתח או תוריד את הקובץ.",
    },
    {
        "position": 4,
        "question": "איפה רואים את צוות המלווה?",
        "answer": "את צוות המלווה ניתן לראות דרך הכרטיס צוות מלווה. שם יוצגו אנשי המקצוע או הגורמים המלווים של הפרויקט.",
    },
    {
        "position": 5,
        "question": "איך בוחרים פרויקט אחר?",
        "answer": "ניתן לבחור פרויקט אחר דרך מסך בחירת הפרויקטים או דרך תפריט המערכת, בהתאם להרשאות המשתמש.",
    },
]

DEFAULT_INFORMATION_GUIDES = {
    "content_control": {
        "pageTitle": "מידע ומדריכים - בקרת תכן",
        "pageDescription": "כל המידע החשוב לשלב התכנון, מרוכז במקום אחד בצורה ברורה ונגישה.",
        "heroNoteTitle": "מה חשוב להבין בשלב התכנון?",
        "heroNoteText": "בקרת התכן נועדה לוודא שהתכנון של הפרויקט עומד בדרישות המקצועיות לפני שמתחילים את העבודה בפועל.",
        "summaryCards": [
            {
                "icon": "clipboard",
                "title": "מטרת השלב",
                "text": "לבחון את התכנון לפני תחילת העבודה.",
            },
            {
                "icon": "shield",
                "title": "מה בודקים?",
                "text": "תקנים, דרישות הנדסיות, מסמכים והתאמה להיתר.",
            },
            {
                "icon": "info",
                "title": "למה זה חשוב?",
                "text": "כדי לצמצם טעויות, עיכובים ותיקונים בשלבים מאוחרים.",
            },
        ],
        "guides": [
            {
                "title": "מהי בקרת תכן?",
                "text": "בקרת התכן היא אחד השלבים המרכזיים בתהליך קבלת היתר הבנייה. בשלב זה נבחנים ההיבטים ההנדסיים של הפרויקט לפני תחילת העבודה.",
                "secondText": "",
                "highlight": "מכון הבקרה מוודא שהתכנון עומד בתקנים ובדרישות המחייבות.",
            },
            {
                "title": "מהם מכוני בקרה?",
                "text": "מכוני הבקרה הוקמו כדי לשפר את האיכות והבטיחות בענף הבנייה, באמצעות בדיקה מקצועית ובלתי תלויה של התכנון.",
                "secondText": "",
                "highlight": "המכון מסייע לזהות פערים בתכנון לפני שהם הופכים לבעיות בשטח.",
            },
            {
                "title": "מיהו בקר מומחה?",
                "text": "בקר מומחה הוא איש מקצוע שבודק תחום הנדסי מסוים בפרויקט, בהתאם לדרישות ולתקנים הרלוונטיים.",
                "secondText": "",
                "highlight": "כל תחום נבדק על ידי גורם מקצועי שמוודא עמידה בדרישות.",
            },
            {
                "title": "למה צריך בקרה אם יש פיקוח?",
                "text": "פיקוח מתבצע בזמן הבנייה בשטח, בעוד שבקרה בוחנת את התכנון לפני תחילת העבודה.",
                "secondText": "",
                "highlight": "השילוב בין בקרה לפיקוח מפחית טעויות, עיכובים ועלויות מיותרות.",
            },
        ],
        "videos": [
            {
                "title": "סרטון הדרכה 1",
                "description": "לחצי לצפייה בסרטון ההדרכה.",
                "src": "/videos/construction-1.mp4",
                "thumbnail": "/images/construction-1-thumbnail.jpg",
            },
            {
                "title": "סרטון הדרכה 2",
                "description": "לחצי לצפייה בסרטון ההדרכה.",
                "src": "/videos/construction-2.mp4",
                "thumbnail": "/images/construction-2-thumbnail.jpg",
            },
        ],
    },
    "execution_control": {
        "pageTitle": "מידע ומדריכים - בקרת ביצוע",
        "pageDescription": "כל המידע החשוב לשלב הביצוע, מרוכז במקום אחד בצורה ברורה ונגישה.",
        "heroNoteTitle": "מה חשוב להבין בשלב הביצוע?",
        "heroNoteText": "בקרת הביצוע נועדה לוודא שהעבודה בשטח מתקדמת לפי התכנון המאושר, תוך שמירה על איכות, בטיחות ועמידה בדרישות.",
        "summaryCards": [
            {
                "icon": "clipboard",
                "title": "מטרת השלב",
                "text": "לוודא שהביצוע בשטח תואם לתכנון המאושר.",
            },
            {
                "icon": "shield",
                "title": "מה בודקים?",
                "text": "איכות ביצוע, התאמה לתכנון, יציבות ועמידה בדרישות.",
            },
            {
                "icon": "info",
                "title": "למה זה חשוב?",
                "text": "כדי לזהות בעיות בזמן ולמנוע עיכובים בהמשך הפרויקט.",
            },
        ],
        "guides": [
            {
                "title": "מהי בקרת ביצוע במהלך הבנייה?",
                "text": "בקרת הביצוע מתחילה לאחר קבלת היתר הבנייה ונמשכת לאורך שלבי העבודה המרכזיים בפרויקט.",
                "secondText": "מטרתה לוודא שהבנייה מתבצעת בהתאם לתכנון המאושר, לתקנים ולדרישות היציבות והבטיחות.",
                "highlight": "בשלב זה מתמקדים בנקודות הבקרה הקריטיות ביותר לאורך הביצוע.",
            },
        ],
        "videos": [
            {
                "title": "סרטון הדרכה 1",
                "description": "לחצי לצפייה בסרטון ההדרכה.",
                "src": "/videos/construction-1.mp4",
                "thumbnail": "/images/construction-1-thumbnail.jpg",
            },
            {
                "title": "סרטון הדרכה 2",
                "description": "לחצי לצפייה בסרטון ההדרכה.",
                "src": "/videos/construction-2.mp4",
                "thumbnail": "/images/construction-2-thumbnail.jpg",
            },
        ],
    },
}

DEFAULT_INFORMATION_GUIDES["work_start_approval"] = {
    **DEFAULT_INFORMATION_GUIDES["content_control"],
    "pageTitle": "מידע ומדריכים - אישור תחילת עבודה",
}


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "admin"


def ensure_default_work_emphases():
    if WorkEmphasis.objects.exists():
        return

    WorkEmphasis.objects.bulk_create(
        WorkEmphasis(**emphasis) for emphasis in DEFAULT_WORK_EMPHASES
    )


def ensure_default_chatbot_questions():
    if ChatbotQuestion.objects.exists():
        return

    ChatbotQuestion.objects.bulk_create(
        ChatbotQuestion(**question) for question in DEFAULT_CHATBOT_QUESTIONS
    )


def normalize_information_step(step):
    if step in ["execution_control", "execution", "execution-control"]:
        return "execution_control"

    if step in ["approval", "work_start_approval", "work-start-approval"]:
        return "work_start_approval"

    return "content_control"


def ensure_default_information_guides(step):
    normalized_step = normalize_information_step(step)
    default_content = DEFAULT_INFORMATION_GUIDES[normalized_step]

    content, _ = InformationGuideContent.objects.get_or_create(
        step=normalized_step,
        defaults={"content_data": default_content},
    )

    return content


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CSRFView(APIView):
    permission_classes = []

    def get(self, request):
        return Response({"message": "CSRF cookie set"})


class UsersView(generics.ListCreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def create(self, request, *args, **kwargs):
        raw_password = request.data.get("password")
        should_send_email = request.data.get("send_email", False)

        if isinstance(should_send_email, str):
            should_send_email = should_send_email.lower() == "true"

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        email_sent = False
        email_error = None

        if should_send_email and raw_password:
            try:
                send_user_access_email(
                    user=user,
                    raw_password=raw_password,
                    is_password_update=False,
                )
                email_sent = True
            except Exception as error:
                email_error = str(error)
                print("Failed to send user access email:", error)

        response_data = UserSerializer(user).data
        response_data["email_sent"] = email_sent

        if should_send_email and not email_sent:
            response_data["email_warning"] = "המשתמש נוצר, אך שליחת המייל נכשלה."
            response_data["email_error"] = email_error

        return Response(response_data, status=status.HTTP_201_CREATED)


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def update(self, request, *args, **kwargs):
        raw_password = request.data.get("password")
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
        )
        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        email_sent = False
        email_error = None

        if raw_password:
            try:
                send_user_access_email(
                    user=user,
                    raw_password=raw_password,
                    is_password_update=True,
                )
                email_sent = True
            except Exception as error:
                email_error = str(error)
                print("Failed to send updated password email:", error)

        response_data = UserSerializer(user).data

        if raw_password:
            response_data["email_sent"] = email_sent

            if not email_sent:
                response_data["email_warning"] = "המשתמש עודכן, אך שליחת מייל הסיסמה נכשלה."
                response_data["email_error"] = email_error

        return Response(response_data, status=status.HTTP_200_OK)

    def perform_destroy(self, instance):
        deleted_by = self.request.user

        ArchivedUser.objects.create(
            original_user_id=instance.id,
            email=instance.email,
            name=instance.name,
            role=instance.role,
            crm_id=instance.crm_id,
            password_hash=instance.password,
            privacy_policy_accepted=instance.privacy_policy_accepted,
            privacy_policy_accepted_at=instance.privacy_policy_accepted_at,
            original_created_at=instance.created_at,
            deleted_by_id=deleted_by.id,
            deleted_by_email=deleted_by.email,
            deleted_by_name=deleted_by.name,
        )

        instance.delete()


class ArchivedUsersView(generics.ListAPIView):
    serializer_class = ArchivedUserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return ArchivedUser.objects.all()


def restore_archived_user(archived_user, restored_by):
    if archived_user.is_restored:
        return None, "המשתמש כבר שוחזר בעבר."

    if CustomUser.objects.filter(email=archived_user.email).exists():
        return None, "לא ניתן לשחזר: כבר קיים משתמש פעיל עם אותו אימייל."

    if archived_user.crm_id and CustomUser.objects.filter(crm_id=archived_user.crm_id).exists():
        return None, "לא ניתן לשחזר: כבר קיים משתמש פעיל עם אותו CRM ID."

    with transaction.atomic():
        restored_user = CustomUser.objects.create(
            email=archived_user.email,
            name=archived_user.name,
            role=archived_user.role,
            crm_id=archived_user.crm_id,
            privacy_policy_accepted=archived_user.privacy_policy_accepted,
            privacy_policy_accepted_at=archived_user.privacy_policy_accepted_at,
            is_active=True,
            is_staff=archived_user.role == "admin",
        )

        if archived_user.password_hash:
            restored_user.password = archived_user.password_hash
        else:
            restored_user.set_unusable_password()

        restored_user.save()

        archived_user.is_restored = True
        archived_user.restored_at = timezone.now()
        archived_user.restored_by_id = restored_by.id
        archived_user.restored_by_email = restored_by.email
        archived_user.restored_by_name = restored_by.name
        archived_user.save(
            update_fields=[
                "is_restored",
                "restored_at",
                "restored_by_id",
                "restored_by_email",
                "restored_by_name",
            ]
        )

    return restored_user, None


class RestoreArchivedUserView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            archived_user = ArchivedUser.objects.get(pk=pk)
        except ArchivedUser.DoesNotExist:
            return Response(
                {"detail": "Archived user not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        restored_user, error = restore_archived_user(archived_user, request.user)

        if error:
            return Response(
                {"detail": error},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": "User restored successfully.",
                "user": UserSerializer(restored_user).data,
                "archived_user": ArchivedUserSerializer(archived_user).data,
            },
            status=status.HTTP_200_OK,
        )


class RestoreAllArchivedUsersView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request):
        archived_users = ArchivedUser.objects.filter(is_restored=False)

        restored = []
        failed = []

        for archived_user in archived_users:
            restored_user, error = restore_archived_user(archived_user, request.user)

            if error:
                failed.append(
                    {
                        "id": archived_user.id,
                        "email": archived_user.email,
                        "reason": error,
                    }
                )
            else:
                restored.append(UserSerializer(restored_user).data)

        return Response(
            {
                "message": "Restore all finished.",
                "restored_count": len(restored),
                "failed_count": len(failed),
                "restored": restored,
                "failed": failed,
            },
            status=status.HTTP_200_OK,
        )


class WorkEmphasesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        ensure_default_work_emphases()
        emphases = WorkEmphasis.objects.all().order_by("position", "id")
        return Response(WorkEmphasisSerializer(emphases, many=True).data)

    def patch(self, request):
        if request.user.role != "admin":
            return Response(
                {"detail": "Only admins can edit work emphases."},
                status=status.HTTP_403_FORBIDDEN,
            )

        ensure_default_work_emphases()

        items = (
            request.data.get("items", request.data)
            if isinstance(request.data, dict)
            else request.data
        )

        if not isinstance(items, list):
            return Response(
                {"detail": "Expected a list of work emphases."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item_ids = [
            item.get("id")
            for item in items
            if isinstance(item, dict) and item.get("id")
        ]

        existing_items = {
            emphasis.id: emphasis
            for emphasis in WorkEmphasis.objects.filter(id__in=item_ids)
        }

        updated_serializers = []

        for item in items:
            if not isinstance(item, dict) or "id" not in item:
                return Response(
                    {"detail": "Each work emphasis must include an id."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            emphasis = existing_items.get(item["id"])

            if not emphasis:
                return Response(
                    {"detail": f"Work emphasis {item['id']} was not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            serializer = WorkEmphasisSerializer(
                emphasis,
                data={
                    "position": item.get("position", emphasis.position),
                    "title": item.get("title", emphasis.title),
                    "content": item.get("content", emphasis.content),
                    "icon": item.get("icon", emphasis.icon),
                },
                partial=True,
            )
            serializer.is_valid(raise_exception=True)
            updated_serializers.append(serializer)

        with transaction.atomic():
            for serializer in updated_serializers:
                serializer.save()

        emphases = WorkEmphasis.objects.all()
        return Response(WorkEmphasisSerializer(emphases, many=True).data)


class ChatbotQuestionsView(APIView):
    def get_permissions(self):
        permission_classes = (
            [permissions.IsAuthenticated]
            if self.request.method in permissions.SAFE_METHODS
            else [IsAdmin]
        )
        return [permission() for permission in permission_classes]

    def get(self, request):
        ensure_default_chatbot_questions()
        questions = ChatbotQuestion.objects.all().order_by("position", "id")
        return Response(ChatbotQuestionSerializer(questions, many=True).data)

    def patch(self, request):
        ensure_default_chatbot_questions()

        items = (
            request.data.get("items", request.data)
            if isinstance(request.data, dict)
            else request.data
        )

        if not isinstance(items, list):
            return Response(
                {"detail": "Expected a list of chatbot questions."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cleaned_items = []

        for index, item in enumerate(items, start=1):
            if not isinstance(item, dict):
                return Response(
                    {"detail": "Each chatbot question must be an object."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            question = str(item.get("question", "")).strip()
            answer = str(item.get("answer", "")).strip()

            if not question or not answer:
                return Response(
                    {"detail": "Question and answer are required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            cleaned_items.append(
                {
                    "id": item.get("id"),
                    "question": question,
                    "answer": answer,
                    "position": index,
                }
            )

        item_ids = [
            item["id"]
            for item in cleaned_items
            if isinstance(item.get("id"), int)
        ]

        existing_items = {
            question.id: question
            for question in ChatbotQuestion.objects.filter(id__in=item_ids)
        }

        with transaction.atomic():
            ChatbotQuestion.objects.exclude(id__in=item_ids).delete()

            for item in cleaned_items:
                question_id = item.get("id")
                question = (
                    existing_items.get(question_id)
                    if isinstance(question_id, int)
                    else None
                )

                if question:
                    question.question = item["question"]
                    question.answer = item["answer"]
                    question.position = item["position"]
                    question.save()
                else:
                    question = ChatbotQuestion.objects.create(
                        question=item["question"],
                        answer=item["answer"],
                        position=item["position"],
                    )

        questions = ChatbotQuestion.objects.all().order_by("position", "id")
        return Response(ChatbotQuestionSerializer(questions, many=True).data)


class InformationGuideContentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, step):
        content = ensure_default_information_guides(step)
        return Response(InformationGuideContentSerializer(content).data)

    def patch(self, request, step):
        if request.user.role != "admin":
            return Response(
                {"detail": "Only admins can edit information guides."},
                status=status.HTTP_403_FORBIDDEN,
            )

        content = ensure_default_information_guides(step)
        content_data = request.data.get("content_data", request.data)

        serializer = InformationGuideContentSerializer(
            content,
            data={"content_data": content_data},
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)


def uploaded_file_has_allowed_signature(uploaded_file, extension):
    signatures = ALLOWED_IMAGE_SIGNATURES.get(extension, ())
    head = uploaded_file.read(16)
    uploaded_file.seek(0)

    if extension == ".webp":
        return head.startswith(b"RIFF") and head[8:12] == b"WEBP"

    return any(head.startswith(signature) for signature in signatures)


class ImageUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        uploaded_file = request.FILES.get("image")

        if not uploaded_file:
            return Response(
                {"detail": "Image file is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content_type = uploaded_file.content_type
        extension = ALLOWED_IMAGE_CONTENT_TYPES.get(content_type)

        if not extension or not uploaded_file_has_allowed_signature(uploaded_file, extension):
            return Response(
                {
                    "detail": "Unsupported image type. Upload JPEG, PNG, GIF, or WebP images only."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        original_name = Path(get_valid_filename(uploaded_file.name)).stem or "image"
        storage_path = (
            f"system-images/{timezone.now():%Y/%m}/"
            f"{uuid.uuid4().hex}-{original_name[:60]}{extension}"
        )

        saved_path = default_storage.save(storage_path, uploaded_file)
        image_url = default_storage.url(saved_path)

        return Response(
            {
                "image_path": saved_path,
                "image_url": image_url,
                "content_type": content_type,
            },
            status=status.HTTP_201_CREATED,
        )


class Login(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        if serializer.is_valid():
            data = serializer.validated_data

            if data.get("password_change_required"):
                return Response(
                    {
                        "password_change_required": True,
                        "uid": data["uid"],
                        "token": data["token"],
                        "user": data["user"],
                        "message": "Password change required",
                    },
                    status=status.HTTP_200_OK,
                )

            response = Response(
                {
                    "user": data["user"],
                    "access": data["access"],
                    "refresh": data["refresh"],
                    "password_change_required": False,
                    "message": "Login successful",
                },
                status=status.HTTP_200_OK,
            )

            response.set_cookie(
                key="access_token",
                value=data["access"],
                httponly=True,
                secure=False,
                samesite="Lax",
                max_age=60 * 60,
            )

            response.set_cookie(
                key="refresh_token",
                value=data["refresh"],
                httponly=True,
                secure=False,
                samesite="Lax",
                max_age=60 * 60 * 24 * 7,
            )

            return response

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        return Response(
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "crm_id": user.crm_id,
                "privacy_policy_accepted": user.privacy_policy_accepted,
                "privacy_policy_accepted_at": user.privacy_policy_accepted_at,
                "profile_image_url": user.profile_image_url,
                "created_at": user.created_at,
            },
            status=status.HTTP_200_OK,
        )


class UserProfileImageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        image_url = (request.data.get("image_url") or "").strip()

        if image_url and not image_url.startswith(ALLOWED_PROFILE_IMAGE_PREFIXES):
            return Response(
                {"detail": "Profile image URL must be an avatar path, media path, or URL."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        user.profile_image_url = image_url
        user.save(update_fields=["profile_image_url"])

        return Response(
            {
                "id": user.id,
                "profile_image_url": user.profile_image_url,
            },
            status=status.HTTP_200_OK,
        )


class PrivacyPolicyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        possible_paths = [
            os.path.join(settings.STATIC_ROOT, "privacy", "privacy-policy.pdf"),
            os.path.join(settings.BASE_DIR, "static", "privacy", "privacy-policy.pdf"),
            os.path.join(settings.BASE_DIR, "static", "privacy", "privacy_policy.pdf"),
            os.path.join(settings.BASE_DIR.parent, "static", "privacy", "privacy-policy.pdf"),
            os.path.join(settings.BASE_DIR.parent, "static", "privacy", "privacy_policy.pdf"),
            os.path.join(settings.BASE_DIR, "privacy-policy.pdf"),
            os.path.join(settings.BASE_DIR, "privacy_policy.pdf"),
        ]

        file_path = next((path for path in possible_paths if os.path.exists(path)), None)

        if not file_path:
            raise Http404("Privacy policy file not found")

        response = FileResponse(
            open(file_path, "rb"),
            content_type="application/pdf",
            filename="privacy-policy.pdf",
        )

        response["Content-Disposition"] = 'inline; filename="privacy-policy.pdf"'
        return response


class AcceptPrivacyPolicyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        user.privacy_policy_accepted = True
        user.privacy_policy_accepted_at = timezone.now()
        user.save(
            update_fields=[
                "privacy_policy_accepted",
                "privacy_policy_accepted_at",
            ]
        )

        return Response(
            {
                "message": "Privacy policy accepted successfully",
                "privacy_policy_accepted": user.privacy_policy_accepted,
                "privacy_policy_accepted_at": user.privacy_policy_accepted_at,
            },
            status=status.HTTP_200_OK,
        )


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        new_password = request.data.get("new_password")

        if not new_password:
            return Response(
                {"error": "New password is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user=user)
        except ValidationError as error:
            translated_errors = translate_password_errors(error.messages)

            return Response(
                {
                    "error": " ".join(translated_errors),
                    "password_errors": translated_errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.force_password_change = False
        user.save(update_fields=["password", "force_password_change"])

        return Response(
            {"message": "Password updated successfully"},
            status=status.HTTP_200_OK,
        )


def get_http_error_body(error):
    try:
        return error.read().decode("utf-8")
    except Exception:
        return str(error)


def fetch_crm_data(query):
    crm_proxy_url = getattr(settings, "CRM_PROXY_URL", None)
    crm_proxy_api_key = getattr(settings, "CRM_PROXY_API_KEY", None)

    if not crm_proxy_url:
        raise ValueError("CRM_PROXY_URL is not configured")

    if not crm_proxy_api_key:
        raise ValueError("CRM_PROXY_API_KEY is not configured")

    normalized_api_key = str(crm_proxy_api_key).strip()

    if not normalized_api_key.lower().startswith("api key "):
        normalized_api_key = f"API Key {normalized_api_key}"

    payload = json.dumps({"query": query}).encode("utf-8")

    headers = {
        "Content-Type": "application/json",
        "x-make-apikey": normalized_api_key,
    }

    request_obj = urllib.request.Request(
        crm_proxy_url,
        data=payload,
        headers=headers,
        method="POST",
    )

    with urllib.request.urlopen(request_obj, timeout=30) as response:
        response_body = response.read().decode("utf-8")
        return json.loads(response_body)


def extract_items_from_crm_response(crm_response):
    if crm_response.get("data", {}).get("items"):
        return crm_response.get("data", {}).get("items", [])

    if crm_response.get("items"):
        return crm_response.get("items", [])

    boards = crm_response.get("data", {}).get("boards")

    if boards is None:
        boards = crm_response.get("boards", [])

    if boards:
        return boards[0].get("items_page", {}).get("items", [])

    return []


def raise_for_monday_graphql_errors(crm_response):
    errors = crm_response.get("errors") or []

    if errors:
        messages = [error.get("message", str(error)) for error in errors]
        raise MondayAPIError(f"Monday API request failed: {'; '.join(messages)}")


def fetch_exponet_json(url):
    headers = {
        "Content-Type": "application/json",
        "x-api-key": f"{settings.EXPONET_API_KEY}",
    }

    request_obj = urllib.request.Request(
        url,
        headers=headers,
        method="GET",
    )

    with urllib.request.urlopen(request_obj, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_exponet_file(file_id):
    file_url = f"{settings.EXPONET_API_BASE_URL}/files/{file_id}/download"

    headers = {
        "x-api-key": f"{settings.EXPONET_API_KEY}",
    }

    request_obj = urllib.request.Request(
        file_url,
        headers=headers,
        method="GET",
    )

    return urllib.request.urlopen(request_obj, timeout=30)


def fetch_exponet_file_url(file_url):
    if file_url.startswith("/"):
        base_match = re.match(r"^(https?://[^/]+)", settings.EXPONET_API_BASE_URL)

        if base_match:
            file_url = f"{base_match.group(1)}{file_url}"

    headers = {
        "x-api-key": f"{settings.EXPONET_API_KEY}",
    }

    request_obj = urllib.request.Request(
        file_url,
        headers=headers,
        method="GET",
    )

    return urllib.request.urlopen(request_obj, timeout=30)


def get_template_file_id(item):
    template_file = item.get("templateFile") or item.get("template_file")

    if isinstance(template_file, dict):
        return (
            template_file.get("id")
            or template_file.get("fileId")
            or template_file.get("file_id")
        )

    return (
        item.get("templateFileId")
        or item.get("template_file_id")
        or item.get("templateId")
        or item.get("template_id")
    )


def get_template_file_url(item):
    template_file = item.get("templateFile") or item.get("template_file")

    if isinstance(template_file, dict):
        return (
            template_file.get("url")
            or template_file.get("downloadUrl")
            or template_file.get("download_url")
        )

    return (
        item.get("templateFileUrl")
        or item.get("template_file_url")
        or item.get("templateUrl")
        or item.get("template_url")
    )


def get_template_file_name(item):
    template_file = item.get("templateFile") or item.get("template_file")

    if isinstance(template_file, dict):
        return (
            template_file.get("name")
            or template_file.get("fileName")
            or template_file.get("file_name")
        )

    return (
        item.get("templateFileName")
        or item.get("template_file_name")
        or item.get("templateName")
        or item.get("template_name")
    )


def build_document_item_response(item):
    files = item.get("files") or []
    review_status_name = item.get("reviewStatusName") or item.get("review_status_name")

    return {
        "id": item.get("id"),
        "parentId": item.get("parentId") or item.get("parent_id"),
        "text": item.get("text") or item.get("name") or item.get("title"),
        "isFolder": item.get("isFolder") or item.get("is_folder") or False,
        "indexRow": item.get("indexRow") or item.get("index_row"),
        "intakeStatus": item.get("intakeStatus") or item.get("intake_status"),
        "intakeStatusName": item.get("intakeStatusName") or item.get("intake_status_name"),
        "reviewStatus": item.get("reviewStatus") or item.get("review_status"),
        "reviewStatusName": review_status_name,
        "subjectName": item.get("subjectName") or item.get("subject_name"),
        "templateFileId": get_template_file_id(item),
        "templateFileUrl": get_template_file_url(item),
        "templateFileName": get_template_file_name(item),
        "fileCount": item.get("fileCount", item.get("file_count", len(files))),
        "files": files,
    }


def get_filename_from_content_disposition(content_disposition):
    if not content_disposition:
        return ""

    filename_star_match = re.search(
        r"filename\*=([^']*)''([^;]+)",
        content_disposition,
        flags=re.IGNORECASE,
    )

    if filename_star_match:
        encoding = filename_star_match.group(1) or "utf-8"
        encoded_filename = filename_star_match.group(2)

        try:
            return urllib.parse.unquote(encoded_filename, encoding=encoding)
        except LookupError:
            return urllib.parse.unquote(encoded_filename)

    filename_match = re.search(
        r'filename="?([^";]+)"?',
        content_disposition,
        flags=re.IGNORECASE,
    )

    if filename_match:
        return filename_match.group(1)

    return ""


def ensure_filename_extension(filename, content_type):
    extension_by_content_type = {
        "application/pdf": ".pdf",
        "application/msword": ".doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
        "application/vnd.ms-excel": ".xls",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
        "application/zip": ".zip",
    }

    extension = Path(filename).suffix

    if extension:
        return filename

    expected_extension = extension_by_content_type.get((content_type or "").split(";")[0])

    if expected_extension:
        return f"{filename}{expected_extension}"

    return filename


def get_column_by_title(item, title):
    columns = item.get("column_values", [])

    return next(
        (
            column
            for column in columns
            if ((column.get("column") or {}).get("title") or "").strip() == title
        ),
        None,
    )


def get_column_by_id(item, column_id):
    columns = item.get("column_values", [])

    return next(
        (
            column
            for column in columns
            if column.get("id") == column_id
        ),
        None,
    )


def get_monday_column_display_value(column, default=""):
    if not column:
        return default

    return (
            column.get("display_value")
            or column.get("label")
            or column.get("text")
            or default
    )


def get_column_text(item, title, default=""):
    column = get_column_by_title(item, title)

    return get_monday_column_display_value(column, default)


def get_column_json_value(item, title):
    column = get_column_by_title(item, title)

    if not column:
        return {}

    raw_value = column.get("value")

    if not raw_value:
        return {}

    try:
        return json.loads(raw_value)
    except (TypeError, json.JSONDecodeError):
        return {}


def get_column_updated_at(item, title):
    column = get_column_by_title(item, title)
    value = get_column_json_value(item, title)

    return value.get("changed_at") or (column or {}).get("updated_at")


def get_column_file_url(item, title):
    column = get_column_by_title(item, title)

    if not column:
        return ""

    for text_key in ("display_value", "text"):
        text_value = column.get(text_key) or ""
        url_match = re.search(r"https?://\S+", text_value)

        if url_match:
            return url_match.group(0)

    for direct_key in ("public_url", "url"):
        direct_url = column.get(direct_key)

        if direct_url:
            return direct_url

    value = get_column_json_value(item, title)

    for direct_key in ("public_url", "url"):
        direct_url = value.get(direct_key)

        if direct_url:
            return direct_url

    linked_asset_ids = {
        str(file_item.get("assetId") or file_item.get("asset_id") or file_item.get("id"))
        for file_item in value.get("files", [])
        if file_item.get("assetId") or file_item.get("asset_id") or file_item.get("id")
    }

    if linked_asset_ids:
        for asset in item.get("assets", []):
            if str(asset.get("id")) in linked_asset_ids:
                return asset.get("public_url") or asset.get("url") or ""

    return ""


def get_linked_items_from_column(item, title):
    column = get_column_by_title(item, title)

    if not column:
        return []

    return column.get("linked_items") or []


def email_matches_value(value, email):
    normalized_email = (email or "").strip().lower()
    normalized_value = (value or "").strip().lower()

    if not normalized_email or not normalized_value:
        return False

    emails = [
        part.strip()
        for part in re.split(r"[,;\s]+", normalized_value)
        if part.strip()
    ]

    return normalized_email in emails or normalized_email == normalized_value


def find_contact_by_email(email):
    normalized_email = (email or "").strip().lower()

    if not normalized_email:
        return None

    email_value = json.dumps(normalized_email)
    query = (
        f"query {{ "
        f"boards(ids: {CONTACTS_BOARD_ID}) {{ "
        f"items_page(limit: 500, query_params: {{ "
        f"rules: [{{ "
        f"column_id: \"{CONTACT_EMAIL_COLUMN_ID}\", "
        f"compare_value: [{email_value}], "
        f"operator: any_of "
        f"}}] "
        f"}}) {{ "
        f"items {{ "
        f"id name created_at updated_at state "
        f"column_values {{ "
        f"id text value column {{ title }} "
        f"... on MirrorValue {{ display_value }} "
        f"{BOARD_RELATION_VALUE_QUERY}"
        f"... on DependencyValue {{ display_value linked_item_ids linked_items {{ id name }} }} "
        f"... on StatusValue {{ label updated_at label_style {{ color }} }} "
        f"... on NumbersValue {{ symbol direction }} "
        f"}} "
        f"assets {{ id name url public_url file_extension }} "
        f"}} "
        f"}} "
        f"}} "
        f"}}"
    )

    crm_response = fetch_crm_data(query)
    raise_for_monday_graphql_errors(crm_response)
    contacts = extract_items_from_crm_response(crm_response)

    return next(
        (
            contact
            for contact in contacts
            if get_column_text(contact, "מייל").strip().lower() == normalized_email
        ),
        None,
    )


def fetch_monday_projects_for_contact(contact_id):
    if not contact_id:
        return []

    query = (
        f"query {{ "
        f"items(ids: [{contact_id}]) {{ "
        f"id name "
        f"column_values(ids: [\"{CONTACT_PROJECT_ACCESS_COLUMN_ID}\"]) {{ "
        f"id text value "
        f"... on BoardRelationValue {{ "
        f"linked_items {{ "
        f"id name "
        f"column_values(ids: ["
        f"\"{PROJECT_EXPONET_ID_COLUMN_ID}\", "
        f"\"{PROJECT_CITY_COLUMN_ID}\", "
        f"\"{PROJECT_ADDRESS_COLUMN_ID}\", "
        f"\"{PROJECT_NUMBER_COLUMN_ID}\", "
        f"\"{PROJECT_STATUS_COLUMN_ID}\", "
        f"\"{PROJECT_EXISTING_STATUS_COLUMN_ID}\", "
        f"\"{PROJECT_ESCORT_TEAM_COLUMN_ID}\""
        f"]) {{ "
        f"id text value column {{ title }} "
        f"... on BoardRelationValue {{ "
        f"linked_items {{ id name {ESCORT_TEAM_LINKED_ITEM_COLUMN_QUERY} }} "
        f"}} "
        f"... on StatusValue {{ label }} "
        f"}} "
        f"}} "
        f"}} "
        f"}} "
        f"}} "
        f"}}"
    )

    crm_response = fetch_crm_data(query)
    raise_for_monday_graphql_errors(crm_response)
    contacts = extract_items_from_crm_response(crm_response)

    if not contacts:
        return []

    access_column = get_column_by_id(
        contacts[0],
        CONTACT_PROJECT_ACCESS_COLUMN_ID,
    )
    return (access_column or {}).get("linked_items") or []


def fetch_monday_projects_by_ids(project_ids):
    if not project_ids:
        return []

    ids = ", ".join(str(project_id) for project_id in project_ids)

    query = (
        f"query {{ "
        f"boards(ids: {PROJECTS_BOARD_ID}) {{ "
        f"items_page(query_params: {{ ids: [{ids}] }}) {{ "
        f"items {{ "
        f"id name created_at updated_at state "
        f"column_values {{ "
        f"id text value column {{ title }} "
        f"... on MirrorValue {{ display_value }} "
        f"{BOARD_RELATION_VALUE_QUERY}"
        f"... on DependencyValue {{ display_value linked_item_ids linked_items {{ id name }} }} "
        f"... on StatusValue {{ label updated_at label_style {{ color }} }} "
        f"... on NumbersValue {{ symbol direction }} "
        f"}} "
        f"assets {{ id name url public_url file_extension }} "
        f"}} "
        f"}} "
        f"}} "
        f"}}"
    )

    crm_response = fetch_crm_data(query)
    return extract_items_from_crm_response(crm_response)


def fetch_monday_projects_by_email(email):
    if not email:
        return []

    query = (
        f"query {{ "
        f"boards(ids: {PROJECTS_BOARD_ID}) {{ "
        f"items_page(limit: 500) {{ "
        f"items {{ "
        f"id name created_at updated_at state "
        f"column_values {{ "
        f"id text value column {{ title }} "
        f"... on MirrorValue {{ display_value }} "
        f"{BOARD_RELATION_VALUE_QUERY}"
        f"... on DependencyValue {{ display_value linked_item_ids linked_items {{ id name }} }} "
        f"... on StatusValue {{ label updated_at label_style {{ color }} }} "
        f"... on NumbersValue {{ symbol direction }} "
        f"}} "
        f"assets {{ id name url public_url file_extension }} "
        f"}} "
        f"}} "
        f"}} "
        f"}}"
    )

    crm_response = fetch_crm_data(query)
    projects = extract_items_from_crm_response(crm_response)

    return [
        project
        for project in projects
        if email_matches_value(get_column_text(project, "Email"), email)
    ]


def fetch_monday_users_by_ids(user_ids):
    normalized_ids = [
        str(user_id)
        for user_id in user_ids
        if str(user_id or "").strip().isdigit()
    ]

    if not normalized_ids:
        return {}

    ids = ", ".join(normalized_ids)
    query = (
        f"query {{ "
        f"users(ids: [{ids}]) {{ "
        f"id name email "
        f"}} "
        f"}}"
    )

    crm_response = fetch_crm_data(query)
    users = crm_response.get("data", {}).get("users") or crm_response.get("users") or []

    return {
        str(user.get("id")): user
        for user in users
        if user.get("id")
    }


def fetch_exponet_project_details(exponet_id):
    if not exponet_id:
        return {}

    exponet_url = f"{settings.EXPONET_API_BASE_URL}/projects/{exponet_id}"

    try:
        return fetch_exponet_json(exponet_url)
    except Exception:
        return {}


def normalize_exponet_project_response(exponet_response):
    if not exponet_response:
        return {}

    if isinstance(exponet_response, dict):
        data = exponet_response.get("data", exponet_response)

        if isinstance(data, list):
            return data[0] if data else {}

        if isinstance(data, dict):
            return data

    return {}


def translate_password_error(message):
    translations = {
        "This password is too short. It must contain at least 8 characters.": "הסיסמה קצרה מדי. היא חייבת להכיל לפחות 8 תווים.",
        "This password is too common.": "הסיסמה נפוצה מדי ויש לבחור סיסמה חזקה יותר.",
        "This password is entirely numeric.": "הסיסמה לא יכולה להכיל רק מספרים.",
    }

    if "too similar" in message:
        return "הסיסמה דומה מדי לפרטים האישיים שלך. יש לבחור סיסמה אחרת."

    return translations.get(message, message)


def translate_password_errors(messages):
    return [translate_password_error(message) for message in messages]


class PasswordResetRequestView(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        email = request.data.get("email", "").strip().lower()

        if not email:
            return Response(
                {"error": "Email is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = CustomUser.objects.filter(email=email, is_active=True).first()

        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            frontend_url = getattr(
                settings,
                "FRONTEND_URL",
                "http://localhost:5173",
            ).rstrip("/")
            reset_link = f"{frontend_url}/reset-password/{uid}/{token}"

            user_name = getattr(user, "name", "") or user.email
            safe_user_name = escape(user_name)
            safe_reset_link = escape(reset_link)

            subject = "איפוס סיסמה למערכת Calibrate"

            text_message = (
                f"שלום {user_name},\n\n"
                f"התקבלה בקשה לאיפוס הסיסמה שלך במערכת Calibrate.\n\n"
                f"כדי לבחור סיסמה חדשה, לחצי על הקישור הבא:\n"
                f"{reset_link}\n\n"
                f"אם לא את ביקשת לאפס את הסיסמה, אפשר להתעלם מהמייל הזה.\n"
            )

            html_message = f"""
            <!DOCTYPE html>
            <html lang="he" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>איפוס סיסמה</title>
            </head>
            <body style="
                margin: 0;
                padding: 0;
                background-color: #F4F6F8;
                font-family: Arial, sans-serif;
                direction: rtl;
            ">
                <div style="
                    max-width: 580px;
                    margin: 32px auto;
                    padding: 0 16px;
                ">
                    <div style="
                        background-color: #FFFFFF;
                        border: 1px solid #D1D5DB;
                        border-radius: 14px;
                        padding: 28px;
                        color: #2C3338;
                        line-height: 1.7;
                        box-shadow: 0 8px 24px rgba(44, 51, 56, 0.06);
                    ">
                        <h2 style="
                            margin: 0 0 18px;
                            color: #1F3550;
                            font-size: 24px;
                            font-weight: 500;
                            text-align: right;
                        ">
                            איפוס סיסמה
                        </h2>

                        <p style="margin: 0 0 14px; font-size: 15px;">
                            שלום {safe_user_name},
                        </p>

                        <p style="margin: 0 0 14px; font-size: 15px;">
                            התקבלה בקשה לאיפוס הסיסמה שלך במערכת Calibrate.
                        </p>

                        <p style="margin: 0 0 22px; font-size: 15px;">
                            כדי לבחור סיסמה חדשה, לחצי על הכפתור הבא:
                        </p>

                        <div style="text-align: center; margin: 28px 0;">
                            <a href="{safe_reset_link}" style="
                                display: inline-block;
                                padding: 13px 28px;
                                background-color: #4A6076;
                                color: #FFFFFF;
                                text-decoration: none;
                                border-radius: 8px;
                                font-size: 15px;
                                font-weight: 500;
                            ">
                                איפוס סיסמה
                            </a>
                        </div>

                        <p style="margin: 0 0 8px; font-size: 14px; color: #607080;">
                            אם הכפתור לא עובד, אפשר להעתיק את הקישור הבא לדפדפן:
                        </p>

                        <p dir="ltr" style="
                            margin: 0 0 20px;
                            word-break: break-all;
                            text-align: left;
                            font-size: 13px;
                            line-height: 1.6;
                        ">
                            <a href="{safe_reset_link}" style="color: #4A6076;">
                                {safe_reset_link}
                            </a>
                        </p>

                        <p style="
                            margin: 0;
                            color: #607080;
                            font-size: 13px;
                        ">
                            אם לא את ביקשת לאפס את הסיסמה, אפשר להתעלם מהמייל הזה.
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """

            email_message = EmailMultiAlternatives(
                subject=subject,
                body=text_message,
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
                to=[user.email],
            )

            email_message.attach_alternative(html_message, "text/html")
            email_message.send(fail_silently=False)

        return Response(
            {"message": "If the email exists, a password reset link was sent."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        uid = request.data.get("uid")
        token = request.data.get("token")
        new_password = request.data.get("new_password")
        confirm_password = request.data.get("confirm_password")

        if not uid or not token or not new_password or not confirm_password:
            return Response(
                {"error": "יש למלא את כל השדות."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_password != confirm_password:
            return Response(
                {"error": "הסיסמאות אינן תואמות."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = CustomUser.objects.get(pk=user_id, is_active=True)
        except Exception:
            return Response(
                {"error": "קישור האיפוס אינו תקין."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {"error": "קישור האיפוס אינו תקין או שפג תוקפו."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user=user)
        except ValidationError as error:
            translated_errors = translate_password_errors(error.messages)

            return Response(
                {
                    "error": " ".join(translated_errors),
                    "password_errors": translated_errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.force_password_change = False
        user.save(update_fields=["password", "force_password_change"])

        return Response(
            {"message": "הסיסמה עודכנה בהצלחה."},
            status=status.HTTP_200_OK,
        )


class ProjectsByUserEmailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        email = request.query_params.get("email") or request.user.email
        email = (email or "").strip().lower()

        if not email:
            return Response(
                {"detail": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        contact = None
        monday_projects = []

        try:
            contact = find_contact_by_email(email)
        except urllib.error.HTTPError as error:
            return Response(
                {
                    "detail": "Failed to fetch contacts from CRM.",
                    "status_code": error.code,
                    "error": get_http_error_body(error),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except MondayAPIError as error:
            return Response(
                {
                    "detail": "Failed to fetch contacts from CRM.",
                    "error": str(error),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as error:
            return Response(
                {
                    "detail": "Unexpected server error while fetching contacts.",
                    "error": str(error),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if contact:
            try:
                monday_projects = fetch_monday_projects_for_contact(contact.get("id"))
            except urllib.error.HTTPError as error:
                return Response(
                    {
                        "detail": "Failed to fetch project access from CRM.",
                        "status_code": error.code,
                        "error": get_http_error_body(error),
                    },
                    status=status.HTTP_502_BAD_GATEWAY,
                )
            except MondayAPIError as error:
                return Response(
                    {
                        "detail": "Failed to fetch project access from CRM.",
                        "error": str(error),
                    },
                    status=status.HTTP_502_BAD_GATEWAY,
                )
            except Exception as error:
                return Response(
                    {
                        "detail": "Unexpected server error while fetching project access.",
                        "error": str(error),
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        contact_payload = None

        if contact:
            contact_payload = {
                "id": contact.get("id"),
                "name": get_column_text(contact, "שם איש קשר") or contact.get("name"),
                "email": get_column_text(contact, "מייל") or email,
                "phone": get_column_text(contact, "טלפון"),
                "exponet_id": get_column_text(contact, "exponetID"),
            }
        else:
            contact_payload = {
                "id": None,
                "name": request.user.name,
                "email": email,
                "phone": "",
                "exponet_id": "",
            }

        projects = []

        for monday_project in monday_projects:
            monday_project_id = monday_project.get("id")
            monday_project_name = monday_project.get("name")
            exponet_id = get_column_text(monday_project, "exponetID")
            monday_city = get_monday_column_display_value(
                get_column_by_id(monday_project, PROJECT_CITY_COLUMN_ID)
            )
            monday_address = get_monday_column_display_value(
                get_column_by_id(monday_project, PROJECT_ADDRESS_COLUMN_ID)
            )
            monday_project_number = get_monday_column_display_value(
                get_column_by_id(monday_project, PROJECT_NUMBER_COLUMN_ID)
            )
            monday_project_stage = get_monday_column_display_value(
                get_column_by_id(monday_project, PROJECT_STATUS_COLUMN_ID)
            )
            monday_control_type = get_monday_column_display_value(
                get_column_by_id(monday_project, PROJECT_EXISTING_STATUS_COLUMN_ID)
            )
            monday_status = monday_project_stage or monday_control_type

            exponet_response = fetch_exponet_project_details(exponet_id)
            exponet_project = normalize_exponet_project_response(exponet_response)

            title = (
                    exponet_project.get("title")
                    or monday_project_name
                    or "פרויקט ללא שם"
            )

            address = exponet_project.get("address") or monday_address or ""

            status_name = (
                    exponet_project.get("statusName")
                    or monday_status
                    or get_column_text(monday_project, "סטטוס")
                    or "לא הוגדר"
            )

            project_type_name = (
                    exponet_project.get("projectTypeName")
                    or get_column_text(monday_project, "סוג פרוייקט")
                    or "לא הוגדר"
            )
            escort_team = enrich_escort_team_with_monday_users(
                extract_project_escort_team_from_monday(monday_project)
            )

            projects.append(
                {
                    "id": monday_project_id,
                    "project_id": monday_project_id,
                    "monday_project_id": monday_project_id,
                    "name": title,
                    "title": title,
                    "city": monday_city,
                    "address": address,
                    "project_number": monday_project_number,
                    "project_stage": monday_project_stage,
                    "project_status": monday_project_stage,
                    "control_type": monday_control_type,
                    "status": status_name,
                    "type": project_type_name,
                    "exponet_id": exponet_id,
                    "exponet_project_id": exponet_project.get("id"),
                    "bc_project_id": exponet_project.get("bcProjectId"),
                    "permit_number": exponet_project.get("permitNumber"),
                    "plot": exponet_project.get("plot"),
                    "bloc": exponet_project.get("bloc"),
                    "escortTeam": escort_team,
                    "escort_team": escort_team,
                }
            )

        return Response(
            {
                "contact": contact_payload,
                "projects": projects,
            },
            status=status.HTTP_200_OK,
        )


def get_completion_mock_files():
    if not COMPLETION_MOCK_FILES_DIR.exists():
        return []

    return sorted(
        [
            file_path
            for file_path in COMPLETION_MOCK_FILES_DIR.iterdir()
            if file_path.is_file() and file_path.suffix.lower() == ".pdf"
        ],
        key=lambda file_path: file_path.name,
    )


def build_completion_document_from_file(file_path, index):
    document_statuses = ["בטיפול", "חסר", "ממתין לבדיקה", "הושלם"]
    document_types = [
        "מסמך תעודת גמר",
        "אישור מקצועי",
        "בדיקות ואישורים",
        "מסמך סופי",
    ]

    status_name = document_statuses[index % len(document_statuses)]
    document_type = document_types[index % len(document_types)]

    return {
        "id": index + 1,
        "title": file_path.stem,
        "date": "- - -",
        "status": status_name,
        "type": document_type,
        "description": "מסמך דמו לתצוגת צפייה והורדה עד לחיבור הנתיב האמיתי מה-CRM.",
        "fileId": file_path.name,
        "fileName": file_path.name,
    }


class ProjectCompletionDocumentsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        mock_files = get_completion_mock_files()

        documents = [
            build_completion_document_from_file(file_path, index)
            for index, file_path in enumerate(mock_files)
        ]

        return Response(
            {
                "project_id": project_id,
                "documents": documents,
            },
            status=status.HTTP_200_OK,
        )


class CompletionDocumentFileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, file_id):
        disposition = request.query_params.get("disposition", "inline")

        if disposition not in ["inline", "attachment"]:
            disposition = "inline"

        safe_file_name = Path(file_id).name
        file_path = COMPLETION_MOCK_FILES_DIR / safe_file_name

        if (
                not file_path.exists()
                or not file_path.is_file()
                or file_path.suffix.lower() != ".pdf"
        ):
            return Response(
                {"detail": "File not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return FileResponse(
            open(file_path, "rb"),
            as_attachment=disposition == "attachment",
            filename=safe_file_name,
            content_type="application/pdf",
        )


def get_exponet_id_from_monday_project(project_id):
    monday_query = (
        f"query {{ "
        f"boards(ids: {PROJECTS_BOARD_ID}) {{ "
        f"items_page(query_params: {{ ids: [{project_id}] }}) {{ "
        f"items {{ "
        f"id name "
        f"column_values {{ "
        f"id text value column {{ title }} "
        f"}} "
        f"}} "
        f"}} "
        f"}} "
        f"}}"
    )

    try:
        monday_response = fetch_crm_data(monday_query)
    except Exception:
        return str(project_id)

    items = extract_items_from_crm_response(monday_response)

    if not items:
        return str(project_id)

    exponet_id = get_column_text(items[0], "exponetID")
    return exponet_id or str(project_id)


def get_filtered_missing_document_items(project_id):
    exponet_project_id = get_exponet_id_from_monday_project(project_id)

    exponet_url = (
        f"{settings.EXPONET_API_BASE_URL}/projects/"
        f"{exponet_project_id}/items?include_files=true"
    )

    exponet_response = fetch_exponet_json(exponet_url)
    raw_items = exponet_response.get("data", exponet_response)

    if isinstance(raw_items, dict):
        raw_items = raw_items.get("items", [])

    if not isinstance(raw_items, list):
        raw_items = []

    excluded_statuses = {
        "Approved",
        "NotRelevant",
        "Not Relevant",
        "Irrelevant",
        "לא רלוונטי",
        "אושר",
    }

    filtered_items = []

    for item in raw_items:
        review_status_name = item.get("reviewStatusName")

        if review_status_name in excluded_statuses:
            continue

        files = item.get("files") or []

        filtered_items.append(
            build_document_item_response(
                {
                    **item,
                    "reviewStatusName": review_status_name,
                    "fileCount": item.get("fileCount", len(files)),
                    "files": files,
                }
            )
        )

    return exponet_project_id, filtered_items


class ProjectMissingDocumentsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        if not re.fullmatch(r"\d+", str(project_id)):
            return Response(
                {"detail": "Invalid project ID"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            exponet_project_id, filtered_items = get_filtered_missing_document_items(project_id)
        except urllib.error.HTTPError:
            return Response(
                {"detail": "Failed to fetch project items from Exponet"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception:
            return Response(
                {"detail": "Unexpected server error while fetching project items"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "project_id": project_id,
                "exponet_project_id": exponet_project_id,
                "items": filtered_items,
            },
            status=status.HTTP_200_OK,
        )


class ProjectRequiredDocumentsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        if not re.fullmatch(r"\d+", str(project_id)):
            return Response(
                {"detail": "Invalid project ID"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        requested_stage = (request.query_params.get("stage") or "").strip().lower()

        if requested_stage and requested_stage != "taas":
            return Response(
                {"detail": "Invalid documents stage"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        exponet_project_id = None

        if requested_stage == "taas":
            query = urllib.parse.urlencode({"stage": requested_stage})
            exponet_url = f"{settings.EXPONET_API_BASE_URL}/templates?{query}"
        else:
            exponet_project_id = get_exponet_id_from_monday_project(project_id)
            exponet_url = (
                f"{settings.EXPONET_API_BASE_URL}/projects/"
                f"{exponet_project_id}/items?include_files=true"
            )

        try:
            exponet_response = fetch_exponet_json(exponet_url)
        except urllib.error.HTTPError:
            return Response(
                {"detail": "Failed to fetch project items from Exponet"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception:
            return Response(
                {"detail": "Unexpected server error while fetching project items"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        raw_items = exponet_response.get("data", exponet_response)

        if isinstance(raw_items, dict):
            raw_items = raw_items.get("items") or raw_items.get("templates") or []

        if not isinstance(raw_items, list):
            raw_items = []

        required_items = [build_document_item_response(item) for item in raw_items]

        return Response(
            {
                "project_id": project_id,
                "exponet_project_id": exponet_project_id,
                "stage": requested_stage or "project",
                "items": required_items,
            },
            status=status.HTTP_200_OK,
        )


def get_file_column_assets(item, column_id, column_title):
    columns = item.get("column_values", [])
    file_column = next(
        (
            column
            for column in columns
            if column.get("id") == column_id
               or ((column.get("column") or {}).get("title") or "").strip() == column_title
        ),
        None,
    )

    if not file_column:
        return []

    column_files = file_column.get("files") or []

    if column_files:
        return column_files

    asset_ids = []

    try:
        column_value = json.loads(file_column.get("value") or "{}")
        raw_files = column_value.get("files") or []
        asset_ids = [
            str(file.get("assetId") or file.get("asset_id") or file.get("id"))
            for file in raw_files
            if file.get("assetId") or file.get("asset_id") or file.get("id")
        ]
    except (TypeError, ValueError):
        asset_ids = []

    item_assets = item.get("assets") or []

    if not asset_ids:
        return item_assets

    return [
        asset
        for asset in item_assets
        if str(asset.get("id")) in asset_ids
    ]


class ProjectLabTestsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        if not re.fullmatch(r"\d+", str(project_id)):
            return Response(
                {"detail": "Invalid project ID"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        query = (
            f"query {{ "
            f"boards(ids: {PROJECTS_BOARD_ID}) {{ "
            f"items_page(query_params: {{ ids: [{project_id}] }}) {{ "
            f"items {{ "
            f"id name created_at updated_at state "
            f"column_values(ids: [\"file_mm3gzpf0\"]) {{ "
            f"id text value column {{ title }} "
            f"}} "
            f"assets {{ id name url public_url file_extension }} "
            f"}} "
            f"}} "
            f"}} "
            f"}}"
        )

        try:
            crm_response = fetch_crm_data(query)
        except urllib.error.HTTPError as error:
            return Response(
                {
                    "detail": "Failed to fetch lab tests from CRM",
                    "status_code": error.code,
                    "error": get_http_error_body(error),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as error:
            return Response(
                {
                    "detail": "Unexpected server error while fetching lab tests",
                    "error": str(error),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if crm_response.get("errors"):
            return Response(
                {
                    "detail": "CRM returned an error",
                    "errors": crm_response.get("errors"),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        items = extract_items_from_crm_response(crm_response)

        if not items:
            return Response(
                {"detail": "Project not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        item = items[0]
        assets = get_file_column_assets(
            item,
            "file_mm3gzpf0",
            "בדיקות מעבדה לא תקינות",
        )

        documents = []

        for index, asset in enumerate(assets):
            file_extension = asset.get("file_extension") or ""
            file_name = asset.get("name") or f"בדיקת מעבדה {index + 1}"

            documents.append(
                {
                    "id": asset.get("id") or f"lab-document-{index}",
                    "asset_id": asset.get("id"),
                    "name": file_name,
                    "file_name": file_name,
                    "url": asset.get("public_url") or asset.get("url") or "",
                    "public_url": asset.get("public_url") or "",
                    "download_url": asset.get("url") or asset.get("public_url") or "",
                    "file_extension": file_extension,
                }
            )

        tests = []

        if documents:
            tests.append(
                {
                    "id": f"project-{project_id}-lab-tests",
                    "title": "בדיקות מעבדה לא תקינות",
                    "description": "מסמכי בדיקות מעבדה לא תקינות מתוך הפרויקט ב-CRM.",
                    "status": "דורש טיפול",
                    "updated_at": item.get("updated_at") or "",
                    "documents": documents,
                }
            )

        return Response(
            {
                "project_id": project_id,
                "column_id": "file_mm3gzpf0",
                "column_title": "בדיקות מעבדה לא תקינות",
                "tests": tests,
                "documents": documents,
                "files": documents,
            },
            status=status.HTTP_200_OK,
        )


class ExponetFileDownloadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, file_id):
        if not re.fullmatch(r"\d+", str(file_id)):
            return Response(
                {"detail": "Invalid file ID"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        disposition = request.query_params.get("disposition", "attachment")

        if disposition not in ["inline", "attachment"]:
            disposition = "attachment"

        try:
            file_response = fetch_exponet_file(file_id)
            file_content = file_response.read()
        except urllib.error.HTTPError:
            return Response(
                {"detail": "Failed to download file from Exponet"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception:
            return Response(
                {"detail": "Unexpected server error while downloading file"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        content_type = file_response.headers.get("Content-Type", "application/octet-stream")
        filename = request.query_params.get("filename") or f"file-{file_id}"

        response = HttpResponse(
            file_content,
            content_type=content_type,
        )

        response["Content-Disposition"] = f'{disposition}; filename="{filename}"'
        return response


class ExponetZipEntriesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_zip_content(self, file_id):
        file_response = fetch_exponet_file(file_id)
        return file_response.read()

    def get(self, request, file_id):
        if not re.fullmatch(r"\d+", str(file_id)):
            return Response(
                {"detail": "Invalid file ID"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            zip_content = self.get_zip_content(file_id)

            with zipfile.ZipFile(BytesIO(zip_content)) as archive:
                entries = [
                    {
                        "name": info.filename,
                        "size": info.file_size,
                    }
                    for info in archive.infolist()
                    if not info.is_dir()
                ]
        except zipfile.BadZipFile:
            return Response(
                {"detail": "File is not a valid ZIP archive"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except urllib.error.HTTPError:
            return Response(
                {"detail": "Failed to download file from Exponet"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception:
            return Response(
                {"detail": "Unexpected server error while reading ZIP file"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"entries": entries}, status=status.HTTP_200_OK)


class ExponetZipEntryDownloadView(ExponetZipEntriesView):
    def get(self, request, file_id):
        entry_name = request.query_params.get("entry")

        if not entry_name:
            return Response(
                {"detail": "ZIP entry is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not re.fullmatch(r"\d+", str(file_id)):
            return Response(
                {"detail": "Invalid file ID"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            zip_content = self.get_zip_content(file_id)

            with zipfile.ZipFile(BytesIO(zip_content)) as archive:
                if entry_name not in archive.namelist():
                    return Response(
                        {"detail": "ZIP entry not found"},
                        status=status.HTTP_404_NOT_FOUND,
                    )

                entry_content = archive.read(entry_name)
        except zipfile.BadZipFile:
            return Response(
                {"detail": "File is not a valid ZIP archive"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except urllib.error.HTTPError:
            return Response(
                {"detail": "Failed to download file from Exponet"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception:
            return Response(
                {"detail": "Unexpected server error while extracting ZIP entry"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        filename = Path(entry_name).name
        response = HttpResponse(entry_content, content_type="application/octet-stream")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class ExponetTemplateFileDownloadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        file_id = request.data.get("file_id")
        file_url = request.data.get("file_url")
        filename = Path(request.data.get("filename") or "template-file").name

        try:
            if file_id:
                file_response = fetch_exponet_file(str(file_id))
            elif file_url:
                file_response = fetch_exponet_file_url(str(file_url))
            else:
                return Response(
                    {"detail": "Template file ID or URL is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            file_content = file_response.read()
        except urllib.error.HTTPError:
            return Response(
                {"detail": "Failed to download template file from Exponet"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception:
            return Response(
                {"detail": "Unexpected server error while downloading template file"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        content_type = file_response.headers.get("Content-Type", "application/octet-stream")
        upstream_filename = get_filename_from_content_disposition(
            file_response.headers.get("Content-Disposition", "")
        )
        filename = Path(upstream_filename or filename).name
        filename = ensure_filename_extension(filename, content_type)

        response = HttpResponse(file_content, content_type=content_type)
        response["Content-Disposition"] = content_disposition_header(
            as_attachment=True,
            filename=filename,
        )
        return response


def normalize_email_text(value):
    text = str(value or "")
    text = text.replace("\r\n", "\n").replace("\r", "\n").replace("\xa0", " ")

    cleaned_lines = []
    previous_line_blank = False

    for raw_line in text.split("\n"):
        line = re.sub(r"[ \t]+", " ", raw_line).strip()

        if not line:
            if cleaned_lines and not previous_line_blank:
                cleaned_lines.append("")
            previous_line_blank = True
            continue

        cleaned_lines.append(line)
        previous_line_blank = False

    return "\n".join(cleaned_lines).strip()


def is_html_email_body(value):
    return bool(
        re.search(
            r"</?(html|body|div|span|bdi|table|thead|tbody|tr|th|td|p|br|"
            r"h[1-6]|strong|b|em|i|ul|ol|li|a)\b",
            str(value or ""),
            flags=re.IGNORECASE,
        )
    )


ALLOWED_EMAIL_HTML_TAGS = {
    "a",
    "b",
    "bdi",
    "body",
    "br",
    "div",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "head",
    "html",
    "i",
    "li",
    "meta",
    "ol",
    "p",
    "span",
    "strong",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "ul",
}

ALLOWED_EMAIL_HTML_ATTRIBUTES = {
    "align",
    "cellpadding",
    "cellspacing",
    "class",
    "dir",
    "height",
    "href",
    "lang",
    "style",
    "target",
    "title",
    "width",
}


def sanitize_email_style(value):
    style = str(value or "")

    if re.search(r"expression\s*\(|javascript\s*:|behavior\s*:|@import", style, re.IGNORECASE):
        return ""

    return style


def sanitize_email_href(value):
    href = str(value or "").strip()

    if not href:
        return ""

    if re.match(r"^(https?:|mailto:|tel:|#)", href, flags=re.IGNORECASE):
        return href

    return ""


class EmailHTMLSanitizer(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.parts = []

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()

        if tag not in ALLOWED_EMAIL_HTML_TAGS:
            return

        clean_attrs = []

        for attr, value in attrs:
            attr = attr.lower()

            if attr not in ALLOWED_EMAIL_HTML_ATTRIBUTES:
                continue

            if attr == "style":
                value = sanitize_email_style(value)
            elif attr == "href":
                value = sanitize_email_href(value)

            if value:
                clean_attrs.append(f'{attr}="{html_lib.escape(str(value), quote=True)}"')

        attrs_text = f" {' '.join(clean_attrs)}" if clean_attrs else ""
        self.parts.append(f"<{tag}{attrs_text}>")

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

        if tag.lower() in ALLOWED_EMAIL_HTML_TAGS:
            self.parts.append(f"</{tag.lower()}>")

    def handle_endtag(self, tag):
        tag = tag.lower()

        if tag in ALLOWED_EMAIL_HTML_TAGS:
            self.parts.append(f"</{tag}>")

    def handle_data(self, data):
        self.parts.append(html_lib.escape(data))

    def handle_entityref(self, name):
        self.parts.append(f"&{name};")

    def handle_charref(self, name):
        self.parts.append(f"&#{name};")

    def get_html(self):
        return "".join(self.parts)


def sanitize_email_html(value):
    sanitizer = EmailHTMLSanitizer()
    sanitizer.feed(str(value or ""))
    sanitizer.close()
    return sanitizer.get_html().strip()


def clean_html_email_body(value):
    text = str(value or "").replace("\r\n", "\n").replace("\r", "\n")
    non_empty_lines = [line.strip() for line in text.split("\n") if line.strip()]
    compact_html = "\n".join(non_empty_lines)
    return re.sub(r">\s+<", "><", compact_html).strip()


def extract_html_body_content(value):
    match = re.search(
        r"<body\b[^>]*>(.*?)</body>",
        str(value or ""),
        flags=re.IGNORECASE | re.DOTALL,
    )

    if match:
        return match.group(1).strip()

    return str(value or "").strip()


def html_email_to_text(value):
    text = str(value or "")
    text = re.sub(r"(?i)<br\s*/?>", "\n", text)
    text = re.sub(r"(?i)</(p|div|tr|h[1-6])>", "\n", text)
    text = strip_tags(text)
    return normalize_email_text(html_lib.unescape(text))


def build_admin_message_html(user_name, user_email, user_role, project_id, message):
    message_html = extract_html_body_content(message)

    try:
        return render_to_string(
            "emails/admin_message.html",
            {
                "user_name": user_name,
                "user_email": user_email,
                "user_role": user_role,
                "project_id": project_id or "לא נשלח",
                "message_html": message_html,
            },
        ).strip()
    except Exception as error:
        print("Failed to render admin message email template:", error)
        return message


class AdminMessageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        raw_message = request.data.get("message") or ""
        message_is_html = is_html_email_body(raw_message)
        message = (
            sanitize_email_html(clean_html_email_body(raw_message))
            if message_is_html
            else normalize_email_text(raw_message)
        )
        project_id = request.data.get("project_id")

        if not message:
            return Response(
                {"detail": "Message is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not getattr(settings, "DEFAULT_FROM_EMAIL", None):
            return Response(
                {"detail": "DEFAULT_FROM_EMAIL is not configured"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if not getattr(settings, "ADMIN_EMAIL", None):
            return Response(
                {"detail": "ADMIN_EMAIL is not configured"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        user = request.user

        user_name = getattr(user, "name", "") or "לא צוין"
        user_email = getattr(user, "email", "") or "לא צוין"
        user_role = getattr(user, "role", "") or "לא צוין"

        subject = "פנייה חדשה דרך מר בקר"

        message_text = html_email_to_text(message) if message_is_html else message
        body = (
            "התקבלה פנייה חדשה ממשתמש במערכת Calibrate:\n\n"
            f"שם משתמש: {user_name}\n"
            f"אימייל משתמש: {user_email}\n"
            f"תפקיד: {user_role}\n"
            f"מזהה פרויקט: {project_id or 'לא נשלח'}\n\n"
            "תוכן ההודעה:\n"
            f"{message_text}\n"
        )
        body = normalize_email_text(body)

        try:
            if message_is_html:
                email_message = EmailMultiAlternatives(
                    subject=subject,
                    body=body,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[settings.ADMIN_EMAIL],
                )
                email_message.attach_alternative(
                    build_admin_message_html(
                        user_name=user_name,
                        user_email=user_email,
                        user_role=user_role,
                        project_id=project_id,
                        message=message,
                    ),
                    "text/html",
                )
                email_message.send(fail_silently=False)
            else:
                send_mail(
                    subject=subject,
                    message=body,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[settings.ADMIN_EMAIL],
                    fail_silently=False,
                )
        except Exception as error:
            return Response(
                {
                    "detail": "Failed to send email to admin",
                    "error": str(error),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"message": "ההודעה נשלחה למנהל בהצלחה"},
            status=status.HTTP_200_OK,
        )


class ProjectTrackingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        if not re.fullmatch(r"\d+", str(project_id)):
            return Response(
                {"detail": "Invalid project ID"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        query = (
            f"query {{ "
            f"boards(ids: {PROJECTS_BOARD_ID}) {{ "
            f"items_page(query_params: {{ ids: [{project_id}] }}) {{ "
            f"items {{ "
            f"id name created_at updated_at state "
            f"column_values {{ "
            f"id text value column {{ title }} "
            f"... on MirrorValue {{ display_value }} "
            f"{BOARD_RELATION_VALUE_QUERY}"
            f"... on DependencyValue {{ display_value linked_item_ids linked_items {{ id name }} }} "
            f"... on StatusValue {{ label updated_at label_style {{ color }} }} "
            f"... on NumbersValue {{ symbol direction }} "
            f"}} "
            f"assets {{ id name url public_url file_extension }} "
            f"}} "
            f"}} "
            f"}} "
            f"}}"
        )

        try:
            proxy_response = fetch_crm_data(query)
        except urllib.error.HTTPError as error:
            return Response(
                {
                    "detail": "Failed to fetch project from CRM",
                    "status_code": error.code,
                    "error": get_http_error_body(error),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as error:
            return Response(
                {
                    "detail": "Unexpected server error",
                    "error": str(error),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if proxy_response.get("errors"):
            return Response(
                {
                    "detail": "CRM returned an error",
                    "errors": proxy_response.get("errors"),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        items = extract_items_from_crm_response(proxy_response)

        if not items:
            return Response(
                {"detail": "Project not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        item = items[0]

        def get_column_by_id_or_title(column_id, title):
            return get_column_by_id(item, column_id) or get_column_by_title(item, title)

        def get_value(column_id, title, default=""):
            column = get_column_by_id_or_title(column_id, title)

            return get_monday_column_display_value(column, default)

        def get_date(column_id, title):
            return get_value(column_id, title) or None

        def get_column_json_value(column):
            if not column:
                return {}

            raw_value = column.get("value")

            if not raw_value:
                return {}

            try:
                return json.loads(raw_value)
            except (TypeError, json.JSONDecodeError):
                return {}

        def get_updated_at(column_id, title):
            column = get_column_by_id_or_title(column_id, title)
            value = get_column_json_value(column)

            return value.get("changed_at") or (column or {}).get("updated_at")

        def get_first_value(*column_refs):
            for column_id, title in column_refs:
                value = get_value(column_id, title)

                if value:
                    return value

            return ""

        def get_first_file_url(*titles):
            for title in titles:
                file_url = get_column_file_url(item, title)

                if file_url:
                    return file_url

            return ""

        response_payload = {
            "id": item.get("id"),
            "name": item.get("name"),
            "project_stage": get_value("project_status", "שלב בפרוייקט"),
            "project_status": get_value("project_status", "שלב בפרוייקט"),
            "exponet_status": get_value("color_mm2ewncv", "סטטוס אקספונט"),
            "intake_process": get_value("color_mm2epwsy", "תהליך קליטה"),
            "intake_process_date": get_updated_at("color_mm2epwsy", "תהליך קליטה"),
            "project_type": get_first_value(
                ("color_mm1grhfm", "סוג בקרה"),
                ("", "סוג פרוייקט"),
            ),
            "control_type": get_first_value(
                ("color_mm1grhfm", "סוג בקרה"),
                ("", "סוג פרוייקט"),
            ),
            "client_name": get_value("", "לקוח"),
            "client_email": get_value("", "Email"),
            "water_corporation_process": get_value("text_mm1jhkrv", "תאגיד מים"),
            "interim_report_number": get_value("text_mm1jky2w", "מספר דוח ביניים"),
            "final_report_number": get_first_value(
                ("", "מספר דוח מסכם"),
                ("", "מספר דוח פרויקט לאישור"),
                ("", "מספר דוח פרוייקט לאישור"),
            ),
            "interim_report_url": get_first_file_url(
                "דוח ביניים",
                "דו״ח ביניים",
                "מספר דוח ביניים",
            ),
            "final_report_url": get_first_file_url(
                "דוח מסכם",
                "דו״ח מסכם",
                "מספר דוח מסכם",
            ),
            "interim_target_date": get_date("date_mm2ec1y7", "תאריך יעד דו״ח ביניים"),
            "final_target_date": get_date("date_mm2e1cha", "תאריך יעד דו״ח מסכם"),
            "documents": [
                {
                    "title": "תכנית ראשית",
                    "status": get_value("", "תכנית ראשית", "לא זמין"),
                },
                {
                    "title": "נספח יציבות",
                    "status": get_value("", "נספח יציבות", "לא זמין"),
                },
                {
                    "title": "דו״ח קרקע",
                    "status": get_value("", "דו״ח קרקע", "לא זמין"),
                },
                {
                    "title": "נספח סניטרי/בטיחות",
                    "status": get_value("", "נספח סניטרי/בטיחות", "לא זמין"),
                },
            ],
        }

        return Response(response_payload, status=status.HTTP_200_OK)



def get_project_escort_column(item):
    columns = item.get("column_values", [])

    return next(
        (
            column
            for column in columns
            if column.get("id") == PROJECT_ESCORT_TEAM_COLUMN_ID
               or ((column.get("column") or {}).get("title") or "").strip() == "צוות מלווה"
        ),
        None,
    )


def get_linked_item_column_text(linked_item, column_id):
    column = get_column_by_id(linked_item, column_id)

    return get_monday_column_display_value(column).strip()


def normalize_escort_team_member(linked_item, index):
    member_id = str(linked_item.get("id") or f"escort-team-{index}")
    name = (linked_item.get("name") or "").strip()
    contact_name = get_linked_item_column_text(linked_item, "text_mm1h52s3")
    email = get_linked_item_column_text(linked_item, "email_mm1hke1")
    phone = get_linked_item_column_text(linked_item, "phone_mm1hae40")
    status_value = get_linked_item_column_text(linked_item, "color_mm3xs6pb")

    return {
        "id": member_id,
        "name": name,
        "contactName": contact_name,
        "phone": phone,
        "email": email,
        "status": status_value,
        "userId": member_id,
        "title": name,
        "fullName": contact_name or name,
        "role": "צוות מלווה",
        "subjects": [],
        "source": "monday-board-relation",
        "raw": linked_item,
    }


def normalize_escort_team_person(person, index, fallback_name=""):
    member_id = str(person.get("id") or f"escort-team-person-{index}")
    fallback_display_name = f"משתמש Monday {member_id}" if member_id else "חבר צוות"
    name = (fallback_name or "").strip() or fallback_display_name

    return {
        "id": member_id,
        "name": name,
        "contactName": name,
        "phone": "",
        "email": "",
        "status": "",
        "userId": member_id,
        "title": name,
        "fullName": name,
        "role": "צוות מלווה",
        "subjects": [],
        "source": "monday-people",
        "kind": person.get("kind"),
        "raw": person,
    }


def extract_people_from_column_value(column):
    raw_value = column.get("value") if column else None

    if not raw_value:
        return []

    try:
        value = json.loads(raw_value)
    except (TypeError, json.JSONDecodeError):
        return []

    people = value.get("personsAndTeams") or value.get("persons_and_teams") or []

    return people if isinstance(people, list) else []


def extract_project_escort_team_from_monday(item):
    escort_column = get_project_escort_column(item)

    if not escort_column:
        return []

    people = extract_people_from_column_value(escort_column)
    if people:
        fallback_names = [
            name.strip()
            for name in re.split(r"[,;]", escort_column.get("text") or "")
            if name.strip()
        ]

        return [
            normalize_escort_team_person(
                person,
                index,
                fallback_names[index] if index < len(fallback_names) else "",
            )
            for index, person in enumerate(people)
            if isinstance(person, dict)
        ]

    linked_items = escort_column.get("linked_items") or []
    team_members = []
    seen_ids = set()

    for index, linked_item in enumerate(linked_items):
        if not isinstance(linked_item, dict):
            continue

        member = normalize_escort_team_member(linked_item, index)
        member_id = member.get("id")

        if member_id in seen_ids:
            continue

        seen_ids.add(member_id)
        team_members.append(member)

    return team_members


def enrich_escort_team_with_monday_users(team_members):
    user_ids = [
        member.get("id")
        for member in team_members
        if str(member.get("kind") or "").lower() == "person"
    ]

    try:
        users_by_id = fetch_monday_users_by_ids(user_ids)
    except Exception:
        users_by_id = {}

    enriched_members = []

    for member in team_members:
        member_id = str(member.get("id") or "")
        monday_user = users_by_id.get(member_id, {})
        fallback_display_name = f"משתמש Monday {member_id}" if member_id else "חבר צוות"
        full_name = (
            monday_user.get("name")
            or member.get("fullName")
            or member.get("name")
            or fallback_display_name
        )

        enriched_members.append(
            {
                **member,
                "id": member.get("id") or member.get("userId"),
                "userId": member.get("userId") or member.get("id"),
                "name": full_name,
                "title": full_name,
                "fullName": full_name,
                "email": monday_user.get("email") or member.get("email") or "",
                "subjects": member.get("subjects") or [],
            }
        )

    return enriched_members


def normalize_exponet_inspector(inspector, index):
    if not isinstance(inspector, dict):
        return {
            "id": f"exponet-inspector-{index}",
            "name": str(inspector),
            "title": str(inspector),
            "role": "צוות מלווה",
            "email": "",
            "phone": "",
            "source": "exponet",
            "raw": inspector,
        }

    inspector_id = inspector.get("id") or inspector.get("inspectorId") or f"exponet-inspector-{index}"
    name = (
            inspector.get("name")
            or inspector.get("fullName")
            or inspector.get("displayName")
            or inspector.get("inspectorName")
            or inspector.get("title")
            or ""
    )
    role = (
            inspector.get("role")
            or inspector.get("roleName")
            or inspector.get("profession")
            or inspector.get("professionName")
            or inspector.get("typeName")
            or "צוות מלווה"
    )

    return {
        "id": inspector_id,
        "userId": inspector_id,
        "name": name,
        "title": name,
        "fullName": name,
        "role": role,
        "email": inspector.get("email") or inspector.get("mail") or "",
        "phone": inspector.get("phone") or inspector.get("mobile") or inspector.get("phoneNumber") or "",
        "subjects": inspector.get("subjects") or [],
        "source": "exponet",
        "raw": inspector,
    }


def extract_exponet_inspectors(exponet_response):
    if not exponet_response:
        return []

    raw_data = exponet_response.get("data", exponet_response)

    if isinstance(raw_data, dict):
        raw_data = (
                raw_data.get("inspectors")
                or raw_data.get("items")
                or raw_data.get("results")
                or []
        )

    if not isinstance(raw_data, list):
        raw_data = []

    return [
        normalize_exponet_inspector(inspector, index)
        for index, inspector in enumerate(raw_data)
    ]


class ProjectInspectorsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        if not re.fullmatch(r"\d+", str(project_id)):
            return Response(
                {"detail": "Invalid project ID"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        monday_query = (
            f"query {{ "
            f"boards(ids: {PROJECTS_BOARD_ID}) {{ "
            f"items_page(query_params: {{ ids: [{project_id}] }}) {{ "
            f"items {{ "
            f"id name "
            f"column_values(ids: [\"{PROJECT_ESCORT_TEAM_COLUMN_ID}\", \"text_mm1he76h\"]) {{ "
            f"id text value column {{ title }} "
            f"{BOARD_RELATION_VALUE_QUERY}"
            f"}} "
            f"}} "
            f"}} "
            f"}} "
            f"}}"
        )

        try:
            monday_response = fetch_crm_data(monday_query)
        except urllib.error.HTTPError as error:
            return Response(
                {
                    "detail": "Failed to fetch project from CRM",
                    "status_code": error.code,
                    "error": get_http_error_body(error),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as error:
            return Response(
                {
                    "detail": "Unexpected server error while fetching project",
                    "error": str(error),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if monday_response.get("errors"):
            return Response(
                {
                    "detail": "CRM returned an error",
                    "errors": monday_response.get("errors"),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        items = extract_items_from_crm_response(monday_response)
        if not items:
            return Response(
                {"detail": "Project not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        item = items[0]
        project_name = item.get("name") or ""
        exponet_id = get_column_text(item, "exponetID")
        crm_escort_team = enrich_escort_team_with_monday_users(
            extract_project_escort_team_from_monday(item)
        )

        inspectors = crm_escort_team

        return Response(
            {
                "project_id": project_id,
                "project_name": project_name,
                "exponet_id": exponet_id,
                "inspectors": inspectors,
                "escortTeam": crm_escort_team,
                "crm_escort_team": crm_escort_team,
                "message": (
                    "לא הוגדר צוות מלווה בעמודת CRM."
                    if not inspectors
                    else ""
                ),
            },
            status=status.HTTP_200_OK,
        )

NOTIFICATION_STAGE_CONTENT_CONTROL = "content_control"
NOTIFICATION_STAGE_APPROVAL = "approval"
NOTIFICATION_STAGE_EXECUTION = "execution"

NOTIFICATION_STAGE_CONTENT_CONTROL_INDEX = 0
NOTIFICATION_STAGE_APPROVAL_INDEX = 1
NOTIFICATION_STAGE_EXECUTION_INDEX = 2

NOTIFICATION_STAGE_ORDER = (
    NOTIFICATION_STAGE_CONTENT_CONTROL,
    NOTIFICATION_STAGE_APPROVAL,
    NOTIFICATION_STAGE_EXECUTION,
)

NOTIFICATION_STATUS_TITLES_BY_STAGE = {
    NOTIFICATION_STAGE_CONTENT_CONTROL: {"שלב בפרוייקט", "סטטוס אקספונט", "תהליך קליטה"},
    NOTIFICATION_STAGE_APPROVAL: {"שלב בפרוייקט", "סטטוס אקספונט"},
    NOTIFICATION_STAGE_EXECUTION: {"שלב בפרוייקט"},
}

NOTIFICATION_TRACKED_FIELDS_BY_STAGE = {
    NOTIFICATION_STAGE_CONTENT_CONTROL: {
        "לקוח",
        "מייל",
        "תאריך יעד דו״ח ביניים",
        "מספר דוח ביניים",
        "תהליך קליטה",
        "סטטוס אקספונט",
        "שלב בפרוייקט",
    },
    NOTIFICATION_STAGE_APPROVAL: {
        "תאריך יעד דו״ח מסכם",
        "מספר דוח מסכם",
        "סטטוס אקספונט",
        "שלב בפרוייקט",
    },
    NOTIFICATION_STAGE_EXECUTION: {
        "שלב בפרוייקט",
    },
}


def normalize_notification_stage_text(value):
    return (
        str(value or "")
        .strip()
        .lower()
        .replace("-", "_")
        .replace(" ", "_")
    )


def get_notification_stage_index(value):
    stage = normalize_notification_stage_text(value)

    if "ביצוע" in stage or "execution" in stage:
        return NOTIFICATION_STAGE_EXECUTION_INDEX

    if (
        "אישור_תחילת_עבודה" in stage
        or "תחילת_עבודה" in stage
        or stage in {"approval", "work_start_approval"}
    ):
        return NOTIFICATION_STAGE_APPROVAL_INDEX

    if "תכן" in stage or "תכנון" in stage or "content_control" in stage:
        return NOTIFICATION_STAGE_CONTENT_CONTROL_INDEX

    return None


def get_notification_project_stage(columns):
    stage_values = []

    for column in columns:
        title = ((column.get("column") or {}).get("title") or "").strip()

        if (
            column.get("id") == "color_mm1grhfm"
            or column.get("id") == "project_status"
            or title in {"סוג בקרה", "שלב בפרוייקט"}
        ):
            stage_values.append(column.get("text"))

    stage_indexes = [
        stage_index
        for stage_index in (get_notification_stage_index(value) for value in stage_values)
        if stage_index is not None
    ]

    return (
        NOTIFICATION_STAGE_ORDER[max(stage_indexes)]
        if stage_indexes
        else NOTIFICATION_STAGE_CONTENT_CONTROL
    )


def get_effective_notification_stage(requested_stage, columns):
    crm_stage = get_notification_project_stage(columns)
    crm_stage_index = NOTIFICATION_STAGE_ORDER.index(crm_stage)

    if requested_stage not in NOTIFICATION_STAGE_ORDER:
        return crm_stage

    requested_stage_index = NOTIFICATION_STAGE_ORDER.index(requested_stage)

    if requested_stage_index > crm_stage_index:
        return crm_stage

    return requested_stage


class NotificationsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        if not re.fullmatch(r"\d+", str(project_id)):
            return Response(
                {"detail": "Invalid project ID"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        requested_stage = (request.query_params.get("stage") or "").strip()

        if requested_stage and requested_stage not in NOTIFICATION_STAGE_ORDER:
            return Response(
                {"detail": "Invalid notifications stage"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        query = (
            f"query {{ "
            f"items(ids: [{project_id}]) {{ "
            f"id name updated_at "
            f"column_values {{ id text column {{ title }} }} "
            f"updates {{ id body created_at creator {{ name }} }} "
            f"}} "
            f"}}"
        )

        try:
            data = fetch_crm_data(query)
        except urllib.error.HTTPError as error:
            return Response(
                {
                    "detail": "CRM error",
                    "status_code": error.code,
                    "error": get_http_error_body(error),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as error:
            return Response(
                {
                    "detail": "CRM error",
                    "error": str(error),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        items = extract_items_from_crm_response(data)

        if not items:
            return Response(
                {"detail": "Not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        item = items[0]

        columns = item.get("column_values", [])
        updates = item.get("updates", [])
        effective_stage = get_effective_notification_stage(requested_stage, columns)

        notifications = []

        file_keywords = ["file", "pdf", "uploaded", "הועלה", "קובץ"]

        for update in updates:
            body = update.get("body") or ""
            clean = re.sub(r"<[^>]+>", "", body)

            if any(keyword in clean.lower() for keyword in file_keywords):
                notifications.append(
                    {
                        "type": "file",
                        "title": "הועלה קובץ חדש",
                        "description": clean[:180],
                        "time": update.get("created_at"),
                        "user": (update.get("creator") or {}).get("name"),
                    }
                )

        status_column = next(
            (
                column
                for column in columns
                if ((column.get("column") or {}).get("title") or "").strip()
                in NOTIFICATION_STATUS_TITLES_BY_STAGE[effective_stage]
                and column.get("text")
            ),
            None,
        )

        if status_column:
            notifications.append(
                {
                    "type": "status",
                    "title": "שינוי סטטוס בפרויקט",
                    "description": f"סטטוס עודכן ל: {status_column.get('text')}",
                    "time": item.get("updated_at"),
                    "user": None,
                }
            )

        for update in updates:
            body = re.sub(r"<[^>]+>", "", update.get("body") or "").strip()

            if not body:
                continue

            notifications.append(
                {
                    "type": "update",
                    "title": "עדכון בפרויקט",
                    "description": body[:180],
                    "time": update.get("created_at"),
                    "user": (update.get("creator") or {}).get("name"),
                }
            )

        tracked_fields = NOTIFICATION_TRACKED_FIELDS_BY_STAGE[effective_stage]

        for column in columns:
            title = (column.get("column") or {}).get("title")

            if title in tracked_fields and column.get("text"):
                notifications.append(
                    {
                        "type": "update",
                        "title": f"שדה עודכן: {title}",
                        "description": f"ערך חדש: {column.get('text')}",
                        "time": item.get("updated_at"),
                        "user": None,
                        "meta": {
                            "field": title,
                            "new_value": column.get("text"),
                        },
                    }
                )

        notifications.sort(key=lambda item: item.get("time") or "", reverse=True)

        return Response(
            {
                "project_id": item.get("id"),
                "project_name": item.get("name"),
                "stage": effective_stage,
                "requested_stage": requested_stage,
                "notifications": notifications,
            },
            status=status.HTTP_200_OK,
        )

