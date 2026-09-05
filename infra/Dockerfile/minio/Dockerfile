FROM minio/minio:latest

WORKDIR /data

COPY ./minio-init.sh /usr/bin/minio-init.sh

RUN chmod +x /usr/bin/minio-init.sh

ENTRYPOINT ["/usr/bin/minio-init.sh"]
