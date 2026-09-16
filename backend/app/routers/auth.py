"""
MediCore OS — Auth Router
Handles user registration, login, and profile retrieval.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.models.models import Paciente, Usuario
from app.schemas.schemas import (
    TokenResponse,
    UserCreate,
    UserLogin,
    UsuarioResponse,
)

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    """Authenticate user and return JWT token."""
    result = await db.execute(
        select(Usuario).where(Usuario.correo == payload.correo)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
        )

    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta desactivada. Contacte al administrador.",
        )

    token = create_access_token(data={"sub": str(user.id), "rol": user.rol})

    return TokenResponse(
        access_token=token,
        usuario=UsuarioResponse.model_validate(user),
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user. If role is 'paciente', also creates patient profile."""
    # Check if email already exists
    existing = await db.execute(
        select(Usuario).where(Usuario.correo == payload.correo)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario con este correo",
        )

    # Create user
    user = Usuario(
        nombre_completo=payload.nombre_completo,
        correo=payload.correo,
        password_hash=hash_password(payload.password),
        rol=payload.rol,
        telefono=payload.telefono,
    )
    db.add(user)
    await db.flush()

    # Create patient profile if role is 'paciente'
    if payload.rol == "paciente" and payload.documento_numero:
        paciente = Paciente(
            usuario_id=user.id,
            documento_tipo=payload.documento_tipo or "CC",
            documento_numero=payload.documento_numero,
            fecha_nacimiento=payload.fecha_nacimiento,
        )
        db.add(paciente)

    await db.flush()

    token = create_access_token(data={"sub": str(user.id), "rol": user.rol})

    return TokenResponse(
        access_token=token,
        usuario=UsuarioResponse.model_validate(user),
    )


@router.get("/me", response_model=UsuarioResponse)
async def get_profile(current_user: Usuario = Depends(get_current_user)):
    """Get the currently authenticated user's profile."""
    return UsuarioResponse.model_validate(current_user)
