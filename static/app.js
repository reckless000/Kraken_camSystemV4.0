const { InferenceEngine, CVImage } = inferencejs;
const inferEngine = new InferenceEngine();

const frontImage = document.getElementById("front-stream");
const overlay = document.getElementById("front-overlay");
const ctx = overlay.getContext("2d");
const statusBox = document.getElementById("detect-status");

let workerId = null;
let inferenceBusy = false;
let lastPredictions = [];

// PASTE YOUR ROBOFLOW KEY HERE
const PUBLISHABLE_KEY = "rf_03pX1j0khjddAcy9jDgghgo4mRs2";

// From your Roboflow snippet
const MODEL_ID = "green-crabs-uejkg";
const MODEL_VERSION = "1";

function resizeOverlay() {
    const rect = frontImage.getBoundingClientRect();
    overlay.width = rect.width;
    overlay.height = rect.height;
}

function setStatus(text) {
    if (statusBox) {
        statusBox.textContent = text;
    }
}

function drawPredictions(predictions) {
    resizeOverlay();
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const displayWidth = overlay.width;
    const displayHeight = overlay.height;

    const naturalWidth = frontImage.naturalWidth || displayWidth;
    const naturalHeight = frontImage.naturalHeight || displayHeight;

    const scaleX = displayWidth / naturalWidth;
    const scaleY = displayHeight / naturalHeight;

    predictions.forEach((pred) => {
        const x = pred.x * scaleX;
        const y = pred.y * scaleY;
        const w = pred.width * scaleX;
        const h = pred.height * scaleY;

        const x1 = x - w / 2;
        const y1 = y - h / 2;

        ctx.strokeStyle = "lime";
        ctx.lineWidth = 3;
        ctx.strokeRect(x1, y1, w, h);

        ctx.fillStyle = "lime";
        ctx.font = "16px Arial";
        const label = `${pred.class} ${pred.confidence.toFixed(2)}`;
        ctx.fillText(label, x1, Math.max(20, y1 - 8));
    });
}

function runInference() {
    if (!workerId || inferenceBusy) {
        return;
    }

    inferenceBusy = true;
    setStatus("detecting...");

    try {
        const image = new CVImage(frontImage);

        inferEngine
            .infer(workerId, image)
            .then((predictions) => {
                lastPredictions = predictions || [];
                drawPredictions(lastPredictions);

                if (lastPredictions.length > 0) {
                    setStatus(`detected: ${lastPredictions.length}`);
                } else {
                    setStatus("no crab detected");
                }
            })
            .catch((err) => {
                console.error("Inference error:", err);
                setStatus("inference error");
            })
            .finally(() => {
                inferenceBusy = false;
            });
    } catch (err) {
        console.error("Frame read error:", err);
        setStatus("frame read error");
        inferenceBusy = false;
    }
}

function startLoop() {
    resizeOverlay();

    // Run every 700 ms to reduce browser/API load
    setInterval(runInference, 700);
}

window.addEventListener("resize", resizeOverlay);

frontImage.addEventListener("load", () => {
    resizeOverlay();
});

setStatus("starting model...");

inferEngine
    .startWorker(MODEL_ID, MODEL_VERSION, PUBLISHABLE_KEY)
    .then((id) => {
        workerId = id;
        console.log("Model loaded");
        setStatus("model loaded");
        startLoop();
    })
    .catch((err) => {
        console.error("Model load failed:", err);
        setStatus("model load failed");
    });