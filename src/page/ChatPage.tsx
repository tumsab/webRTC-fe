import { useEffect, useRef, useState } from 'react'
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Loader2, Users, Wifi, WifiOff } from 'lucide-react'
import { useParams } from 'react-router-dom'

function ChatPage() {
  const [socket, setSocket] = useState<null | WebSocket>(null)
  const remoteVideo = useRef<HTMLVideoElement>(null)
  const localVideo = useRef<HTMLVideoElement>(null)
  const remoteAudio = useRef<HTMLAudioElement>(null)
  const [remoteName, setRemoteName] = useState("");
  const [pc, setPC] = useState<RTCPeerConnection | null>(null)
  
  const {name} = useParams()
  const [videoOn, setVideoNo] = useState(true)
  const [audioOn, setAudioOn] = useState(true)
  const [localStream, setLocalStream] = useState<MediaStream>()
  const [connected, setConnected] = useState(false)
  const pendingIceCandidates: RTCIceCandidateInit[] = [];
  const [wait, setWait] = useState(false)

  function startConnection(){
    const socket = new WebSocket("wss://webrtc-wss-1.onrender.com")
    socket.onopen = ()=>{
      console.log('connected')
      setSocket(socket)
    }
    newPC()
  }

  useEffect(()=>{
    startConnection();
    return ()=>{
      socket?.close()
      pc?.close()
      setPC(null)
    }
  },[])

  async function newPC(){
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.call.tumsab.xyz" },
        { 
          urls: "turn:relay1.expressturn.com:3480", 
          username: "000000002064890723", 
          credential: "tB2WFXTs5dzQ219hv/xQOR4/Mqc="
        }
      ]
    });
    setPC(pc)
    startReceiving()
  }

  if(socket &&pc){
    socket.onmessage = async(message)=>{
      const res = JSON.parse(message.data)

      if(res.type === "gotConnected"){
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.send(JSON.stringify({
                type: 'iceCandidate',
                candidate: event.candidate
            }));
          }
        }

        pc.onnegotiationneeded = () => {
          pc.createOffer().then((offer)=>{
            pc.setLocalDescription(offer).then(()=>{
              const data =  {
                type : "createOffer",
                name : name,
                sdp : pc.localDescription
              }
              socket.send(JSON.stringify(data));
            });
          });
        }
        getCameraStreamAndSend()
        setWait(false)
      }

      if (res.type === 'createAnswer') {
        console.log("recevier sdp: ")
        console.log(res.sdp)
        console.log("Received SDP Answer")
        if (pc.signalingState !== "stable") {
          await pc.setRemoteDescription(new RTCSessionDescription(res.sdp))
        } else {
          console.warn("Skipping duplicate remote description")
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

      if(res.type === "close_conn"){
        if(remoteVideo.current && remoteAudio.current){
          remoteVideo.current.srcObject = null;
          remoteAudio.current.srcObject = null;
        }
        pc.close()
        pc.onicecandidate = null
        setPC(null)
        setRemoteName("")
        handleLeave()
        setConnected(false)
      }

      if(res.type === "waiting"){
        setWait(true)
      }

      pc.ontrack = async(event) => {
        const allTracks = event.streams[0].getTracks()
            if(remoteVideo.current){
                remoteVideo.current.srcObject = new MediaStream(allTracks);
                remoteVideo.current.play()
            }

            if(remoteAudio.current){
                remoteAudio.current.srcObject = new MediaStream(allTracks)
                remoteAudio.current.play()
            }
      }
    }
  }

  const getCameraStreamAndSend = () => {
    navigator.mediaDevices.getUserMedia({ video: true , audio : true }).then((stream) => {
        setLocalStream(stream)
        if(localVideo.current && videoOn){
            localVideo.current.srcObject = stream
            localVideo.current.play()
        }
        if(videoOn){ 
          stream.getTracks().forEach((item)=>{
            console.log("inside track")
            pc?.addTrack(item,stream)
          })           
        }
    });
    setConnected(true)
  }

  function startReceiving() {
    if(pc){
      pc.ontrack = async(event) => {
        const allTracks = event.streams[0].getTracks()
            if(remoteVideo.current){
                remoteVideo.current.srcObject = new MediaStream(allTracks);
                remoteVideo.current.play()
            }

            if(remoteAudio.current){
                remoteAudio.current.srcObject = new MediaStream(allTracks)
                remoteAudio.current.play()
            }
      }
    }
  }

  async function handleClick(){
    const videoTrack = localStream?.getVideoTracks()[0];
    if(videoTrack){
      if(!videoTrack.enabled){
        videoTrack.enabled = true
        setVideoNo(true)
      }
    }

    const audioTrack = localStream?.getAudioTracks()[0]
    if(audioTrack){
      if(!audioTrack.enabled){
        audioTrack.enabled = true
        setAudioOn(true)
      }
    }

    if(socket){
      socket.send(JSON.stringify({type : "init_conn"}))
    }
  }

  function handleLeave(){
    if(!pc){
      return
    }
    pc.close()
      pc.onicecandidate = null
      setPC(null)
    if(socket){
      socket.send(JSON.stringify({type : "close_conn"}))
      setConnected(false)
    }
    const videoTrack = localStream?.getVideoTracks()[0];
    if(!videoTrack){
      return
    }
    if(!videoTrack.enabled){
      videoTrack.enabled = true
      setVideoNo(true)
    }
    if(remoteVideo.current && remoteAudio.current){
      remoteVideo.current.srcObject = null;
      remoteAudio.current.srcObject = null;
    }

    const audioTrack = localStream?.getAudioTracks()[0]
    if(!audioTrack){
      return
    }
    if(!audioTrack.enabled){
      audioTrack.enabled = true
      setAudioOn(true)
    }

    setRemoteName("")
    newPC();
  }

  function toggleCamera(){
    const videoTrack = localStream?.getVideoTracks()[0];
    if(!videoTrack){
      return
    }
    if(videoTrack.enabled){
      videoTrack.enabled = false
      setVideoNo(false)
    } else {
      videoTrack.enabled = true
      setVideoNo(true)
    }
  }

  function toggleMic(){
    const audioTrack = localStream?.getAudioTracks()[0]
    if(!audioTrack){
      return
    }

    if(audioTrack.enabled){
      audioTrack.enabled = false
      setAudioOn(false)
    } else {
      audioTrack.enabled = true
      setAudioOn(true)
    }
  }

  return (
    <div className="w-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <div className="p-3 bg-blue-600 rounded-xl">
              <Video className="w-8 h-8 text-white" />
            </div>
            Video Chat
          </h1>
          <div className="flex items-center justify-center gap-2 text-slate-300">
            {socket ? (
              <>
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span>Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-400" />
                <span>Connecting...</span>
              </>
            )}
          </div>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Local Video */}
          <div className="relative group">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-2xl transition-all duration-300 hover:bg-white/15">
              <div className="relative overflow-hidden rounded-xl bg-slate-800 aspect-video mb-4">
                {!videoOn && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
                    <div className="text-center">
                      <VideoOff className="w-16 h-16 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-300">Camera is off</p>
                    </div>
                  </div>
                )}
                <video 
                  muted 
                  ref={localVideo} 
                  className={`w-full h-full object-cover transition-opacity duration-300 ${!videoOn ? 'opacity-0' : 'opacity-100'}`}
                />
                
                {/* Status Badge */}
                <div className="absolute top-4 left-4">
                  <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    You
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <h3 className="text-xl font-semibold text-white mb-1">{name || 'You'}</h3>
                <p className="text-slate-400">Local Video</p>
              </div>
            </div>
          </div>

          {/* Remote Video */}
          <div className="relative group">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-2xl transition-all duration-300 hover:bg-white/15">
              <div className="relative overflow-hidden rounded-xl bg-slate-800 aspect-video mb-4">
                {!remoteName ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
                    <div className="text-center">
                      <Users className="w-16 h-16 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-300">Waiting for participant...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <video 
                      muted 
                      ref={remoteVideo} 
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Status Badge */}
                    <div className="absolute top-4 left-4">
                      <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        Connected
                      </div>
                    </div>
                  </>
                )}
                <audio muted={false} autoPlay ref={remoteAudio}></audio>
              </div>
              
              <div className="text-center">
                <h3 className="text-xl font-semibold text-white mb-1">
                  {remoteName || 'Waiting...'}
                </h3>
                <p className="text-slate-400">Remote Video</p>
              </div>
            </div>
          </div>
        </div>

        {/* Waiting Status */}
        {wait && (
          <div className="text-center mb-8">
            <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 rounded-xl p-6 max-w-md mx-auto">
              <Loader2 className="w-8 h-8 text-blue-400 mx-auto mb-3 animate-spin" />
              <p className="text-blue-100 text-lg font-medium">Searching for participants...</p>
              <p className="text-blue-200/70 text-sm mt-1">Please wait while we connect you</p>
            </div>
          </div>
        )}

        {/* Control Panel */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-2xl">
          <div className="flex flex-wrap gap-4 justify-center items-center">
            {/* Main Call Button */}
            {connected ? (
              <button 
                onClick={handleLeave}
                className="group bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <PhoneOff className="w-6 h-6 group-hover:animate-pulse" />
                End Call
              </button>
            ) : (
              <button
                onClick={handleClick}
                disabled={wait}
                className="group bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl disabled:hover:shadow-lg transform hover:scale-105 disabled:hover:scale-100"
              >
                {wait ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Phone className="w-6 h-6 group-hover:animate-pulse" />
                    Start Call
                  </>
                )}
              </button>
            )}

            {/* Camera Toggle */}
            <button
              onClick={toggleCamera}
              className={`group p-4 rounded-xl font-medium transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                videoOn 
                  ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {videoOn ? (
                <Video className="w-6 h-6" />
              ) : (
                <VideoOff className="w-6 h-6 group-hover:animate-pulse" />
              )}
              <span className="hidden sm:inline">
                {videoOn ? 'Camera On' : 'Camera Off'}
              </span>
            </button>

            {/* Microphone Toggle */}
            <button
              onClick={toggleMic}
              className={`group p-4 rounded-xl font-medium transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                audioOn 
                  ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {audioOn ? (
                <Mic className="w-6 h-6" />
              ) : (
                <MicOff className="w-6 h-6 group-hover:animate-pulse" />
              )}
              <span className="hidden sm:inline">
                {audioOn ? 'Mic On' : 'Mic Off'}
              </span>
            </button>
          </div>

          {/* Status Indicator */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-slate-300">
              <div className={`w-2 h-2 rounded-full ${socket ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></div>
              {socket ? 'WebSocket Connected' : 'Connecting to server...'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatPage