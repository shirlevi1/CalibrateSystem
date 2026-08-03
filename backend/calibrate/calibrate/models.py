from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager


ROLE_CHOICES = [
    ("entrepreneur", "Entrepreneur"),
    ("admin", "Admin"),
]


class CustomUserManager(BaseUserManager):
    def create_user(self, email, name, role, crm_id=None, password=None):
        if not email:
            raise ValueError("Users must have an email address")

        if not role:
            raise ValueError("Users must have a role")

        valid_roles = [choice[0] for choice in ROLE_CHOICES]
        if role not in valid_roles:
            raise ValueError(f"Invalid role: {role}. Must be one of {valid_roles}")

        if not crm_id:
            raise ValueError("Users must have a CRM ID")

        email = self.normalize_email(email)

        user = self.model(
            email=email,
            name=name,
            role=role,
            crm_id=crm_id,
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, name, crm_id, password=None):
        role = "admin"

        user = self.create_user(
            email=email,
            name=name,
            role=role,
            crm_id=crm_id,
            password=password,
        )
        user.is_staff = True
        user.is_superuser = True
        user.save(using=self._db)
        return user


class CustomUser(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    crm_id = models.CharField(max_length=100, unique=True)

    privacy_policy_accepted = models.BooleanField(default=False)
    privacy_policy_accepted_at = models.DateTimeField(null=True, blank=True)

    force_password_change = models.BooleanField(default=False)
    profile_image_url = models.CharField(max_length=500, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = CustomUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name", "role", "crm_id"]

    def __str__(self):
        return self.email


class ArchivedUser(models.Model):
    original_user_id = models.IntegerField(null=True, blank=True)

    email = models.EmailField()
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    crm_id = models.CharField(max_length=100, null=True, blank=True)

    password_hash = models.CharField(max_length=255, null=True, blank=True)

    privacy_policy_accepted = models.BooleanField(default=False)
    privacy_policy_accepted_at = models.DateTimeField(null=True, blank=True)

    original_created_at = models.DateTimeField(null=True, blank=True)

    deletion_date = models.DateTimeField(auto_now_add=True)

    deleted_by_id = models.IntegerField(null=True, blank=True)
    deleted_by_email = models.EmailField(null=True, blank=True)
    deleted_by_name = models.CharField(max_length=255, null=True, blank=True)

    is_restored = models.BooleanField(default=False)
    restored_at = models.DateTimeField(null=True, blank=True)
    restored_by_id = models.IntegerField(null=True, blank=True)
    restored_by_email = models.EmailField(null=True, blank=True)
    restored_by_name = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        ordering = ["-deletion_date"]
        verbose_name = "Archived User"
        verbose_name_plural = "Archived Users"

    def __str__(self):
        return f"{self.email} archived at {self.deletion_date}"


class WorkEmphasis(models.Model):
    title = models.CharField(max_length=255)
    content = models.TextField()
    icon = models.CharField(max_length=50)
    position = models.PositiveIntegerField(unique=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["position"]
        verbose_name = "Work Emphasis"
        verbose_name_plural = "Work Emphases"

    def __str__(self):
        return self.title


class ChatbotQuestion(models.Model):
    question = models.CharField(max_length=500)
    answer = models.TextField()
    position = models.PositiveIntegerField(unique=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["position"]
        verbose_name = "Chatbot Question"
        verbose_name_plural = "Chatbot Questions"

    def __str__(self):
        return self.question


class InformationGuideContent(models.Model):
    step = models.CharField(max_length=60, unique=True)
    content_data = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["step"]
        verbose_name = "Information Guide Content"
        verbose_name_plural = "Information Guide Contents"

    def __str__(self):
        return self.step
