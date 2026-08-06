import os
import sys
from supabase import create_client, Client

env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    with open(env_path, "r") as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                key, val = line.strip().split("=", 1)
                os.environ[key] = val

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
    sys.exit(1)

supabase: Client = create_client(url, key)

try:
    # Authenticate to get the user ID
    response = supabase.auth.sign_in_with_password({
        "email": "bsbvinidesousa@gmail.com",
        "password": "@Deus2026"
    })
    
    user = response.user
    print(f"✅ Usuário encontrado. ID: {user.id}")
    
    # Check the profile
    profile_response = supabase.table("user_profiles").select("*").eq("id", user.id).execute()
    profile_data = profile_response.data
    
    print(f"📊 Dados atuais no banco (user_profiles): {profile_data}")
    
    if profile_data:
        profile = profile_data[0]
        # Check if they are superuser
        current_role = profile.get("role")
        is_superuser_col = profile.get("is_superuser")
        
        print(f"🔍 Role atual: {current_role}")
        print(f"🔍 Coluna antiga is_superuser: {is_superuser_col}")
        
        # If not superuser, force update
        if current_role != "superuser":
            print("⚠️ Usuário não é superuser. Forçando atualização para 'superuser'...")
            update_response = supabase.table("user_profiles").update({"role": "superuser"}).eq("id", user.id).execute()
            print(f"✅ Atualização concluída: {update_response.data}")
        else:
            print("✅ O usuário JÁ É superuser no banco de dados!")
            
except Exception as e:
    print(f"❌ Erro ao verificar a conta: {e}")
