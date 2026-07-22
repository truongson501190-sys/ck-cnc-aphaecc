from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/ocr', methods=['POST'])
def ocr():
    return jsonify({
        'status': 'success',
        'text': 'Ngày 20/07/2026, Ca 1, Máy M001, Sản phẩm SP001, Số lượng 100.',
        'length': 100,
        'filename': 'mock.jpg'
    })

if __name__ == '__main__':
    app.run(port=5001, debug=True)