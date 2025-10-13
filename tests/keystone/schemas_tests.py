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
