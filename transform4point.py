import cv2
import numpy as np
import imutils
import os

pts_src_points = []

filename = 'img_8513.jpg'
filepath = f'JPG/{filename}'
outpath = f'JPG/transform/{filename[:-4]}_rot.jpg'

for i in range(0, 4):
    x = int(input(f'X{i+1}= '))
    y = int(input(f'Y{i+1}= '))
    elem = [x, y]
    pts_src_points.append(elem)

# print(pts_src_points)

x_min = None
x_max = None
y_min = None
y_max = None

for i in pts_src_points:
    x, y = i[0], i[1]
    if x_min == None or x < x_min:
        x_min = x
    if x_max == None or x > x_max:
        x_max = x

    if y_min == None or y < x_min:
        y_min = y
    if y_max == None or x > y_max:
        y_max = y

pts_dst_point = [[x_min, y_min], [x_max, y_min], [x_max, y_max], [x_min, y_max]]

# Загрузка исходного изображения.
im_src = cv2.imread(filepath)

# Четыре точки соответствия в исходном изображении
pts_src = np.array(pts_src_points)

# Рисуем область по ключевым точкам
# cv2.polylines(im_src, [pts_src], True,(0,255,255), 3) 

# Загрузка изображение для трансформации (в нашем случае это одно и тоже изображение)
im_dst = cv2.imread(filepath)

# Четыре точки соответствия в изображении трансформации
pts_dst = np.array(pts_dst_point)

# Рассчитываем гомографию
h, status = cv2.findHomography(pts_src, pts_dst)
    
# Трансформируем исходное изображение, используя полученную гомографию
im_out = cv2.warpPerspective(im_src, h, (im_dst.shape[1],im_dst.shape[0]))

#  Скалируем изображение до ширины 1200px
im_src = imutils.resize(im_src, width=1200)
im_out = imutils.resize(im_out, width=1200)

# Объединяем изображения в один ряд
stacked = np.hstack([im_src, im_out])

cv2.imwrite(outpath, im_out)
    
cv2.imshow("Warped Source Image", stacked)
cv2.waitKey(0)

# os.startfile(r'img_rez.jpg')