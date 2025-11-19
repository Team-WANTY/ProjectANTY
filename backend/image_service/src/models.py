from pydantic import BaseModel


class Blob(BaseModel):
    container: str
    id: str
    url: str

    def to_image(self, user_id: str) -> """Image""":
        return Image(
            container=self.container, id=self.id, url=self.url, uploader_user_id=user_id
        )


class Image(Blob):
    uploader_user_id: str
