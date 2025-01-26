let originalCanvas, transformedCanvas;
let originalContext, transformedContext;
let originalImage = null;
let points = [];
let isDragging = false;
let selectedPoint = null;
let isSelectingPoints = false;

document.addEventListener('DOMContentLoaded', function() {
    originalCanvas = document.getElementById('originalCanvas');
    transformedCanvas = document.getElementById('transformedCanvas');
    originalContext = originalCanvas.getContext('2d');
    transformedContext = transformedCanvas.getContext('2d');

    // Обработчик загрузки изображения
    document.getElementById('imageInput').addEventListener('change', handleImageUpload);

    // Обработчик кнопки выбора точек
    document.getElementById('selectPointsButton').addEventListener('click', startSelectingPoints);

    // Обработчики выбора точек
    originalCanvas.addEventListener('click', addPoint);

    // Обработчики перетаскивания точек
    originalCanvas.addEventListener('mousedown', startDragging);
    originalCanvas.addEventListener('mousemove', drag);
    originalCanvas.addEventListener('mouseup', stopDragging);
    originalCanvas.addEventListener('mouseleave', stopDragging);

    // Обработчик кнопки трансформации
    document.getElementById('transformButton').addEventListener('click', transformImage);
});

function getCanvasCoordinates(e) {
    const rect = originalCanvas.getBoundingClientRect();
    const scaleX = originalCanvas.width / rect.width;
    const scaleY = originalCanvas.height / rect.height;

    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        originalImage = new Image();
        originalImage.onload = function() {
            // Установка размеров канвасов
            originalCanvas.width = originalImage.width;
            originalCanvas.height = originalImage.height;
            transformedCanvas.width = originalImage.width;
            transformedCanvas.height = originalImage.height;

            // Отрисовка изображения
            originalContext.drawImage(originalImage, 0, 0);

            // Активация кнопки выбора точек
            document.getElementById('selectPointsButton').disabled = false;

            // Сброс точек при загрузке нового изображения
            points = [];
            drawPoints();
        };
        originalImage.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function startSelectingPoints() {
    isSelectingPoints = true;
    points = [];
    drawPoints();
}

function addPoint(e) {
    if (!isSelectingPoints) return;

    const coords = getCanvasCoordinates(e);

    if (points.length < 4) {
        points.push(coords);
        drawPoints();

        if (points.length === 4) {
            isSelectingPoints = false;
            document.getElementById('transformButton').disabled = false;
        }
    }
}

function drawPoints() {
    // Очистка и перерисовка изображения
    originalContext.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
    originalContext.drawImage(originalImage, 0, 0);

    if (points.length > 1) {
        // Рисование линий между точками
        originalContext.beginPath();
        originalContext.moveTo(points[0].x, points[0].y);
        for (let i = 1; i <= points.length; i++) {
            const point = points[i % points.length];
            if (point) {
                originalContext.lineTo(point.x, point.y);
            }
        }
        originalContext.strokeStyle = '#00ff00';
        originalContext.lineWidth = 2;
        originalContext.stroke();
    }

    // Рисование точек
    points.forEach((point, index) => {
        originalContext.beginPath();
        originalContext.arc(point.x, point.y, 6, 0, Math.PI * 2);
        originalContext.fillStyle = '#00ff00';
        originalContext.fill();
        originalContext.strokeStyle = '#ffffff';
        originalContext.lineWidth = 2;
        originalContext.stroke();

        // Добавление номера точки
        originalContext.font = '14px Arial';
        originalContext.fillStyle = '#ffffff';
        originalContext.fillText((index + 1).toString(), point.x + 10, point.y + 10);
    });
}

function startDragging(e) {
    if (isSelectingPoints) return;

    const coords = getCanvasCoordinates(e);

    points.forEach((point, index) => {
        const distance = Math.sqrt((coords.x - point.x) ** 2 + (coords.y - point.y) ** 2);
        if (distance < 10) {
            isDragging = true;
            selectedPoint = index;
        }
    });
}

function drag(e) {
    if (!isDragging) return;

    const coords = getCanvasCoordinates(e);
    points[selectedPoint] = coords;
    drawPoints();
}

function stopDragging() {
    isDragging = false;
    selectedPoint = null;
}

function transformImage() {
    if (!originalImage || points.length !== 4) return;

    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading';
    loadingElement.innerHTML = '<div class="loading-spinner"></div>';
    document.body.appendChild(loadingElement);

    // Создаем временный canvas для отправки чистого изображения
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalImage.width;
    tempCanvas.height = originalImage.height;
    const tempContext = tempCanvas.getContext('2d');
    tempContext.drawImage(originalImage, 0, 0);

    // Очистка transformedCanvas перед отображением нового результата
    transformedContext.clearRect(0, 0, transformedCanvas.width, transformedCanvas.height);

    fetch('/transform', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            image: tempCanvas.toDataURL(),
            points: points
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }

        const transformedImage = new Image();
        transformedImage.onload = function() {
            transformedCanvas.width = data.width;
            transformedCanvas.height = data.height;
            transformedContext.clearRect(0, 0, transformedCanvas.width, transformedCanvas.height);
            transformedContext.drawImage(transformedImage, 0, 0);
            document.body.removeChild(loadingElement);
        };
        transformedImage.src = data.transformed_image;
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Произошла ошибка при трансформации изображения: ' + error.message);
        document.body.removeChild(loadingElement);
    });
}