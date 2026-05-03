from datetime import datetime

from pydantic import BaseModel
from shared.db import generate_id, now_timestamp


class Notification(BaseModel):
    id: str

    recipient_user_id: str
    actor_user_id: str | None  # None if system notification

    detail: str  # post.liked, task.created, comment.replied

    entity_type: str  # post, comment, task
    entity_id: str

    created_at: datetime
    updated_at: datetime
    read: bool


class NotificationCreate(BaseModel):
    recipient_user_ids: list[str]
    actor_user_id: str | None = None

    detail: str
    entity_type: str
    entity_id: str

    def to_notification(self) -> """Notification""":
        notifs = []
        for recipient_user_id in self.recipient_user_ids:
            notifs.append( 
                Notification(
                    id=generate_id(),
                    recipient_user_id=recipient_user_id,
                    actor_user_id=self.actor_user_id,
                    detail=self.detail,
                    entity_type=self.entity_type,
                    entity_id=self.entity_id,
                    created_at=now_timestamp(),
                    updated_at=now_timestamp(),
                    read=False,
                )
            )
        return notifs
