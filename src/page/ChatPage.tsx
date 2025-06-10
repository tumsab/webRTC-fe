import { useEffect, useRef, useState } from 'react'

import '../App.css'
import { useParams } from 'react-router-dom'
import axios from 'axios'

function ChatPage() {


  const [socket, setSocket] = useState<null | WebSocket>(null)
  const remoteVideo = useRef<HTMLVideoElement>(null)
  const localVideo = useRef<HTMLVideoElement>(null)
  const remoteAudio = useRef<HTMLAudioElement>(null)
  const [remoteName , setRemoteName] = useState("");
  const [pc , setPC] = useState<RTCPeerConnection | null>(null)
  
  const {name} = useParams()
  const [videoOn , setVideoNo] = useState(true)
  const [audioOn , setAudioOn] = useState(true)
  const [localStream , setLocalStream] = useState<MediaStream>()
  const [connected , setConnected] = useState(false)
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
    // const res = await axios("https://web-rtc-backend.tumsab.xyz/get-turn-credentials")
    // const turnCredentials = res.data;
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.call.tumsab.xyz" }, // Use STUN first
        { 
          urls: "turn:relay1.expressturn.com:3480", 
          username: "000000002064890723", 
          credential: "tB2WFXTs5dzQ219hv/xQOR4/Mqc="
        } // Fallback to TURN if STUN fails
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
    
            // ✅ Now add any pending ICE candidates
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
      // socket.close()
      // pc.setRemoteDescription(null)
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
                // const videoTrack = event.streams[0].getVideoTracks()[0]
                remoteVideo.current.srcObject = new MediaStream(allTracks);
                remoteVideo.current.play()
            }
  
            if(remoteAudio.current){
                // const audioTrack = event.streams[0].getAudioTracks()[0]
                remoteAudio.current.srcObject = new MediaStream(allTracks)
                remoteAudio.current.play()
            }
      }

      
    }
    // const pc = new RTCPeerConnection();
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
<div className='flex flex-col'>
  <div className='flex flex-col sm:flex-row gap-6'>
    <div className='flex flex-col text-center w-full sm:w-1/2'>
      <video muted ref={localVideo} className='border w-full h-auto sm:w-96 sm:h-96'></video>
      <div>Local Name :{name}</div>
    </div>

    <div className='flex flex-col text-center w-full sm:w-1/2'>
      <video muted ref={remoteVideo} className='border w-full h-auto sm:w-96 sm:h-96'></video>
      <div>Remote Name :{remoteName}</div>
      <audio muted={false} autoPlay ref={remoteAudio}></audio>
    </div>
  </div>

  {wait ? (
    <div className='text-center'>waiting for someone to connect...</div>
  ) : (
    <div></div>
  )}

  <div className='my-8 flex flex-col sm:flex-row gap-6 justify-center'>
    {connected ? (
      <button onClick={handleLeave} className='bg-red-700 px-4 py-2 rounded'>
        Leave
      </button>
    ) : (
      <button
        onClick={handleClick}
        disabled={wait}
        className='bg-indigo-700 hover:bg-indigo-800 px-4 py-2 rounded disabled:opacity-50'
      >
        start
      </button>
    )}
    <button
      onClick={toggleCamera}
      className={`px-4 py-2 rounded ${videoOn ? 'bg-indigo-700' : 'bg-red-700'}`}
    >
      {videoOn ? 'Cam On' : 'Cam Off'}
    </button>
    <button
      onClick={toggleMic}
      className={`px-4 py-2 rounded ${audioOn ? 'bg-indigo-700' : 'bg-red-700'}`}
    >
      {audioOn ? 'Mic On' : 'Mic Off'}
    </button>
  </div>
</div>

  )
}

export default ChatPage