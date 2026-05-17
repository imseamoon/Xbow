FROM python:3.11-slim

WORKDIR /app

# when build context is ./modules, copy requirements from subdirectory
COPY payload-gen-module/requirements.txt .
# retry up to 3 times to handle transient network/timeout errors
ENV PIP_DEFAULT_TIMEOUT=120
RUN pip install --upgrade pip && \
    set -e; \
    for i in 1 2 3; do \
        pip install --no-cache-dir -r requirements.txt && break || \
        (echo "pip install failed, retrying ($i/3)" && sleep 15); \
    done

# copy module source
COPY payload-gen-module/ .

# copy shared schemas (sibling directory in build context)
COPY shared/ /app/shared/

# model directory is mounted as volume at /app/model/ranker
ENV RANKER_MODEL_DIR=/app/model/ranker

EXPOSE 5002

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5002"]
