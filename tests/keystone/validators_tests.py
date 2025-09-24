from pytest import (
    mark,
    raises,
)
from django.core.exceptions import ValidationError

from keystone.models import CollectionTypes
from keystone.schemas import (
    AITCollectionMetadata,
    CustomCollectionMetadata,
    SpecialCollectionMetadata,
)

from keystone.validators import (
    validate_collection_metadata,
    validate_password,
    validate_username,
)


###############################################################################
# Constants
###############################################################################


WRAPPED_SHA1_PASSWORD = "pbkdf2_sha1$600000$05KGvXn9DPQcrDwEtdwlf6$wewpkSmJNdoggammlRfBF5dLu2gJu+KzuCIB0la1t6w="

WRAPPED_SHA256_PASSWORD = "pbkdf2_sha256$600000$jCjYkxU6PyHPrpSZqEt2mK$67qp4LLjyoxiE2FsgoCTeNK+gWIvcby1dNasyBfOhRc="


BASE_COLLECTION_METADATA = {
    "object_count": None,
    "object_name_singular": None,
    "object_name_plural": None,
}

AIT_COLLECTION_METADATA = {
    "ait_id": 123,
    "is_public": True,
    "seed_count": 99,
    "last_crawl_date": None,
}

CUSTOM_COLLECTION_METADATA = {"state": "FINISHED"}

SPECIAL_COLLECTION_METADATA = {
    "input_spec": None,
    "type_displayname": None,
}

INVALID_COLLECTION_METADATA = {"unsupported_key": "unsupported_value"}


###############################################################################
# Tests
###############################################################################


def test_validate_username():
    # does not raise error if value matches regex in method
    expected = None
    actual = validate_username("arch:test")
    assert expected == actual


def test_validate_username_validation_error():
    # raises error if value does not match regex in method
    with raises(ValidationError) as error:
        validate_username("arch:test!")
        assert (
            "Username can only contain letters, digits, and special characters (@, ., +, -, :)."
            in error.info
        )


@mark.parametrize(
    "is_valid,password,password_hash",
    [
        (True, "password", WRAPPED_SHA256_PASSWORD),
        (False, "password123", WRAPPED_SHA256_PASSWORD),
        (True, "password", WRAPPED_SHA1_PASSWORD),
        (False, "password123", WRAPPED_SHA1_PASSWORD),
    ],
)
def test_valid_password(is_valid, password, password_hash):
    assert is_valid == validate_password(password, password_hash)


@mark.parametrize(
    "metadata, metadata_cls",
    (
        (AIT_COLLECTION_METADATA, AITCollectionMetadata),
        (CUSTOM_COLLECTION_METADATA, CustomCollectionMetadata),
        (SPECIAL_COLLECTION_METADATA, SpecialCollectionMetadata),
    ),
)
def test_validate_collection_metadata(metadata, metadata_cls):
    """When passed a valid metadata object, validate_collection_metadata() will return
    a validated schema object.
    """
    # Validate the standalone metadata outside the context of any associated collection.
    validated_metadata = validate_collection_metadata(metadata, collection=None)
    # Check that the metadata was correctly identified.
    assert isinstance(validated_metadata, metadata_cls)
    # Expect validated object to now also include base metadata fields.
    assert validated_metadata.dict() == (metadata | BASE_COLLECTION_METADATA)


def test_validate_collection_metadata_on_invalid_value():
    """A ValidationError will be raised by validate_collection_metadata() when
    passed an unsupported object value.
    """
    with raises(ValidationError):
        validate_collection_metadata(INVALID_COLLECTION_METADATA)


@mark.django_db
@mark.parametrize(
    "metadata, metadata_cls",
    (
        (AIT_COLLECTION_METADATA, AITCollectionMetadata),
        (CUSTOM_COLLECTION_METADATA, CustomCollectionMetadata),
        (SPECIAL_COLLECTION_METADATA, SpecialCollectionMetadata),
    ),
)
@mark.parametrize("collection_type", ("AIT", "CUSTOM", "SPECIAL"))
def test_validate_collection_metadata_type_mismatch(
    collection_type, metadata, metadata_cls, make_collection
):
    """validate_collection_metadata() will raise a ValidationError if the detected
    metadata type does not match the type of the specified associated collection.
    """
    match collection_type:
        case "AIT":
            mismatch = metadata != AIT_COLLECTION_METADATA
        case "CUSTOM":
            mismatch = metadata != CUSTOM_COLLECTION_METADATA
        case "SPECIAL":
            mismatch = metadata != SPECIAL_COLLECTION_METADATA
    collection = make_collection(
        collection_type=getattr(CollectionTypes, collection_type)
    )
    if not mismatch:
        validate_collection_metadata(metadata, collection)
    else:
        with raises(ValidationError) as exc:
            validate_collection_metadata(metadata, collection)
        assert (
            exc.value.message == f"Detected metadata schema ({metadata_cls.__name__}) "
            f"does notmatch collection ({collection.id}) type: {collection_type}"
        )
