from datetime import datetime
from enum import Enum
from itertools import chain
from uuid import UUID
from typing import (
    List,
    Literal,
    Optional,
    Tuple,
    Union,
)
from typing_extensions import Annotated

from django.db.models import Q
from ninja import (
    Field,
    FilterSchema,
    ModelSchema,
    Schema,
)
from pydantic import (
    ValidationError,
    NonNegativeInt,
)


from .plugins import get_plugin_apps
from .models import (
    Collection,
    JobStart,
    JobEvent,
    JobEventTypes,
    JobCategory,
    UserRoles,
)


###############################################################################
# Shared Schemas
###############################################################################


class StrictSchema(Schema):
    """Schema subclass that forbids extra fields."""

    class Config:
        """Forbid extra fields."""

        extra = "forbid"


class DatasetFileSchema(Schema):
    """Response schema for a DatasetFile object."""

    filename: str
    sizeBytes: int
    mimeType: str
    lineCount: int
    fileType: str
    creationTime: str
    md5Checksum: Optional[str]
    accessToken: str


class InputSpecBase(StrictSchema):
    """InputSpec base schema."""

    def dict(self, exclude_none=True, **kwargs):
        """Override dict() with default of exclude_none=True"""

        return super().dict(exclude_none=exclude_none, **kwargs)


###############################################################################
# Private API Schemas
###############################################################################


class JobStartInParametersConfWithParams(Schema):
    """A JobStartIn.parameters.conf value that include params."""

    inputSpec: dict
    outputPath: str
    sample: int
    params: dict


class JobStartInParametersConfNoParams(Schema):
    """A JobStartIn.parameters.conf value that does not include params."""

    inputSpec: dict
    outputPath: str
    sample: int


class JobStartInParameters(Schema):
    """An JobStartIn.parameters value."""

    instance_hashcode: str
    attempt: int
    conf: JobStartInParametersConfWithParams | JobStartInParametersConfNoParams


class JobStartIn(Schema):
    """Request POST payload schema for JobStart registration"""

    id: str
    job_type_id: str
    username: str
    input_bytes: NonNegativeInt
    sample: bool
    parameters: JobStartInParameters
    commit_hash: str
    created_at: str


class JobStartOut(ModelSchema):
    """Response schema for JobStart registration."""

    class Config:
        """Ninja ModelSchema configuration."""

        model = JobStart
        model_fields = [
            "id",
            "job_type",
            "collection",
            "user",
            "input_bytes",
            "sample",
            "parameters",
            "commit_hash",
            "created_at",
        ]


class JobEventIn(Schema):
    """Request POST payload schema for JobEvent registration"""

    job_start_id: str
    event_type: str
    created_at: str


class JobEventOut(ModelSchema):
    """Response schema for JobEvent registration"""

    class Config:
        """Ninja ModelSchema configuration."""

        model = JobEvent
        model_fields = [
            "id",
            "job_start",
            "event_type",
            "created_at",
        ]


class JobCompleteIn(Schema):
    """Request POST payload schema for JobComplete registration"""

    job_start_id: str
    output_bytes: int
    created_at: str
    files: List[DatasetFileSchema]


class PermissionResponse(Schema):
    """Response schema for Keystone permission requests"""

    allow: bool


###############################################################################
# ARCH Collection Input Spec Schema
###############################################################################


class LegacyCollectionInputSpec(InputSpecBase):
    """Represents an AIT Collection input spec."""

    type: Literal["collection"] = "collection"
    collectionId: str

    @property
    def is_warc_type(self):
        """Return whether this input spec is a WARC type."""
        return True


class CDXDatasetInputSpec(InputSpecBase):
    """Represents an CDX Dataset input spec."""

    type: Literal["dataset"] = "dataset"
    inputType: Literal["cdx"] = "cdx"
    uuid: str

    @property
    def is_warc_type(self):
        """Return whether this input spec is a WARC type."""
        return True


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

    @classmethod
    def get_collection_configuration_pairs(cls, collection: Collection):
        """If collection.metadata.input_spec validates against this schema
        and the input spec specifies dataMime, return a [<label>, <values>]
        pair.
        """
        try:
            spec = cls(**(collection.metadata or {}).get("input_spec", {}))
        except ValidationError:
            return None
        if spec.dataMime:
            return [["MIME Type(s)", list(spec.dataMime.values())]]
        return None

    @property
    def is_warc_type(self):
        """Return whether this input spec is a WARC type."""
        return self.inputType in (
            FilesInputSpecInputType.CDX,
            FilesInputSpecInputType.WARC,
        )


# Dynamically load any custom input spec classes defined by plugins.
# Note that plugins must define this as a static attribute of the
# corresponding PluginAppConfig class, e.g.
#
#   class ExampleConfig(keystone.plugins.PluginAppConfig):
#       name = "example_plugin"
#       custom_input_spec_classes = (<someClass>,)
#
InputSpec = Annotated[
    Union[
        (
            LegacyCollectionInputSpec,
            CDXDatasetInputSpec,
            FilesInputSpec,
        )
        + tuple(
            *chain(
                getattr(app, "custom_input_spec_classes", ())
                for app in get_plugin_apps()
            )
        )
    ],
    Field(discriminator="type"),
]


MULTI_INPUT_SPEC_TYPE = "multi-specs"


class MultiInputSpec(StrictSchema):
    """Represents a collection of multiple input specs."""

    type: Literal[MULTI_INPUT_SPEC_TYPE] = MULTI_INPUT_SPEC_TYPE
    specs: List[InputSpec]

    @property
    def is_warc_type(self):
        """Return whether this input spec is a WARC type."""
        return any(spec.is_warc_type for spec in self.specs)


###############################################################################
# Public API Schemas
###############################################################################


class CollectionMetadataBase(StrictSchema):
    """Represents common collection metadata."""

    object_count: Optional[int]
    object_name_singular: Optional[str]
    object_name_plural: Optional[str]


class SpecialCollectionMetadata(CollectionMetadataBase):
    """Represents SPECIAL collection type metadata."""

    input_spec: Optional[InputSpec]
    type_displayname: Optional[str]


class AITCollectionMetadata(CollectionMetadataBase):
    """Represents AIT collection type metadata."""

    ait_id: int
    is_public: bool
    seed_count: int
    last_crawl_date: Optional[datetime]


class CustomCollectionMetadata(CollectionMetadataBase):
    """Represents CUSTOM collection type metadata."""

    state: JobEventTypes


CollectionMetadata = (
    AITCollectionMetadata | CustomCollectionMetadata | SpecialCollectionMetadata
)


class LatestDatasetSchema(Schema):
    """Represents a Keystone Dataset"""

    id: int
    name: str = Field(..., alias="job_start.job_type.name")
    start_time: datetime


class CollectionSchema(Schema):
    """Represents a Keystone Collection"""

    id: int
    name: str
    collection_type: str
    size_bytes: int
    dataset_count: int = 0
    latest_dataset: LatestDatasetSchema = None
    metadata: Optional[CollectionMetadata] = None


class CollectionFilterSchema(FilterSchema):
    """Collection filters"""

    # Suppress "Method 'custom_expression' is abstract in class 'FilterSchema' ..."
    # pylint: disable=abstract-method

    search: Optional[str] = Field(None, q=["name__icontains"])

    # In order to support multiple query values for a single field,
    # use type of Optional[List[T]] and a Field q value like "...__in".
    id: Optional[List[int]] = Field(None, q="id__in")
    collection_type: Optional[List[str]] = None

    def filter_collection_type(self, value: str) -> Q:
        """If metadata.type_displayname is not defined, match on collection_type,
        otherwise match on metadata.type_displayname."""
        return Q(
            collection_type__in=value, metadata__type_displayname__isnull=True
        ) | Q(metadata__type_displayname__in=value)


class DatasetSchema(Schema):
    """Represents a Keystone Dataset"""

    id: int
    collection_id: int = Field(..., alias="job_start.collection.id")
    collection_name: str = Field(..., alias="job_start.collection.name")
    collection_access: bool
    is_sample: bool = Field(..., alias="job_start.sample")
    job_id: UUID = Field(..., alias="job_start.job_type.id")
    category_name: str = Field(..., alias="job_start.job_type.category.name")
    name: str = Field(..., alias="job_start.job_type.name")
    state: str
    start_time: datetime
    finished_time: Optional[datetime]
    team_ids: List[int]


class DatasetFilterSchema(FilterSchema):
    """Dataset filters"""

    # Suppress "Method 'custom_expression' is abstract in class 'FilterSchema' ..."
    # pylint: disable=abstract-method

    search: Optional[str] = Field(
        None,
        q=[
            "job_start__job_type__name__icontains",
            "job_start__job_type__category__name__icontains",
            "job_start__collection__name__icontains",
            "state__icontains",
        ],
    )

    # In order to support multiple query values for a single field,
    # use type of Optional[List[T]] and a Field q value like "...__in".
    id: Optional[List[int]] = Field(None, q="id__in")
    name: Optional[List[str]] = Field(None, q="job_start__job_type__name__in")
    category_name: Optional[List[str]] = Field(
        None, q="job_start__job_type__category__name__in"
    )
    collection_id: Optional[List[str]] = Field(None, q="job_start__collection__id__in")
    collection_name: Optional[List[str]] = Field(
        None, q="job_start__collection__name__in"
    )
    is_sample: Optional[List[bool]] = Field(None, q="job_start__sample__in")
    state: Optional[List[str]] = Field(None, q="state__in")


class JobCategorySchema(ModelSchema):
    """Represents a JobCategory"""

    class Config:
        """Ninja ModelSchema configuration."""

        model = JobCategory
        model_fields = [
            "name",
            "description",
        ]


class AvailableJob(Schema):
    """An available Dataset generation job."""

    id: str
    name: str
    description: str
    info_url: str
    code_url: str
    parameters_schema: Optional[dict]


class AvailableJobsCategory(Schema):
    """A category of available Dataset generation jobs."""

    categoryName: str
    categoryDescription: str
    categoryImage: str
    categoryId: int
    jobs: List[AvailableJob]


class MinimalUserSchema(Schema):
    """Represents a minial user."""

    id: int
    username: str


class TeamSchema(Schema):
    """Represents a Team."""

    id: int
    name: str
    members: List[MinimalUserSchema]


class MinimalTeamSchema(Schema):
    """Represents a minimal Team."""

    id: int
    name: str


class CreateTeamSchema(Schema):
    """New Team creation schema"""

    account_id: int
    name: str


class UpdateTeamSchema(Schema):
    """Existing Team update schema"""

    name: Optional[str]
    members: Optional[List[MinimalUserSchema]]


class TeamFilterSchema(FilterSchema):
    """Team filters"""

    # Suppress "Method 'custom_expression' is abstract in class 'FilterSchema' ..."
    # pylint: disable=abstract-method

    search: Optional[str] = Field(
        None, q=["name__icontains", "members__username__icontains"]
    )


class UserSchema(Schema):
    """User schema"""

    id: int
    username: str
    first_name: str
    last_name: str
    email: str
    role: UserRoles
    date_joined: datetime
    last_login: datetime = None
    teams: List[MinimalTeamSchema]


class CreateUserSchema(Schema):
    """New User creation schema"""

    account_id: int
    username: str
    first_name: str
    last_name: str
    email: str
    role: UserRoles
    teams: List[MinimalTeamSchema]


class UpdateUserSchema(Schema):
    """Existing User update schema"""

    first_name: Optional[str]
    last_name: Optional[str]
    email: Optional[str]
    role: Optional[UserRoles]
    teams: Optional[List[MinimalTeamSchema]]

    class Config:
        """Reject any requests that specify username."""

        extra = "forbid"


class UserFilterSchema(FilterSchema):
    """User filters"""

    # Suppress "Method 'custom_expression' is abstract in class 'FilterSchema' ..."
    # pylint: disable=abstract-method

    search: Optional[str] = Field(
        None,
        q=[
            "username__icontains",
            "first_name__icontains",
            "last_name__icontains",
            "email__icontains",
        ],
    )

    # In order to support multiple query values for a single field,
    # use type of Optional[List[T]] and a Field q value like "...__in".
    role: Optional[List[UserRoles]] = Field(None, q="role__in")


###############################################################################
# Public API ARCH Proxy Schemas
###############################################################################


class DatasetPublicationInfo(Schema):
    """Information about a published Dataset"""

    item: str
    inputId: str
    job: str
    complete: bool
    sample: bool
    time: str
    ark: str


class DatasetPublicationMetadata(Schema):
    """Metadata of a published petbox Dataset item"""

    creator: List[str] = None
    description: List[str] = None
    licenseurl: List[str] = None
    subject: List[str] = None
    title: List[str] = None


class GlobalJobParameters(Schema):
    """Configuration parameters common to all jobs."""

    sample: bool


class NamedEntityExtractionParameters(GlobalJobParameters):
    """NamedEntityExtraction-specific job configuration parameters."""

    lang: str


class DatasetGenerationRequest(Schema):
    """Request POST payload schema for Dataset generation."""

    collection_id: int
    job_type_id: str
    params: NamedEntityExtractionParameters | GlobalJobParameters


class CdxFilterQuery(StrictSchema):
    """Represents a CDX filter query."""

    surtPrefixesOR: Optional[List[str]]
    timestampFrom: Optional[str]
    timestampTo: Optional[str]
    statusPrefixesOR: Optional[List[int]]
    mimesOR: Optional[List[str]]


class SubCollectionCreationRequest(CdxFilterQuery):
    """Request POST payload schema for Sub-collection creation."""

    sources: List[str]
    name: Optional[str]
    # Includes fields/inherits from CdxFilterQuery.


class JobStateInfo(Schema):
    """Information about the state of an ARCH job"""

    id: str
    name: str
    sample: int
    state: str
    started: bool
    finished: bool
    failed: bool
    activeStage: str
    activeState: str
    startTime: Optional[str]
    finishedTime: Optional[str]


class DatasetSampleVizData(Schema):
    """Represents the visualization data for a Dataset."""

    nodes: List[Tuple[str, str]]
    edges: Optional[List[Tuple[str, str]]] = None


###############################################################################
# WASAPI Schemas
###############################################################################


class WasapiResponseFile(Schema):
    """The Wasapi files listing response file schema."""

    checksums: dict[str, str]
    collection: Optional[str]
    filename: str
    filetype: str
    locations: List[str]
    size: int


class WasapiResponse(Schema):
    """The Wasapi files listing response."""

    count: int
    next: Optional[str]
    previous: Optional[str]
    files: List[WasapiResponseFile]
