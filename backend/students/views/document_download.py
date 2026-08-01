from django.http import FileResponse, Http404
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from core.models import AuditLog, User
from students.models import Document
from students.services.secure_links import verify_download_token


class DocumentDownloadView(APIView):
    """Streams a document's original or renamed file, gated purely by a
    short-lived signed token (see secure_links.py) - deliberately no
    Authorization header requirement, since this URL is meant to be opened
    directly (a plain <a href> click can't attach a Bearer token). The
    token was only ever issued to an already-authorized user via the
    document serializer, and it embeds who that was so the download is
    still attributable in the audit log."""

    permission_classes = [AllowAny]

    def get(self, request, uid, *args, **kwargs):
        token = request.query_params.get("token", "")
        result = verify_download_token(token)
        if not result or result[0] != str(uid):
            raise Http404

        _, file_field, user_id = result
        try:
            document = Document.objects.select_related(
                "case__student__organisation"
            ).get(uid=uid)
        except Document.DoesNotExist as exc:
            raise Http404 from exc

        file_obj = (
            document.original_file if file_field == "original" else document.renamed_file
        )
        if not file_obj:
            raise Http404

        AuditLog.objects.create(
            organisation=document.case.student.organisation,
            actor=User.objects.filter(id=user_id).first(),
            action_type="DOCUMENT_DOWNLOADED",
            target_model="Document",
            target_uid=document.uid,
            details={"file_field": file_field},
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return FileResponse(
            file_obj.open("rb"),
            as_attachment=True,
            filename=file_obj.name.rsplit("/", 1)[-1],
        )
