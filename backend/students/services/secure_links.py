from django.core.signing import BadSignature, SignatureExpired, TimestampSigner

# Short-lived on purpose - these are regenerated fresh every time a document
# is serialized, so a link only needs to survive the click that follows.
DOWNLOAD_TOKEN_MAX_AGE_SECONDS = 300

_signer = TimestampSigner(salt="document-download")


def generate_download_token(document_uid: str, file_field: str, user_id: int) -> str:
    """The requesting user's id is baked into the signed payload - the
    download endpoint itself needs no Authorization header (a plain <a
    href> can't attach one), but the token still lets the download be
    attributed to whoever it was issued to."""
    return _signer.sign(f"{document_uid}:{file_field}:{user_id}")


def verify_download_token(token: str):
    """Returns (document_uid, file_field, user_id) if the token is valid
    and not expired, else None."""
    try:
        value = _signer.unsign(token, max_age=DOWNLOAD_TOKEN_MAX_AGE_SECONDS)
    except (BadSignature, SignatureExpired):
        return None
    try:
        document_uid, file_field, user_id = value.rsplit(":", 2)
    except ValueError:
        return None
    return document_uid, file_field, user_id
