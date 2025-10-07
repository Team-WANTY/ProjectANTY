from azure.cosmos import CosmosClient, CosmosDict, exceptions
from pydantic import EmailStr
from config import settings
from typing import Optional
from models.user import User, UserCreate, UserInDB, UserUpdate

class CosmosDBClient:
    def __init__(self):
        self.client = CosmosClient(settings.cosmosdb_endpoint.get_secret_value(), settings.cosmosdb_key.get_secret_value())
        self.database = self.client.get_database_client(settings.cosmosdb_database_name)
        self.users_container = self.database.get_container_client(settings.cosmosdb_user_container_name)
    
    def create_user(self, user_create: UserCreate) -> UserInDB:
        """Create a new user in CosmosDB"""
        try:
            user_in_db = UserInDB.from_user_create(user_create=user_create)
            return UserInDB(**self.users_container.create_item(body=user_in_db.model_dump()))
        except exceptions.CosmosHttpResponseError:
            raise ValueError("User already exists")
    
    def get_user_by_id(self, user_id: str) -> Optional[UserInDB]:
        """Get user by ID"""
        try:
            return UserInDB(**self.users_container.read_item(item=user_id, partition_key=user_id))
        except exceptions.CosmosResourceNotFoundError:
            return None
    
    def get_user_by_username(self, username: str) -> Optional[UserInDB]:
        """Get user by username"""
        query = "SELECT * FROM c WHERE c.username = @username"
        parameters: list[dict[str, object]] = [{"name": "@username", "value": username}]
        items = list(self.users_container.query_items(
            query=query,
            parameters=parameters,
            enable_cross_partition_query=True
        ))
        return UserInDB(**items[0]) if items else None
    
    def get_user_by_email(self, email: EmailStr) -> Optional[UserInDB]:
        """Get user by email"""
        query = "SELECT * FROM c WHERE c.email = @email"
        parameters: list[dict[str, object]] = [{"name": "@email", "value": email}]
        items = list(self.users_container.query_items(
            query=query,
            parameters=parameters,
            enable_cross_partition_query=True
        ))
        return UserInDB(**items[0]) if items else None
    
    def update_user(self, user_id: str, user_in_db: UserInDB) -> UserInDB:
        """Update user in CosmosDB"""
        try:
            return UserInDB(**self.users_container.replace_item(item=user_id, body=user_in_db.model_dump()))
        except exceptions.CosmosResourceNotFoundError:
            raise ValueError("User not found")
    
    def delete_user(self, user_id: str) -> None:
        """Delete user from CosmosDB"""
        try:
            self.users_container.delete_item(item=user_id, partition_key=user_id)
        except exceptions.CosmosResourceNotFoundError:
            raise ValueError("User not found")
    
    # def list_users(self, skip: int = 0, limit: int = 100) -> list[UserInDB]:
    #     """List all users with pagination. skip offsets start position, limit limits returned amount, default to 100"""
    #     query = "SELECT * FROM c OFFSET @skip LIMIT @limit"
    #     parameters = [
    #         {"name": "@skip", "value": skip},
    #         {"name": "@limit", "value": limit}
    #     ]
    #     user_dicts = self.users_container.query_items(
    #         query=query,
    #         parameters=parameters,
    #         enable_cross_partition_query=True
    #     )
    #     return [UserInDB(**user_dict) for user_dict in user_dicts]

db_client = CosmosDBClient()