# Dockerfile — hiermee draait de bot overal (Railway, Fly.io, een VPS...).
# Zie DEPLOY.md voor de stappen.

FROM python:3.11-slim

WORKDIR /app

# Eerst alleen de afhankelijkheden: dan hoeft dit niet opnieuw bij elke
# code-wijziging (snellere builds). We gebruiken de LICHTE lijst: zonder
# matplotlib/scikit-learn, die alleen voor handmatige grafieken nodig zijn.
COPY requirements-server.txt .
RUN pip install --no-cache-dir -r requirements-server.txt

COPY . .

# BELANGRIJK: /data moet een BLIJVENDE schijf (volume) zijn, anders is je
# bot-stand (portefeuille, historie) weg bij elke update.
ENV DATA_DIR=/data

# Online bestaat macOS launchd niet -> de bot plant zijn dagelijkse taken zelf.
ENV RUN_SCHEDULER=1

# Tijdzone gelijk aan Nederland, zodat "08:00" ook echt 08:00 bij jou is.
ENV TZ=Europe/Amsterdam

# -u = onmiddellijk loggen (anders zie je niets in de logs van je host).
CMD ["python", "-u", "live.py"]
