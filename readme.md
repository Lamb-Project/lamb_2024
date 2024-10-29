- **data** -> folder of open webui database and internal workings 
- **db** -> chromadb folder
- **mockai** -> Mockai API server


# Docker-compose mahem explained

The docker compose assumes that
1) The dockerfile is invocked on the ../LLMentor-container directory

on the ".." directory we have the folders
- LLMentor-container folder
- open-webui folder (use our modified version for TSugi login and other goodness) https://github.com/granludo/open-webui/tree/LTI-LLMentor-Integration 
- LTI-LLPrimer-Bridge (from https://github.com/granludo/LTI-LLPrimer-Bridge )
- tsugi folder (from the standard tsugi https://github.com/tsugiproject/tsugi ) but replace the config.php from the one in LTI-LLMPrimer-Bridge 

```
../
├── LLMentor-container/    # Docker Compose file location
├── open-webui/            # Modified version for TSugi login
│   └── backend/           # Volume for Open-WebUI container
├── LTI-LLPrimer-Bridge/   # Bridge for integration
└── tsugi/                 # Standard Tsugi with modified config.php from LTI-LLPrimer-Bridge
    └── .docker_data/
        └── mysql/         # Volume for DB (Tsugi) container

```


Then it should go as this

# Ports and containers

| Host Port | Container     | Container Port |
|-----------|---------------|----------------|
| `8008`    | Chroma        | `8000`         |
| `8080`    | Open-WebUI    | `8080`         |
| `5002`    | MockAI        | `5002`         |
| `33306`   | DB (Tsugi)    | `3306`         |
| `8888`    | Web (Tsugi)   | `80`           |

# Host persistent data

| Host Path                    | Container     | Container Volume       |
|------------------------------|---------------|------------------------|
| `./db`                       | Chroma        | `/chroma/chroma/`      |
| `../open-webui/backend`      | Open-WebUI    | `/app/backend`         |
| `./mockai`                   | MockAI        | `/app`                 |
| `../tsugi/.docker_data/mysql`| DB (Tsugi)    | `/var/lib/mysql`       |
| `../tsugi`                   | Web (Tsugi)   | `/var/www/html/tsugi`  |


# Relevant docker-compose adn setup aspects

## .env variables
* OPENAI_API_KEY= "your fire trucking key"
* CHROMADB_HOST=chroma

LTI_SECRET -> Used to authenticate LTI Tool for ltibridge security

```
      OPEN_WEBUI_HOST network address from the container orchestration system 
      LTI_SECRET: secreet shared by open-webui ltibridge and tsugi
      WEBUI_HTML_BASE: -> web adress for open-webui outside the container
```

the docker compose contains tsugi db passwords you might want to change
```
      MYSQL_ROOT_PASSWORD: tsugi_root_pw
      MYSQL_DATABASE: tsugi
      MYSQL_USER: ltiuser
      MYSQL_PASSWORD: ltipassword
```

This passwords need to match in the tsugi config.php file 
