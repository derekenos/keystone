from django import forms
from django.conf import settings
from django.contrib.auth import password_validation
from django.contrib.auth.forms import (
    AuthenticationForm,
    PasswordResetForm,
    SetPasswordForm,
)
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


class KeystonePasswordResetForm(PasswordResetForm):
    """Override stock Django PasswordResetForm to add autofocus to the email
    field.
    """

    email = forms.EmailField(
        label=_("Email"),
        max_length=254,
        widget=forms.EmailInput(attrs={"autocomplete": "email", "autofocus": ""}),
    )


class KeystoneSetPasswordForm(SetPasswordForm):
    """Override stock Django SetPasswordForm to add autofocus to the
    new_password1 field.
    """

    new_password1 = forms.CharField(
        label=_("New password"),
        widget=forms.PasswordInput(
            attrs={"autocomplete": "new-password", "autofocus": ""}
        ),
        strip=False,
        help_text=password_validation.password_validators_help_text_html(),
    )


class CSVUploadForm(forms.Form):
    """Form for uploading a csv file"""

    csv_file = forms.FileField(label="Upload CSV")


class KeystoneAuthenticationForm(AuthenticationForm):
    """Subclass AuthenticationForm to override confirm_login_allowed()
    to allow inactive user logins."""

    def confirm_login_allowed(self, user):
        """Allow inactive user login if ALLOW_INACTIVE_USER_AS_VIEWER is set."""
        # Be sure to reference the django settings object here as opposed to config.settings
        # so that @override_settings works as expected in the related tests.
        if not (user.is_active or settings.ALLOW_INACTIVE_USER_AS_VIEWER):
            raise ValidationError(
                self.error_messages["inactive"],
                code="inactive",
            )
