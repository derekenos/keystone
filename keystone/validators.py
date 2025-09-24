import re

from django.core.exceptions import ValidationError
from django.contrib.auth.hashers import PBKDF2PasswordHasher
from pydantic.error_wrappers import ValidationError as PydanticValidationError

from .hashers import PBKDF2WrappedSha1PasswordHasher


def validate_username(value):
    """Validate that a username contains only letters, numbers, and select special characters"""

    pattern = re.compile(r"^[\w.@+-:]+$")
    if not pattern.match(value):
        raise ValidationError(
            (
                "Username can only contain letters, digits, and special characters (@, ., +, -, :)."
            ),
            code="invalid_username",
        )


def validate_password(password, password_hash):
    """Validate that password matches password_hash"""

    supported_hashers = [
        PBKDF2PasswordHasher(),
        PBKDF2WrappedSha1PasswordHasher(),
    ]

    for hasher in supported_hashers:
        if password_hash.startswith(hasher.algorithm) and hasher.verify(
            password, password_hash
        ):
            return True

    return False


def validate_collection_metadata(metadata, collection=None):
    """Return a validated collection metadata object, or raise a PydanticValidationError
    if metadata doesn't match any defined schema. If a collection instance is
    specified, validate only against the single collection_type-specific schema.
    """
    # pylint: disable-next=cyclic-import
    from .models import CollectionTypes

    # pylint: disable-next=cyclic-import
    from .schemas import (
        AITCollectionMetadata,
        CollectionSchema,
        CustomCollectionMetadata,
    )

    validated_metadata, errors = CollectionSchema.__fields__["metadata"].validate(
        metadata, {}, loc="metadata"
    )
    if errors:
        # Use the errors list to instantiate a Pydantic ValidationError, and then
        # raise a Django ValidationError with using the well-formed Pydantic error string.
        exc = PydanticValidationError(errors, CollectionSchema)
        raise ValidationError(str(exc))
    # If collection was specified, raise a ValidationError if there a mismatch between
    # detected metadata type and the collection type.
    if collection is not None:
        is_ait_metadata = isinstance(validated_metadata, AITCollectionMetadata)
        is_custom_metadata = isinstance(validated_metadata, CustomCollectionMetadata)
        match collection.collection_type:
            case CollectionTypes.AIT:
                mismatch = not is_ait_metadata
            case CollectionTypes.CUSTOM:
                mismatch = not is_custom_metadata
            case CollectionTypes.SPECIAL:
                mismatch = is_ait_metadata or is_custom_metadata
        if mismatch:
            raise ValidationError(
                f"Detected metadata schema ({validated_metadata.__class__.__name__}) does not"
                f"match collection ({collection.id}) type: {collection.collection_type}"
            )
    return validated_metadata


def validate_and_clean_collection_metadata(metadata, collection=None):
    """Return a validated metadata dict with None-type value items excluded."""
    if not metadata:
        return None
    return validate_collection_metadata(metadata, collection).dict(exclude_none=True)
