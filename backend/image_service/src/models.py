from pydantic import BaseModel


class Blob(BaseModel):
    container: str
    id: str
    url: str

    def to_image(self, user_id: str) -> """Image""":
        return Image(
            container=self.container,
            id=self.id,
            url=self.url,
            uploader_user_id=user_id
        )

class Image(Blob):
    uploader_user_id: str


"""
User Flow Notes:

Create profile: id = 0

get_image(id=0)
- query image in DB with ID
- return url

upload_pfp_image(img_bytes)
- upload_image(id, new?)
    - create uuid
    - azure upload image
    - DB save image info with ID, URL
    - return image ID
- user profile update pfp ID


delete_img(id=x)
- query image in DB with ID
- delete image in blob

DB
- create new image metadata
- delete image metadata
- find image metadata (based on ID)

Blob
- upload, return url
- delete given url
"""
