#!/usr/bin/env python3
"""
Script untuk membuat user admin default
"""
import os
import sys
from sqlalchemy.orm import Session
from db.database import SessionLocal, init_db
from db.models import User
from utils.auth import get_password_hash

def create_admin_user(username: str = "administrator", password: str = "administrator614"):
    """Create default admin user"""
    db = SessionLocal()
    
    try:
        # Check if admin user already exists
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            print(f"❌ User '{username}' sudah ada!")
            return False
        
        # Create admin user
        hashed_password = get_password_hash(password)
        admin_user = User(
            username=username,
            password=hashed_password,
            role="admin",
            is_active=True
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print(f"✅ Admin user '{username}' berhasil dibuat!")
        print(f"   Username: {username}")
        print(f"   Password: {password}")
        print(f"   Role: admin")
        return True
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def create_default_user(username: str = "user", password: str = "user123"):
    """Create default user"""
    db = SessionLocal()
    
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            print(f"❌ User '{username}' sudah ada!")
            return False
        
        # Create user
        hashed_password = get_password_hash(password)
        user = User(
            username=username,
            password=hashed_password,
            role="user",
            is_active=True
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print(f"✅ User '{username}' berhasil dibuat!")
        print(f"   Username: {username}")
        print(f"   Password: {password}")
        print(f"   Role: user")
        return True
        
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Initializing database...")
    init_db()
    
    print("\n👤 Creating default users...")
    
    # Create admin user
    create_admin_user()
    
    # Create default user
    create_default_user()
    
    print("\n✅ Setup selesai!")
    print("\n📝 Default credentials:")
    print("   Admin: username=administrator, password=administrator614")
    print("   User:  username=user,  password=user123") 