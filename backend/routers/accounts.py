from fastapi import APIRouter

from routers.accounts_read import router as accounts_read_router
from routers.accounts_write import router as accounts_write_router

router = APIRouter()

router.include_router(accounts_read_router)
router.include_router(accounts_write_router)
