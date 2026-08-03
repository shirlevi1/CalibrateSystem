from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMultiAlternatives
from django.utils.encoding import force_bytes
from django.utils.html import escape
from django.utils.http import urlsafe_base64_encode


def build_password_reset_link(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")

    return f"{frontend_url}/reset-password/{uid}/{token}"


def send_user_access_email(user, raw_password, is_password_update=False):
    reset_link = build_password_reset_link(user)

    user_name = getattr(user, "name", "") or user.email
    safe_user_name = escape(user_name)
    safe_password = escape(raw_password)
    safe_reset_link = escape(reset_link)

    if is_password_update:
        subject = "הסיסמה שלך עודכנה במערכת Calibrate"
        title = "עדכון סיסמה זמנית"
        main_message = "הסיסמה שלך עודכנה על ידי מנהל המערכת."
    else:
        subject = "נוצר עבורך משתמש חדש במערכת Calibrate"
        title = "ברוכה הבאה למערכת Calibrate"
        main_message = "נוצר עבורך משתמש חדש במערכת Calibrate."

    text_message = (
        f"שלום {user_name},\n\n"
        f"{main_message}\n\n"
        f"הוגדרה עבורך סיסמה זמנית בלבד:\n"
        f"{raw_password}\n\n"
        f"לצורך שמירה על פרטיותך, יש לבחור סיסמה חדשה בקישור הבא:\n"
        f"{reset_link}\n\n"
        f"לאחר עדכון הסיסמה, הסיסמה הזמנית לא תשמש אותך יותר.\n\n"
        f"בברכה,\n"
        f"צוות Calibrate"
    )

    html_message = f"""
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <title>{escape(title)}</title>
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
                    {escape(title)}
                </h2>

                <p style="margin: 0 0 14px; font-size: 15px;">
                    שלום {safe_user_name},
                </p>

                <p style="margin: 0 0 14px; font-size: 15px;">
                    {escape(main_message)}
                </p>

                <p style="margin: 0 0 10px; font-size: 15px;">
                    הוגדרה עבורך סיסמה זמנית בלבד:
                </p>

                <div dir="ltr" style="
                    margin: 0 0 20px;
                    padding: 12px 14px;
                    text-align: center;
                    background-color: #F4F6F8;
                    border: 1px solid #D1D5DB;
                    border-radius: 8px;
                    color: #1F3550;
                    font-size: 17px;
                    font-weight: 600;
                    letter-spacing: 0.5px;
                ">
                    {safe_password}
                </div>

                <p style="margin: 0 0 22px; font-size: 15px;">
                    לצורך שמירה על פרטיותך, יש לבחור סיסמה חדשה באמצעות הכפתור הבא:
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
                        בחירת סיסמה חדשה
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
                    לאחר עדכון הסיסמה, הסיסמה הזמנית לא תשמש אותך יותר.
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
