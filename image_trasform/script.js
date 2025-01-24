let imgElement = null;
let srcPoints = [];
let dstPoints = [];
let isSelectingPoints = false;
let scaleFactor = 1;

function loadImage() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = function (event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
      imgElement = new Image();
      imgElement.src = e.target.result;
      imgElement.onload = function () {
        const canvas = document.getElementById("canvas");
        const ctx = canvas.getContext("2d");

        // Масштабирование изображения до max-width=1000px
        scaleFactor = Math.min(1000 / imgElement.width, 1);
        canvas.width = imgElement.width * scaleFactor;
        canvas.height = imgElement.height * scaleFactor;

        ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
      };
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function selectPoints() {
  if (!imgElement) {
    alert("Сначала загрузите изображение.");
    return;
  }
  isSelectingPoints = true;
  srcPoints = [];
  document.getElementById("points-output").innerHTML = ""; // Очистка вывода точек
  alert("Выберите 4 точки на изображении.");
}

function setCorrespondence() {
  if (srcPoints.length === 4) {
    // Расчет точек соответствия
    let x_min = null;
    let x_max = null;
    let y_min = null;
    let y_max = null;

    for (let i of srcPoints) {
      let x = i[0];
      let y = i[1];
      if (x_min === null || x < x_min) {
        x_min = x;
      }
      if (x_max === null || x > x_max) {
        x_max = x;
      }
      if (y_min === null || y < y_min) {
        y_min = y;
      }
      if (y_max === null || y > y_max) {
        y_max = y;
      }
    }

    dstPoints = [
      [x_min, y_min],
      [x_max, y_min],
      [x_max, y_max],
      [x_min, y_max],
    ];

    // Пересчет координат для отображения на canvas
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "green";
    dstPoints.forEach((point) => {
      const [x, y] = point;
      const canvasX = x * (canvas.width / imgElement.width);
      const canvasY = y * (canvas.height / imgElement.height);
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 5, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Вывод точек соответствия текстом
    const correspondenceOutput = document.getElementById(
      "correspondence-output"
    );
    correspondenceOutput.innerHTML = `Точки соответствия: <br>
            [${x_min.toFixed(2)}, ${y_min.toFixed(2)}], <br>
            [${x_max.toFixed(2)}, ${y_min.toFixed(2)}], <br>
            [${x_max.toFixed(2)}, ${y_max.toFixed(2)}], <br>
            [${x_min.toFixed(2)}, ${y_max.toFixed(2)}]`;

    alert("Точки соответствия установлены и отображены зеленым цветом.");
  } else {
    alert("Сначала выберите 4 точки на изображении.");
  }
}

function transformImage() {
  if (srcPoints.length === 4 && dstPoints.length === 4) {
    alert("вывод изображения");

    const canvas = document.getElementById("canvas_rez");
    const ctx = canvas.getContext("2d");

    // Преобразование точек в формат, подходящий для OpenCV
    const srcMat = cv.matFromArray(4, 1, cv.CV_32FC2, srcPoints.flat());
    const dstMat = cv.matFromArray(4, 1, cv.CV_32FC2, dstPoints.flat());

    // Вычисление матрицы гомографии
    const homography = cv.findHomography(srcMat, dstMat);

    // Применение перспективного преобразования
    const srcImg = cv.imread(canvas);
    const dstImg = new cv.Mat();
    cv.warpPerspective(srcImg, dstImg, homography, new cv.Size(1000, 1000));

    // Отображение результата
    // cv.imshow(canvas, dstImg);
    alert("вывод изображения");

    // Освобождение ресурсов
    srcImg.delete();
    dstImg.delete();
    srcMat.delete();
    dstMat.delete();
    homography.delete();
  } else {
    alert("Сначала выберите 4 точки и установите точки соответствия.");
  }
}

document.getElementById("canvas").addEventListener("click", function (event) {
  if (isSelectingPoints && srcPoints.length < 4) {
    const rect = event.target.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (imgElement.width / rect.width);
    const y = (event.clientY - rect.top) * (imgElement.height / rect.height);
    srcPoints.push([x, y]);

    const ctx = event.target.getContext("2d");
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(
      event.clientX - rect.left,
      event.clientY - rect.top,
      5,
      0,
      2 * Math.PI
    );
    ctx.fill();

    // Вывод координат выбранных точек
    const pointsOutput = document.getElementById("points-output");
    pointsOutput.innerHTML += `Точка ${srcPoints.length}: [${x.toFixed(
      2
    )}, ${y.toFixed(2)}]<br>`;

    if (srcPoints.length === 4) {
      isSelectingPoints = false;
      alert("4 точки выбраны.");
    }
  }
});
