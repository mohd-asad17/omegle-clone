import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { io, type Socket } from "socket.io-client";

const URL = "http://localhost:3000";
export const Room = ({
    name,
    localAudioTrack,
    localVideoTrack
}: {
    name: string,
    localAudioTrack: MediaStreamTrack | null,
    localVideoTrack: MediaStreamTrack | null
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [socket, setSocket] = useState<null | Socket>(null);
  const [lobby, setLobby] = useState(true);
  const [sendingPC, setSendingPC] = useState<null | RTCPeerConnection>(null);
  const [receivingPC, setReceivingPC] = useState<null | RTCPeerConnection>(null);
  const [remoteVideoTrack, setRemoteVideoTrack] =  useState<MediaStreamTrack | null>(null);
  const [remoteAudioTrack, setRemoteAudioTrack] =  useState<MediaStreamTrack | null>(null);
  const [remoteMediaStream, setRemoteMediaStream] = useState<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>();

  useEffect(() => {
    const socket = io(URL);
    socket.on("send-offer", async ({ roomId }) => {
      console.log("sending offer");
      setLobby(false);
      const pc = new RTCPeerConnection();
      setSendingPC(pc);
      if(localVideoTrack){
        pc.addTrack(localVideoTrack);
      }
      if(localAudioTrack){
        pc.addTrack(localAudioTrack);
      } 
      

    pc.onicecandidate = async (e) => {
      console.log("receiving ice candidate locally");
        if (e.candidate) {
          socket.emit("add-ice-candidate", {
            candidate: e.candidate,
            type: "sender",
          })
        }
      };

     pc.onnegotiationneeded = async () => {
      console.log("on negotiated needed, sending offer");
       const sdp = await pc.createOffer();
         await pc.setLocalDescription(sdp);
         socket.emit("offer", {
           sdp,
           roomId,
         });
     };
    });

    socket.on("offer", async ({ roomId, sdp: remoteSdp }) => {
      console.log("received offer.");
      setLobby(false);
      const pc = new RTCPeerConnection();
      // if (localVideoTrack) {
      //   pc.addTrack(localVideoTrack);
      // }
      // if (localAudioTrack) {
      //   pc.addTrack(localAudioTrack);
      // }
      await pc.setRemoteDescription(remoteSdp);
      const sdp = await pc.createAnswer();
      await pc.setLocalDescription(sdp);
      const stream = new MediaStream();
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
      setRemoteMediaStream(stream);

      setReceivingPC(pc);

     pc.onicecandidate = async (e) => {
      console.log("on ice candidate on receiving side.");
        if (e.candidate) {
          socket.emit("add-ice-candidate", {
            candidate: e.candidate,
            type: "receiver",
          })
        }
      };

      pc.ontrack = ({track, type}) => {
        if (type === "audio") {
          // @ts-expect-error
          remoteVideoRef.current?.srcObject.addTrack(track);
        } else {
          // @ts-ignore
          remoteVideoRef.current?.srcObject.addTrack(track);
        }
        remoteVideoRef.current?.play();
      };

      socket.emit("answer", {
        roomId,
        sdp: sdp,
      });
    });

    socket.on("answer", ({ roomId, sdp: remoteSdp }) => {
      setLobby(false);
      setSendingPC(pc => {
        pc?.setRemoteDescription(remoteSdp)
        return pc;
      })
      console.log("loop closed"); 
    });

    socket.on("lobby", () => {
      setLobby(true);
    });

    socket.on("add-ice-candidate", ({candidate, type}) => {
      console.log("add ice candidate remotely");
      console.log({candidate, type});
      if(type === "sender"){
        setReceivingPC(pc => {
          pc?.addIceCandidate(candidate);
          return pc;
        })
      } else {
        setReceivingPC(pc => {
          pc?.addIceCandidate(candidate);
          return pc;
        })
      }
    })

    setSocket(socket);
  }, [name]);

  useEffect(() => {
    if (localVideoRef.current) {
      if (localVideoTrack) {
        localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
      }
      localVideoRef.current.play();
    }
  }, [localVideoRef]);

  return (
    <div>
      hi {name}
      <video autoPlay width={400} height={400} ref={localVideoRef} />
      {lobby ? "Waiting you to connect to Someone": null}

      <video autoPlay width={400} height={400} ref={remoteVideoRef} />
    </div>
  );
};