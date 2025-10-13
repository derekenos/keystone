"""This module exposes the Ninja Schemas / Pydantic Models that can be subclassed
by plugins in order to define the Special-type Collection metadata schemas that they
wish to implement.
"""

from enum import Enum
from typing import (
    Any,
    List,
    Literal,
    Optional,
)

from ninja import Schema


class StrictSchema(Schema):
    """Schema subclass that forbids extra fields."""

    class Config:
        """Forbid extra fields."""

        extra = "forbid"


class InputSpecBase(StrictSchema):
    """InputSpec base schema."""

    def dict(self, exclude_none=True, **kwargs):
        """Override dict() with default of exclude_none=True"""

        return super().dict(exclude_none=exclude_none, **kwargs)


class FilesInputSpecDataSource(Enum):
    """The files-type input spec dataSource values that ARCH supports
    by default."""

    # pylint: disable=invalid-name
    HDFS = "hdfs"
    HTTP = "http"
    S3 = "s3"
    S3_HTTP = "s3-http"


class FilesInputSpecInputType(Enum):
    """Valid files-type input spec inputType values."""

    CDX = "cdx"
    WARC = "warc"


FilenameExtension = str
MimeType = str


class FilesInputSpec(InputSpecBase):
    """Represents an ARCH files-type collection input spec."""

    type: Literal["files"] = "files"
    # Accept any string for dataSource in order to support additional
    # type support through plugins.
    dataSource: FilesInputSpecDataSource | str
    dataLocation: str
    dataMime: dict[FilenameExtension, MimeType]
    inputType: Optional[FilesInputSpecInputType]

    class Config:
        """Pydantic model config."""

        use_enum_values = True

    def get_collection_configuration_pairs(self):
        """If collection.metadata.input_spec validates against this schema
        and the input spec specifies dataMime, return a [<label>, <values>]
        pair.
        """
        if self.dataMime:
            return [["MIME Type(s)", list(self.dataMime.values())]]
        return None

    @property
    def is_warc_type(self):
        """Return whether this input spec is a WARC type."""
        return self.inputType in (
            FilesInputSpecInputType.CDX,
            FilesInputSpecInputType.WARC,
        )


class CollectionMetadataBase(StrictSchema):
    """Represents common collection metadata."""

    object_count: Optional[int]
    object_name_singular: Optional[str]
    object_name_plural: Optional[str]

    @property
    def custom_metadata_icons_template_name(self):
        """Return the name of any custom metadata icons template to use in
        rendering this validated metadata instance."""
        # Return None to use the default template.
        return None


class PluginProvidedSpecialCollectionMetadata(CollectionMetadataBase):
    """Represents a plugin-provided SPECIAL collection type metadata."""

    input_spec: Any
    type_displayname: str


class CdxFilterQuery(StrictSchema):
    """Represents a CDX filter query."""

    surtPrefixesOR: Optional[List[str]]
    timestampFrom: Optional[str]
    timestampTo: Optional[str]
    statusPrefixesOR: Optional[List[int]]
    mimesOR: Optional[List[str]]
