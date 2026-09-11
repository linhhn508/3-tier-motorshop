import boto3
from flask import current_app, jsonify, request

from app.middleware import token_required
from app.upload import bp, logger


def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=f"http://{current_app.config['MINIO_ENDPOINT']}",
        aws_access_key_id=current_app.config["MINIO_ROOT_USER"],
        aws_secret_access_key=current_app.config["MINIO_ROOT_PASSWORD"],
    )


@bp.route("/presign", methods=["GET"])
@token_required
def presign():
    logger.debug("Generating presigned URL for S3 upload.")
    filename = request.args.get("filename")
    if not filename:
        logger.error("filename parameter is required.")
        return jsonify({"error": "filename parameter is required"}), 400

    client = get_s3_client()
    url = client.generate_presigned_url(
        "put_object",
        Params={"Bucket": "product-image", "Key": filename},
        ExpiresIn=300,
    )
    logger.debug(f"Presigned URL generated for filename: {filename}")
    return jsonify({"url": url})
