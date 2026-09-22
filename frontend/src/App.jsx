// App.jsx
import { useRef, useState } from 'react'
import Quiz from './Quiz.jsx'
import './App.css'

// ImageCaptureAPI 

function App() {
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [snapFolder, setSnapFolder] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);   // kept alive so the quiz can take proctor snaps

  async function getCameraAccess() {
    // get the camera access using browser feature called navigator, returns media stream that contains the stream of video and audio data, if provided else will navigate to the catch block
    try {
      const videoData = await navigator.mediaDevices.getUserMedia({
        video: true
      });

      streamRef.current = videoData;

      // make
      if (videoRef.current) {
        videoRef.current.srcObject = videoData
      }
      setCameraEnabled(true);
    } catch (error) {
      // alert('Cannot access Camera');
      console.error('Cannot access Camera', error);
    }
  }

  async function enableFullScreen() {
    try {
      const response = await document.documentElement.requestFullscreen();
      setFullScreen(true);
    } catch (error) {
      alert('Cannot access full screen');
    }
  }


  if (quizStarted) return <Quiz stream={streamRef.current} />;

  return (
    <div className="page-container">
      {/* Main Card */}
      <div className="card-container">
        {/* Section 1: Camera / Heimdall */}
        <div className="permission-item">
          <div className="permission-content">
            <h3>Configure Camera</h3>
            <p>Kindly configure Camera to attempt quiz/contests.</p>
            <div className="action-row">
              <button
                className="btn btn-black"
                disabled={cameraEnabled}
                onClick={getCameraAccess}
              >
                {cameraEnabled ? 'Camera Connected' : 'Get Camera Access'}
              </button>

              {/* Hidden/Active Video Feed Preview */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className={`video-preview`}
              />
            </div>
          </div>
        </div>

        <div className="divider"></div>

        {/* Section 2: Where proctoring snaps are saved */}
        <div className="permission-item">
          <div className="permission-content">
            <h3>Proctoring</h3>
            <p>
              Your camera is captured every 5 seconds during the exam.
              {snapFolder ? ` Saving to: ${snapFolder}` : ' Saving to the default frontend folder.'}
            </p>
            <div className="action-row">
              <button
                className="btn btn-secondary"
                onClick={async () => setSnapFolder(await window.athena.selectSnapFolder() || '')}
              >
                Choose Snap Folder
              </button>
              <button className="btn btn-outline" onClick={() => window.athena.showRules()}>
                Read Rules
              </button>
            </div>
          </div>
        </div>

        <div className="divider"></div>

        {/* Section 3: Fullscreen */}
        <div className="permission-item">
          <div className="permission-content">
            <h3>Switch to full screen</h3>
            <button
              className="btn btn-primary"
              disabled={fullScreen}
              onClick={() => {
                enableFullScreen();
              }}
            >
              {fullScreen ? 'Full Screen Enabled' : 'Give Full Screen Permissions'}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="bottom-actions">
        <button
          className="btn btn-primary"
          disabled={!cameraEnabled || !fullScreen}
          onClick={() => setQuizStarted(true)}
        >
          Go To Test
        </button>
      </div>

    </div>
  );
}

export default App

