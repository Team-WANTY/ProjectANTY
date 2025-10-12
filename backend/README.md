# To Run

For dev, use `docker compose -f compose.yml -f compose.dev.yml up --build`. If setting up for the first time, follow the instructions under Dev Notes.

# Dev Notes
Installing mkcert:
`sudo dnf install nss-tools -y` 
`curl -JLO https://dl.filippo.io/mkcert/latest?for=linux/amd64` 
`chmod +x mkcert-v*-linux-amd64` 
`sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert` 

`mkcert -install` 

`mkcert localhost 127.0.0.1 ::1 "*.localhost"` 

`mkdir -p certs` 
`mv localhost+x-key.pem certs/key.pem` 
`mv localhost+x.pem certs/cert.pem` 
