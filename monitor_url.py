import requests
import time
import subprocess
import os 

# load telegram token from dotenv
from dotenv import load_dotenv
load_dotenv()

# Telegram bot token
TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')

# Telegram chat ID(s) where the message will be sent
CHAT_IDS = [id.strip() for id in os.getenv('TELEGRAM_CHAT_ID').split(",")]

HOST = os.getenv('HOST', 'http://localhost:5002')

# URL to check
URL = f'{HOST}/v1/models'

# Path to the docker-compose executable
DOCKERPATH = os.getenv('DOCKERPATH', '/usr/bin/docker')

def restart_container():
    try:
        output = subprocess.check_output(f'{DOCKERPATH} compose restart mockai', shell=True, stderr=subprocess.PIPE)
        print(output.decode())
    except subprocess.CalledProcessError as e:
        print(f'Error: {e.output.decode()}')

def send_telegram_message(message):
    url = f'https://api.telegram.org/bot{TOKEN}/sendMessage'
    for chat_id in CHAT_IDS:
        data = {'chat_id': chat_id, 'text': message}
        try:
            requests.post(url, json=data)
        except requests.exceptions.RequestException as e:
            print(f'Error sending Telegram message to {chat_id}: {e}')
    restart_container()

while True:
    try:
        response = requests.get(URL, timeout=5)
        if response.status_code != 200:
            print(f'URL {URL} returned {response.status_code}, sending Telegram message...')
            send_telegram_message(f'URL {URL} is down!')
    except requests.exceptions.RequestException as e:
        print(f'Error checking URL {URL}: {e}')
        send_telegram_message(f'Error checking URL {URL}: {e}')

    time.sleep(60)  # check every 1 minute