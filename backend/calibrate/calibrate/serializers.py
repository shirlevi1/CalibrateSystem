from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    ArchivedUser,
    ChatbotQuestion,
    CustomUser,
    InformationGuideContent,
    WorkEmphasis,
)


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = CustomUser
        fields = [
            "id",
            "email",
            "name",
            "role",
            "crm_id",
            "privacy_policy_accepted",
            "privacy_policy_accepted_at",
            "force_password_change",
            "profile_image_url",
            "created_at",
            "is_active",
            "password",
        ]
        read_only_fields = [
            "id",
            "privacy_policy_accepted",
            "privacy_policy_accepted_at",
            "force_password_change",
            "created_at",
            "is_active",
        ]

    def validate_password(self, value):
        if not value:
            return value

        user = self.instance

        try:
            validate_password(value, user=user)
        except ValidationError as error:
            raise serializers.ValidationError(error.messages)

        return value

    def create(self, validated_data):
        password = validated_data.pop("password", None)

        user = CustomUser(**validated_data)

        if password:
            user.set_password(password)
            user.force_password_change = True
        else:
            user.set_unusable_password()

        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)
            instance.force_password_change = True

        instance.save()
        return instance


class ArchivedUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArchivedUser
        fields = [
            "id",
            "original_user_id",
            "email",
            "name",
            "role",
            "crm_id",
            "privacy_policy_accepted",
            "privacy_policy_accepted_at",
            "original_created_at",
            "deletion_date",
            "deleted_by_id",
            "deleted_by_email",
            "deleted_by_name",
            "is_restored",
            "restored_at",
            "restored_by_id",
            "restored_by_email",
            "restored_by_name",
        ]
        read_only_fields = fields


class WorkEmphasisSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkEmphasis
        fields = [
            "id",
            "title",
            "content",
            "icon",
            "position",
            "updated_at",
        ]
        read_only_fields = ["id", "position", "updated_at"]

    def validate_title(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError("Title is required.")

        return value


class ChatbotQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatbotQuestion
        fields = [
            "id",
            "question",
            "answer",
            "position",
            "updated_at",
        ]
        read_only_fields = ["id", "position", "updated_at"]

    def validate_question(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError("Question is required.")

        return value

    def validate_answer(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError("Answer is required.")

        return value


class InformationGuideContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = InformationGuideContent
        fields = ["id", "step", "content_data", "updated_at"]
        read_only_fields = ["id", "step", "updated_at"]

    def validate_content_data(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Content data must be an object.")

        required_fields = ["pageTitle", "pageDescription", "heroNoteTitle", "heroNoteText"]

        for field in required_fields:
            if not str(value.get(field, "")).strip():
                raise serializers.ValidationError(f"{field} is required.")

        if not isinstance(value.get("guides"), list):
            raise serializers.ValidationError("Guides must be a list.")

        if not isinstance(value.get("summaryCards"), list):
            raise serializers.ValidationError("Summary cards must be a list.")

        if not isinstance(value.get("videos"), list):
            raise serializers.ValidationError("Videos must be a list.")

        return value

    def validate_content(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError("Content is required.")

        return value

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        user = authenticate(username=email, password=password)

        if not user:
            raise serializers.ValidationError("Invalid email or password.")

        if not user.is_active:
            raise serializers.ValidationError("User is inactive.")

        if user.force_password_change:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            return {
                "password_change_required": True,
                "uid": uid,
                "token": token,
                "user": UserSerializer(user).data,
            }

        refresh = RefreshToken.for_user(user)

        return {
            "password_change_required": False,
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": UserSerializer(user).data,
        }
