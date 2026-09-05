#!/bin/bash
set -e

minio server /data --console-address ":9001" &
MINIO_PID=$!

until mc alias set local http://localhost:9000 "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"; do
  echo "Waiting for MinIO to start..."
  sleep 2
done

mc mb --ignore-existing local/product-image
mc anonymous set public local/product-image
mc cp --recursive /home/image/ local/product-image/

wait $MINIO_PID
