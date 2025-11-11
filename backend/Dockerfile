# Gunakan image Python
FROM python:3.11-slim

# Set direktori kerja
WORKDIR /app

# Salin semua file ke container
COPY . .

# Install dependencies
RUN pip install --upgrade pip && pip install -r requirements.txt

# Jalankan server FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
    