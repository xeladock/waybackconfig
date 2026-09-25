import os
import json
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

# Задаем базовый абсолютный путь на HDD
BASE_ARCHIVE_DIR = '/archive'


class ConfigServer(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_url = urlparse(self.path)

        # 1. Возвращает СПИСОК ПОДПАПОК (Регионы, Типы устройств и т.д.)
        if parsed_url.path == '/api/folders':
            query_params = parse_qs(parsed_url.query)
            rel_path = query_params.get('path', [''])[0]

            if rel_path.startswith('/archive'):
                rel_path = rel_path[len('/archive'):]

            full_path = os.path.abspath(os.path.join(BASE_ARCHIVE_DIR, rel_path.lstrip('/')))

            if os.path.exists(full_path) and os.path.isdir(full_path):
                # Фильтруем только папки
                folders = [f for f in os.listdir(full_path) if os.path.isdir(os.path.join(full_path, f))]
                folders.sort()

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(folders, ensure_ascii=False).encode('utf-8'))
            else:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps([], ensure_ascii=False).encode('utf-8'))
            return

        # 2. Возвращает СПИСОК ФАЙЛОВ в папке устройства
        elif parsed_url.path == '/api/devices':
            query_params = parse_qs(parsed_url.query)
            rel_path = query_params.get('path', [''])[0]

            if rel_path.startswith('/archive'):
                rel_path = rel_path[len('/archive'):]

            full_path = os.path.abspath(os.path.join(BASE_ARCHIVE_DIR, rel_path.lstrip('/')))

            if os.path.exists(full_path) and os.path.isdir(full_path):
                # Фильтруем только файлы
                files = [f for f in os.listdir(full_path) if os.path.isfile(os.path.join(full_path, f))]
                files.sort()

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(files, ensure_ascii=False).encode('utf-8'))
            else:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps([], ensure_ascii=False).encode('utf-8'))
            return

        # 3. Чтение содержимого файла
        elif parsed_url.path == '/api/config':
            query_params = parse_qs(parsed_url.query)
            rel_path = query_params.get('path', [''])[0]

            if rel_path.startswith('/archive'):
                rel_path = rel_path[len('/archive'):]

            full_path = os.path.abspath(os.path.join(BASE_ARCHIVE_DIR, rel_path.lstrip('/')))

            if os.path.exists(full_path) and os.path.isfile(full_path):
                self.send_response(200)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.end_headers()
                with open(full_path, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self.send_error(404, "File not found")
            return

        return super().do_GET()


if __name__ == '__main__':
    print(f"Сервер запущен! Поиск конфигов привязан к абсолютной папке: {BASE_ARCHIVE_DIR}")
    print("Откройте в браузере: http://localhost:8001")
    HTTPServer(('0.0.0.0', 8001), ConfigServer).serve_forever()