from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings
import ssl
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse, unquote


def _to_async_database_url(url: str) -> str:
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


def _strip_unsupported_params_from_url(url: str) -> tuple[str, str | None]:
    """Remove unsupported query params for asyncpg.

    SQLAlchemy passes URL query params down to asyncpg.connect() as kwargs.
    Some params commonly present in managed Postgres URLs (e.g. Neon) are not
    accepted by asyncpg.
    """
    parsed = urlparse(url)
    # Ensure the database name/path is not percent-encoded (e.g. "%20")
    parsed = parsed._replace(path=unquote(parsed.path))
    query_items = parse_qsl(parsed.query, keep_blank_values=True)

    sslmode: str | None = None
    filtered: list[tuple[str, str]] = []
    for k, v in query_items:
        key = k.lower()
        if key == "sslmode":
            sslmode = v
            continue
        if key in {"channel_binding"}:
            continue
        filtered.append((k, v))

    new_query = urlencode(filtered)
    cleaned = urlunparse(parsed._replace(query=new_query))
    return cleaned, sslmode


def _asyncpg_connect_args_for_sslmode(sslmode: str | None) -> dict:
    if not sslmode:
        return {}
    mode = sslmode.lower()
    if mode in {"require", "verify-ca", "verify-full"}:
        ctx = ssl.create_default_context()
        return {"ssl": ctx}
    return {}

# Async database engine for FastAPI
_db_url = _to_async_database_url(settings.DATABASE_URL)
_db_url, _sslmode = _strip_unsupported_params_from_url(_db_url)

engine = create_async_engine(
    _db_url,
    echo=settings.DEBUG,
    future=True,
    pool_pre_ping=True,
    connect_args=_asyncpg_connect_args_for_sslmode(_sslmode),
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db():
    """Database session dependency for FastAPI routes"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
