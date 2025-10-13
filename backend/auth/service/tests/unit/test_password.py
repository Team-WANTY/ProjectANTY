from service.security.password import get_password_hash, verify_password


class TestPasswordSecurity:
    def test_hash_password(self, sample_user_create):
        """Test password hashing"""
        password = sample_user_create.plain_text_password
        hashed = get_password_hash(password)

        assert hashed != password
        assert hashed.startswith("$argon2")

    def test_verify_correct_password(self, sample_user_create):
        """Test verification with correct password"""
        password = sample_user_create.plain_text_password
        hashed = get_password_hash(password)

        assert verify_password(password, hashed) is True

    def test_verify_incorrect_password(self, sample_user_create):
        """Test verification with incorrect password"""
        password = sample_user_create.plain_text_password
        wrong_password = "DIFFERENT" + sample_user_create.plain_text_password
        hashed = get_password_hash(password)

        assert verify_password(wrong_password, hashed) is False

    def test_different_hashes_for_same_password(self, sample_user_create):
        """Test that same password generates different hashes (salt)"""
        password = sample_user_create.plain_text_password
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)

        assert hash1 != hash2
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True
