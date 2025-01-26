import os
import cv2
import numpy as np
import base64
from flask import Flask, render_template, request, jsonify
import logging
import requests
from dotenv import load_dotenv

# Загрузка переменных окружения из .env файла
load_dotenv()

# Настройка логирования
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "секретный_ключ"

# API ключ для LLM из переменных окружения
LLM_API_KEY = os.environ.get("LLM_API_KEY")
LLM_API_URL = os.environ.get("LLM_API_URL")

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/transform', methods=['POST'])
def transform_image():
    try:
        # Получение данных из запроса
        data = request.json
        image_data = data['image'].split(',')[1]
        points = data['points']

        # Декодирование изображения
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        im_src = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if im_src is None:
            return jsonify({'error': 'Ошибка при чтении изображения'}), 400

        # Подготовка точек для трансформации
        pts_src = np.float32([
            [points[0]['x'], points[0]['y']],
            [points[1]['x'], points[1]['y']],
            [points[2]['x'], points[2]['y']],
            [points[3]['x'], points[3]['y']]
        ])

        # Вычисляем размеры выходного изображения
        width = int(max(
            np.sqrt((pts_src[1][0] - pts_src[0][0])**2 + (pts_src[1][1] - pts_src[0][1])**2),
            np.sqrt((pts_src[2][0] - pts_src[3][0])**2 + (pts_src[2][1] - pts_src[3][1])**2)
        ))
        height = int(max(
            np.sqrt((pts_src[3][0] - pts_src[0][0])**2 + (pts_src[3][1] - pts_src[0][1])**2),
            np.sqrt((pts_src[2][0] - pts_src[1][0])**2 + (pts_src[2][1] - pts_src[1][1])**2)
        ))

        # Точки назначения - прямоугольник нужного размера
        pts_dst = np.float32([
            [0, 0],
            [width, 0],
            [width, height],
            [0, height]
        ])

        # Рассчитываем матрицу трансформации
        matrix = cv2.getPerspectiveTransform(pts_src, pts_dst)

        # Применяем трансформацию
        im_out = cv2.warpPerspective(im_src, matrix, (width, height))

        # Кодирование результата в base64
        _, buffer = cv2.imencode('.jpg', im_out)
        result_base64 = base64.b64encode(buffer).decode('utf-8')

        return jsonify({
            'transformed_image': f'data:image/jpeg;base64,{result_base64}',
            'width': width,
            'height': height
        })

    except Exception as e:
        logger.error(f"Ошибка при обработке изображения: {str(e)}")
        return jsonify({'error': 'Произошла ошибка при обработке изображения'}), 500

@app.route('/analyze', methods=['POST'])
def analyze_text():
    try:
        data = request.json
        text = data.get('text', '')

        if not LLM_API_KEY or not LLM_API_URL:
            return jsonify({'error': 'API ключ или URL не настроены'}), 500

        # Формируем запрос к API
        headers = {
            'Authorization': f'ApiKey {LLM_API_KEY}',
            'Content-Type': 'application/json'
        }

        payload = {
            'model': 'gpt-3.5-turbo-0125',
            'messages': [
                {
                    'role': 'system',
                    'content': 'Вы - эксперт по анализу медицинских анализов. Проанализируйте текст результатов анализа и предоставьте краткую интерпретацию.'
                },
                {
                    'role': 'user',
                    'content': text
                }
            ],
            'temperature': 0,
            'max_tokens': 4096
        }

        response = requests.post(LLM_API_URL, headers=headers, json=payload)
        response.raise_for_status()  # Проверяем на ошибки

        result = response.json()
        analysis = result.get('choices', [{}])[0].get('message', {}).get('content', 
            'Не удалось получить анализ от модели')

        return jsonify({
            'analysis': analysis
        })

    except requests.exceptions.RequestException as e:
        logger.error(f"Ошибка при запросе к API: {str(e)}")
        return jsonify({'error': 'Ошибка при подключении к LLM API'}), 500
    except Exception as e:
        logger.error(f"Ошибка при анализе текста: {str(e)}")
        return jsonify({'error': 'Произошла ошибка при анализе текста'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)