"""
Monthly Statement Generation Job
Run this script at the end of each month to generate statements for all users
"""
import asyncio
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from config import settings
from services.statement_service import StatementService
from utils.logger import logger


async def main():
    """Generate monthly statements for all users"""
    logger.info("Starting monthly statement generation job...")
    
    # Create async engine
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_pre_ping=True
    )
    
    # Create session factory
    async_session = sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    try:
        async with async_session() as session:
            result = await StatementService.generate_monthly_statements(session)
            
            logger.info("Monthly statement generation completed!")
            logger.info(f"Period: {result['period']['start']} to {result['period']['end']}")
            logger.info(f"Total users: {result['total_users']}")
            logger.info(f"Successful: {result['success_count']}")
            logger.info(f"Errors: {result['error_count']}")
            
            if result['errors']:
                logger.warning(f"Errors encountered: {result['errors']}")
            
            return result
            
    except Exception as e:
        logger.error(f"Monthly statement generation failed: {e}")
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
