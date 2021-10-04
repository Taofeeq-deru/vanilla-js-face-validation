const video = document.getElementById("video");
const button = document.getElementById("button");
const title = document.getElementById("title");
const container = document.getElementById("inner-container");
const emotions = document.getElementById("emotions");
const picCanvas = document.getElementById("canvas");
const message = document.getElementById("message");
const smile = document.getElementById("smile");
const still = document.getElementById("still");
const result = document.getElementById("result");
let imageD = "";
let expCount = 0;
const expression = ["happy", "neutral"];
let detections = {
	smileDetected: false,
	stillDetected: false,
	lifeProofDetected: false,
	faceDetected: true,
	message: "Smile for the camera",
};

function loadModels() {
	return Promise.all([
		faceapi.nets.tinyFaceDetector.loadFromUri("./models"),
		faceapi.nets.faceExpressionNet.loadFromUri("./models"),
	])
		.then(startVideo)
		.catch(
			(err) => (message.innerHTML = "Something went wrong, please try again")
		);
}

function startVideo() {
	navigator.getUserMedia(
		{ video: {} },
		(stream) => {
			window.localStream = stream;
			video.srcObject = stream;
		},
		(err) => setDetections({ ...detections, message: err })
	);
}

function stopVideo() {
	localStream.getVideoTracks()[0].stop();
	video.src = "";
}

function setDetections(obj) {
	detections = { ...obj };
	message.innerHTML = detections?.message;
	smile.style.display = detections?.smileDetected ? "flex" : "none";
	still.style.display = detections?.stillDetected ? "flex" : "none";

	title.innerHTML = detections?.lifeProofDetected
		? "Face captured"
		: "Take picture";
	message.style.display = detections?.lifeProofDetected ? "none" : "flex";
	container.style.display = detections?.lifeProofDetected ? "none" : "flex";
	emotions.style.display = detections?.lifeProofDetected ? "none" : "flex";
	result.style.display = detections?.lifeProofDetected ? "flex" : "none";
	button.style.display = detections?.lifeProofDetected ? "block" : "none";
	result.setAttribute("src", imageD);

	detections?.lifeProofDetected && stopVideo();
}

async function getFullFaceDescription2(blob, inputSize = 416) {
	let scoreThreshold = 0.5;
	const OPTION = new faceapi.TinyFaceDetectorOptions(inputSize, scoreThreshold);

	let img = await faceapi.fetchImage(blob);

	let fullDesc = await faceapi
		.detectAllFaces(img, OPTION)
		.withFaceExpressions();
	return fullDesc;
}

function determineProofOfLife({
	neutral,
	happy,
	sad,
	angry,
	fearful,
	disgusted,
	surprised,
}) {
	//set neutral to be the face expression nad then replace it if other expressions come up with higher scores
	let faceExpression = ["neutral", neutral];

	if (happy > faceExpression[1]) faceExpression = ["happy", happy];
	else if (sad > faceExpression[1]) faceExpression = ["sad", sad];
	else if (angry > faceExpression[1]) faceExpression = ["angry", angry];
	else if (fearful > faceExpression[1]) faceExpression = ["fearful", fearful];
	else if (disgusted > faceExpression[1])
		faceExpression = ["disgusted", disgusted];
	else if (surprised > faceExpression[1])
		faceExpression = ["surprised", surprised];

	//set threshold score of 0.6 else return null
	//if highest score is either angry or disgusted, select surprised as the final result because they are similar..
	//const maxEmotionScore = faceExpression[1];
	//if(faceExpression[0] === "angry") faceExpression = ["surprised", maxEmotionScore];
	return faceExpression[1] >= 0.7 ? faceExpression[0] : null;
}

const delayCapture = (time) => {
	var timer = setInterval(() => {
		webcamCapture();
		clearInterval(timer);
	}, time);
};

function webcamCapture() {
	if (expCount <= 1) {
		var context = picCanvas.getContext("2d");
		picCanvas.width = video.width;
		picCanvas.height = video.height;
		context.drawImage(video, 0, 0, video.width, video.height);

		imageD = picCanvas.toDataURL("image/png");

		handleImage();
	}
}

async function handleImage() {
	if (!imageD) webcamCapture();

	await getFullFaceDescription2(imageD).then(async (fullDesc) => {
		if (fullDesc.length > 1) {
			expCount = 0;
			setDetections({
				...detections,
				smileDetected: false,
				stillDetected: false,
				message: "Just you please",
			});
			webcamCapture();
		} else if (fullDesc.length === 0) {
			if (expCount === 0)
				setDetections({
					...detections,
					message: "Move closer and smile",
				});
			if (expCount === 1)
				setDetections({
					...detections,
					message: "Move closer and stay still",
				});
			webcamCapture();
		} else if (fullDesc.length === 1) {
			const userExpression = await determineProofOfLife(
				fullDesc[0]["expressions"]
			);
			if (expression[expCount] === userExpression) {
				if (expCount === 0) {
					setDetections({
						...detections,
						smileDetected: true,
						message: "Now give a straight face",
					});
				}
				if (expCount === 1) {
					setDetections({
						...detections,
						smileDetected: true,
						stillDetected: true,
						message: "All Done",
					});

					setTimeout(() => {
						setDetections({ ...detections, lifeProofDetected: true });
					}, 800);
				}
				expCount += 1;
				delayCapture(1500);
			} else {
				if (expCount === 0)
					setDetections({ ...detections, message: "Now give a huge smile" });
				if (expCount === 1)
					setDetections({
						...detections,
						message: "Now give a straight face",
					});

				webcamCapture();
			}
		}
	});
}

video.addEventListener("play", () => {
	delayCapture(1000);
});

button.addEventListener("click", () => {
	setDetections({
		smileDetected: false,
		stillDetected: false,
		lifeProofDetected: false,
		faceDetected: true,
		message: "Smile for the camera",
	});
	expCount = 0;
	loadModels();
});

window.addEventListener("load", () => {
	loadModels();
});
