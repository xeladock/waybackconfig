import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, PlainTextResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

BASE_ARCHIVE_DIR = '/archive'

app = FastAPI(title="WaybackConfig", version="0.19")

if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")
if os.path.exists("nm"):
    app.mount("/nm", StaticFiles(directory="nm"), name="nm")


def check_archive_health():
    """Проверяет, существует ли директория /archive и содержит ли она файлы/папки."""
    if not os.path.exists(BASE_ARCHIVE_DIR) or not os.path.isdir(BASE_ARCHIVE_DIR):
        return False
    try:
        contents = os.listdir(BASE_ARCHIVE_DIR)
        if len(contents) == 0:
            return False
    except Exception:
        return False
    return True

@app.get("/healthz/live", status_code=200)
async def liveness():
    """Проверка: жив ли процесс Python"""
    return {"status": "ok"}

@app.get("/healthz/ready", summary="Kubernetes Liveness Probe")
def liveness_probe():
    """Эндпоинт для k8s liveness probe и фронтенд-поллинга."""
    if not check_archive_health():
        return JSONResponse(
            status_code=503,
            content={"status": "error", "message": "Сервис временно недоступен."}
        )
    return {"status": "ok", "message": "главное окно"}


@app.get("/", response_class=HTMLResponse)
def serve_index():
    """Главная страница интерфейса с автопроверкой связи каждые 60 секунд при 503."""
    if not check_archive_health():
        error_html = """
        <!DOCTYPE html>
        <html lang="ru" class="dark">
        <head>
            <meta charset="UTF-8">
            <title>WaybackConfig - Сервис недоступен</title>
            <script src="./static/js/tailwind.js"></script>
            <script>
                // Автопроверка каждые 60 секунд (60000 мс)
                setInterval(async () => {
                    try {
                        const response = await fetch('/healthz/ready');
                        if (response.ok) {
                            // Если архив появился и не пуст — перезагружаем страницу в "главное окно"
                            window.location.reload();
                        }
                    } catch (e) {
                        console.log("Ожидание восстановления сервиса...");
                    }
                }, 60000);
            </script>
        </head>
        <body class="bg-gray-900 text-gray-100 h-screen flex flex-col items-center justify-center font-sans">
            <div class="text-center p-8 bg-gray-800 rounded-xl border border-gray-700 shadow-xl max-w-md">
                <div class="text-4xl mb-4">⚠️</div>
                <h1 class="text-xl font-bold text-red-400 mb-2">Ой! Что-то пошло не так!</h1>
                <p class="text-sm text-gray-400">Сайт восстановит работу автоматически после устранения неполадок.</p>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(content=error_html, status_code=503)

    index_path = "index.html"
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return f.read()
    return "index.html не найден", 404


@app.get('/api/folders')
def api_folders(path: str = ""):
    if not check_archive_health():
        raise HTTPException(status_code=503, detail="Сервис временно недоступен.")

    if path.startswith('/archive'):
        path = path[len('/archive'):]

    full_path = os.path.abspath(os.path.join(BASE_ARCHIVE_DIR, path.lstrip('/')))

    if os.path.exists(full_path) and os.path.isdir(full_path):
        folders = [f for f in os.listdir(full_path) if os.path.isdir(os.path.join(full_path, f))]
        folders.sort()
        return folders
    return []


@app.get('/api/devices')
def api_devices(path: str = ""):
    if not check_archive_health():
        raise HTTPException(status_code=503, detail="Сервис временно недоступен.")

    if path.startswith('/archive'):
        path = path[len('/archive'):]

    full_path = os.path.abspath(os.path.join(BASE_ARCHIVE_DIR, path.lstrip('/')))

    if os.path.exists(full_path) and os.path.isdir(full_path):
        files = [f for f in os.listdir(full_path) if os.path.isfile(os.path.join(full_path, f))]
        files.sort()
        return files
    return []


@app.get('/api/config')
def api_config(path: str = ""):
    if not check_archive_health():
        raise HTTPException(status_code=503, detail="Сервис временно недоступен.")

    if path.startswith('/archive'):
        path = path[len('/archive'):]

    full_path = os.path.abspath(os.path.join(BASE_ARCHIVE_DIR, path.lstrip('/')))

    if os.path.exists(full_path) and os.path.isfile(full_path):
        with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
            return PlainTextResponse(f.read())

    raise HTTPException(status_code=404, detail="File not found")


if __name__ == '__main__':
    import uvicorn

    # print(f"Запуск FastAPI сервера через Uvicorn. Архив: {BASE_ARCHIVE_DIR}")
    uvicorn.run(app, host="0.0.0.0", port=8001, workers=1,access_log=False)