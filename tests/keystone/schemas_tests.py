from pytest import mark

from keystone.schemas import (
    FilesInputSpec,
    InputSpec,
    SpecialCollectionMetadata,
)


def test_input_spec_dict_excludes_none():
    """InputSpec.dict() should exclude fields with None-type values."""
    input_spec_d = {
        "type": "files",
        "dataSource": "HTTP",
        "dataLocation": "http://example.com",
        "dataMime": {},
    }
    # InputSpec can't be instantiated directly on account of it being an
    # annotated union-type value, so use SpecialCollectionMetadata as an
    # intermediary.
    input_spec = SpecialCollectionMetadata(input_spec=input_spec_d).input_spec
    assert input_spec.inputType is None
    assert input_spec.dict() == input_spec_d


@mark.parametrize(
    "inputType, is_warc_type", ((None, False), ("cdx", True), ("warc", True))
)
def test_files_input_spec_is_warc_type(inputType, is_warc_type):
    """FilesInputSpec.is_warc_type() should return True if inputType is warc or cdx"""
    assert (
        FilesInputSpec(
            dataSource="", dataLocation="", dataMime={}, inputType=inputType
        ).is_warc_type
        == is_warc_type
    )
