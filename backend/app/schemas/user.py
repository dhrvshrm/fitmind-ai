from pydantic import BaseModel, EmailStr
from typing import Optional, List

class UserRegister(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOnboarding(BaseModel):
    age: int
    gender: str
    weight_kg: float
    height_cm: float
    fitness_goal: str
    experience_level: str
    available_equipment: List[str]
