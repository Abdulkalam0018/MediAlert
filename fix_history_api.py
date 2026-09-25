import re

with open("frontend/src/pages/History/DoseHistory.jsx", "r") as f:
    content = f.read()

content = content.replace(
    'const response = await axiosInstance.get("/tracks");',
    'const response = await axiosInstance.get("/tracks/all");'
)

with open("frontend/src/pages/History/DoseHistory.jsx", "w") as f:
    f.write(content)
