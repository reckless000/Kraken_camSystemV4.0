from flask import Flask, Response, send_file
import cv2
import time

app = Flask(__name__)

# PUT YOUR REAL CAMERA PATHS HERE
cam_front = cv2.VideoCapture("paste camera path here")
cam_gripper = cv2.VideoCapture("paste camera path here")
cam_rear = cv2.VideoCapture("paste camera path here")

@app.route('/')
def index():
    return send_file('index.html')

def gen(cam):
    prev_time = time.time()
    fps = 0
    alpha = 0.1

    while True:
        success, frame = cam.read()
        if not success:
            break

        frame = cv2.resize(frame, (1280, 720))

        current_time = time.time()
        dt = current_time - prev_time
        if dt > 0:
            instant_fps = 1 / dt
            fps = alpha * instant_fps + (1 - alpha) * fps
        prev_time = current_time

        cv2.putText(
            frame,
            f"FPS: {fps:.1f}",
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (0, 255, 0),
            2
        )

        ok, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
        if not ok:
            continue

        yield (
            b'--frame\r\n'
            b'Content-Type: image/jpeg\r\n\r\n' +
            buffer.tobytes() +
            b'\r\n'
        )

@app.route('/front')
def front_feed():
    return Response(gen(cam_front),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/gripper')
def gripper_feed():
    return Response(gen(cam_gripper),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/rear')
def rear_feed():
    return Response(gen(cam_rear),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5001, debug=False)
