from fastapi import FastAPI, Request

from contextlib import asynccontextmanager

# from .config import AUTO_CREATE_SCHEMA, engine
# from .model.pg_vectore import Base

from .router.auth.auth_api import router as auth_router
from .router.chat_history.chat_history_api import router as chat_history_router

# Use a relative import so this module works when loaded as `bot.application.main`
from .router.bot_api.chat_api import router as chat_router
from .router.v2.chat_api import router as chat_v2_router


# @asynccontextmanager
# async def lifespan(application):
#     if AUTO_CREATE_SCHEMA:
#         from sqlalchemy import text

#         with engine.connect() as conn:
#             conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
#             conn.commit()
#         Base.metadata.create_all(bind=engine)
#     yield


from fastapi.middleware.cors import CORSMiddleware

# app = FastAPI(lifespan=lifespan)
app = FastAPI()

# # CORS Configuration
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=[
#         "http://localhost:5173",
#         "http://localhost:3000",
#         "http://127.0.0.1:5173",
#         "http://127.0.0.1:3000",
#     ],
#     allow_origin_regex=r"https://.*\.ngrok-free\.app",
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )



app.include_router(auth_router, prefix="/api")
app.include_router(chat_history_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(chat_v2_router, prefix="/api")


# test develop
