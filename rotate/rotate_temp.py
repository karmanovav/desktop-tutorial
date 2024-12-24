import numpy as np
import imutils
import cv2

img = '34_crop.jpg'
temp = 'temp.jpg'
maxFeatures=500
debug=True
keepPercent=0.2

image = cv2.imread(img)
template = cv2.imread(temp)
# cv2.namedWindow('window', cv2.WINDOW_NORMAL)

# конвертация в  Gray 
imageGray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
templateGray = cv2.cvtColor(template, cv2.COLOR_RGB2GRAY)

# Hori = np.concatenate((imageGray, templateGray), axis=1)
# cv2.imshow('window', Hori)
# cv2.waitKey(0)

orb = cv2.ORB_create(maxFeatures)
(kpsA, descsA) = orb.detectAndCompute(imageGray, None)
(kpsB, descsB) = orb.detectAndCompute(templateGray, None)

method = cv2.DESCRIPTOR_MATCHER_BRUTEFORCE_HAMMING
matcher = cv2.DescriptorMatcher_create(method)
matches = matcher.match(descsA, descsB, None)

matches = sorted(matches, key=lambda x:x.distance)
keep = int(len(matches) * keepPercent)
matches = matches[:keep]

if debug:
    matchedVis = cv2.drawMatches(image, kpsA, template, kpsB,
    matches, None)
    matchedVis = imutils.resize(matchedVis, width=2000)
    cv2.imshow("Оригинал и шаблон с ключевыми точками", matchedVis)
    cv2.waitKey(0)

ptsA = np.zeros((len(matches), 2), dtype="float")
ptsB = np.zeros((len(matches), 2), dtype="float")

for (i, m) in enumerate(matches):
    ptsA[i] = kpsA[m.queryIdx].pt
    ptsB[i] = kpsB[m.trainIdx].pt

    (H, mask) = cv2.findHomography(ptsA, ptsB, method=cv2.RANSAC)
    (h, w) = template.shape[:2]

aligned = cv2.warpPerspective(image, H, (w, h))

cv2.imwrite('34_transforme.jpg', aligned)

aligned = imutils.resize(aligned, width=700)
template = imutils.resize(template, width=700)



stacked = np.hstack([aligned, template])

cv2.imshow("Выровненный оригинал и шаблон", stacked)
cv2.waitKey(0)



