# Generating encryption keys
## Linux
### Token Key Pair
    openssl genpkey -algorithm RSA -out token_private_key.pem -pkeyopt rsa_keygen_bits:2048 && openssl rsa -pubout -in token_private_key.pem -out token_public_key.pem