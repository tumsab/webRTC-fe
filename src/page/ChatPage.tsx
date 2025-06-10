import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  ArrowLeft, 
  Loader2,
  User,
  PhoneCall
} from 'lucide-react';

function ChatPage() {
  const [socket, setSocket] = useState<null | WebSocket>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);
  const [remoteName, setRemoteName] = useState("");
  const [pc, setPC] = useState<RTCPeerConnection | null>(null);
  
  const { name } = useParams();
  const navigate = useNavigate();
  const [videoOn, setVideoNo] = useState(true);
  const [audioOn, setAudioOn] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream>();
  const [connected, setConnected] = useState(false);
  const pendingIceCandidates: RTCIceCandidateInit[] = [];
  const [wait, setWait] = useState(false);

  function startConnection() {
    const socket = new WebSocket("ws://localhost:8080");
    socket.onopen = () => {
      console.log('connected');
      setSocket(socket);
    };
    newPC();
  }

  useEffect(() => {
    startConnection();
    return () => {
      socket?.close();
      pc?.close();
      setPC(null);
    };
  }, []);

  async function newPC() {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun01.sipphone.com" },
        { 
          urls: "turn:relay1.expressturn.com:3480", 
          username: "000000002064890723", 
          credential: "tB2WFXTs5dzQ219hv/xQOR4/Mqc=" 
        }
      ]
    });
    setPC(pc);
    startReceiving();
  }

  if (socket && pc) {
    socket.onmessage = async (message) => {
      const res = JSON.parse(message.data);

      if (res.type === "gotConnected") {
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.send(JSON.stringify({
              type: 'iceCandidate',
              candidate: event.candidate
            }));
          }
        };

        pc.onnegotiationneeded = () => {
          pc.createOffer().then((offer) => {
            pc.setLocalDescription(offer).then(() => {
              const data = {
                type: "createOffer",
                name: name,
                sdp: pc.localDescription
              };
              socket.send(JSON.stringify(data));
            });
          });
        };
        getCameraStreamAndSend();
        setWait(false);
      }

      if (res.type === 'createAnswer') {
        console.log("receiver sdp: ");
        console.log(res.sdp);
        console.log("Received SDP Answer");
        if (pc.signalingState !== "stable") {
          await pc.setRemoteDescription(new RTCSessionDescription(res.sdp));
        } else {
          console.warn("Skipping duplicate remote description");
        }
      }

      if (res.type === 'iceCandidate') {
        try {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(res.candidate);
          } else {
            console.warn("ICE candidate received before SDP, storing for later");
            pendingIceCandidates.push(res.candidate);
          }
        } catch (err) {
          console.error("Failed to add ICE Candidate:", err);
        }
      }

      if (res.type === 'createOffer') {
        setRemoteName(res.name);

        if (pc.signalingState === "stable") {
          await pc.setRemoteDescription(new RTCSessionDescription(res.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.send(JSON.stringify({
            type: 'createAnswer',
            sdp: answer
          }));

          while (pendingIceCandidates.length > 0) {
            const candidate = pendingIceCandidates.shift();
            await pc.addIceCandidate(candidate);
          }
        } else {
          console.warn("Skipping duplicate offer");
        }
      }

      if (res.type === "close_conn") {
        if (remoteVideo.current && remoteAudio.current) {
          remoteVideo.current.srcObject = null;
          remoteAudio.current.srcObject = null;
        }
        pc.close();
        pc.onicecandidate = null;
        setPC(null);
        setRemoteName("");
        handleLeave();
        setConnected(false);
      }

      if (res.type === "waiting") {
        setWait(true);
      }

      pc.ontrack = async (event) => {
        const allTracks = event.streams[0].getTracks();
        if (remoteVideo.current) {
          remoteVideo.current.srcObject = new MediaStream(allTracks);
          remoteVideo.current.play();
        }

        if (remoteAudio.current) {
          remoteAudio.current.srcObject = new MediaStream(allTracks);
          remoteAudio.current.play();
        }
      };
    };
  }

  const getCameraStreamAndSend = () => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      setLocalStream(stream);
      if (localVideo.current && videoOn) {
        localVideo.current.srcObject = stream;
        localVideo.current.play();
      }
      if (videoOn) {
        stream.getTracks().forEach((item) => {
          console.log("inside track");
          pc?.addTrack(item, stream);
        });
      }
    });
    setConnected(true);
  };

  function startReceiving() {
    if (pc) {
      pc.ontrack = async (event) => {
        const allTracks = event.streams[0].getTracks();
        if (remoteVideo.current) {
          remoteVideo.current.srcObject = new MediaStream(allTracks);
          remoteVideo.current.play();
        }

        if (remoteAudio.current) {
          remoteAudio.current.srcObject = new MediaStream(allTracks);
          remoteAudio.current.play();
        }
      };
    }
  }

  async function handleClick() {
    const videoTrack = localStream?.getVideoTracks()[0];
    if (videoTrack) {
      if (!videoTrack.enabled) {
        videoTrack.enabled = true;
        setVideoNo(true);
      }
    }

    const audioTrack = localStream?.getAudioTracks()[0];
    if (audioTrack) {
      if (!audioTrack.enabled) {
        audioTrack.enabled = true;
        setAudioOn(true);
      }
    }

    if (socket) {
      socket.send(JSON.stringify({ type: "init_conn" }));
    }
  }

  function handleLeave() {
    if (!pc) {
      return;
    }
    pc.close();
    pc.onicecandidate = null;
    setPC(null);
    if (socket) {
      socket.send(JSON.stringify({ type: "close_conn" }));
      setConnected(false);
    }
    const videoTrack = localStream?.getVideoTracks()[0];
    if (!videoTrack) {
      return;
    }
    if (!videoTrack.enabled) {
      videoTrack.enabled = true;
      setVideoNo(true);
    }
    if (remoteVideo.current && remoteAudio.current) {
      remoteVideo.current.srcObject = null;
      remoteAudio.current.srcObject = null;
    }

    const audioTrack = localStream?.getAudioTracks()[0];
    if (!audioTrack) {
      return;
    }
    if (!audioTrack.enabled) {
      audioTrack.enabled = true;
      setAudioOn(true);
    }

    setRemoteName("");
    newPC();
  }

  function toggleCamera() {
    const videoTrack = localStream?.getVideoTracks()[0];
    if (!videoTrack) {
      return;
    }
    if (videoTrack.enabled) {
      videoTrack.enabled = false;
      setVideoNo(false);
    } else {
      videoTrack.enabled = true;
      setVideoNo(true);
    }
  }

  function toggleMic() {
    const audioTrack = localStream?.getAudioTracks()[0];
    if (!audioTrack) {
      return;
    }

    if (audioTrack.enabled) {
      audioTrack.enabled = false;
      setAudioOn(false);
    } else {
      audioTrack.enabled = true;
      setAudioOn(true);
    }
  }

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="w-screen p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleGoHome}
          className="flex items-center space-x-2 text-white hover:text-purple-300 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Home</span>
        </button>
        <h1 className="text-2xl font-bold text-white">VideoConnect</h1>
        <div></div>
      </div>

      {/* Main Content */}
      <div className="w-full">
        {/* Video Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Local Video */}
          <div className="relative">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
              <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden">
                <video 
                  muted 
                  ref={localVideo} 
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                ></video>
                {!videoOn && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="text-center text-white">
                      <User className="h-16 w-16 mx-auto mb-2 opacity-50" />
                      <p className="text-sm opacity-75">Camera Off</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-white font-medium">{name} (You)</span>
                </div>
                <div className="flex space-x-1">
                  {videoOn ? (
                    <Video className="h-4 w-4 text-green-400" />
                  ) : (
                    <VideoOff className="h-4 w-4 text-red-400" />
                  )}
                  {audioOn ? (
                    <Mic className="h-4 w-4 text-green-400" />
                  ) : (
                    <MicOff className="h-4 w-4 text-red-400" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Remote Video */}
          <div className="relative">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
              <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden">
                <video 
                  muted 
                  ref={remoteVideo} 
                  className="w-full h-full object-cover"
                ></video>
                <audio muted={false} autoPlay ref={remoteAudio}></audio>
                {!remoteName && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="text-center text-white">
                      <User className="h-16 w-16 mx-auto mb-2 opacity-50" />
                      <p className="text-sm opacity-75">Waiting for connection...</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center space-x-2">
                  {remoteName ? (
                    <>
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-white font-medium">{remoteName}</span>
                    </>
                  ) : (
                    <>
                      <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                      <span className="text-gray-400">No connection</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {wait && (
          <div className="text-center mb-6">
            <div className="bg-yellow-500/20 backdrop-blur-lg rounded-lg p-4 border border-yellow-500/30 inline-block">
              <div className="flex items-center space-x-3 text-yellow-200">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Waiting for someone to connect...</span>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center space-x-4">
              {/* Camera Toggle */}
              <button
                onClick={toggleCamera}
                className={`p-4 rounded-full transition-all transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent ${
                  videoOn 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white focus:ring-gray-500' 
                    : 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500'
                }`}
                title={videoOn ? 'Turn off camera' : 'Turn on camera'}
              >
                {videoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
              </button>

              {/* Microphone Toggle */}
              <button
                onClick={toggleMic}
                className={`p-4 rounded-full transition-all transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent ${
                  audioOn 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white focus:ring-gray-500' 
                    : 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500'
                }`}
                title={audioOn ? 'Mute microphone' : 'Unmute microphone'}
              >
                {audioOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
              </button>

              {/* Call/Leave Button */}
              {connected ? (
                <button
                  onClick={handleLeave}
                  className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full transition-all transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-transparent"
                  title="Leave call"
                >
                  <Phone className="h-6 w-6 transform rotate-135" />
                </button>
              ) : (
                <button
                  onClick={handleClick}
                  disabled={wait}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white p-4 rounded-full transition-all transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:transform-none"
                  title="Start call"
                >
                  <PhoneCall className="h-6 w-6" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;