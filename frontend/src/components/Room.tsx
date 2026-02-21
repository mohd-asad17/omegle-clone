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
        console.log("added track");
        console.log(localVideoTrack);
        pc.addTrack(localVideoTrack);
      }
      if(localAudioTrack){
        console.log("added track");
        console.log(localAudioTrack);
        pc.addTrack(localAudioTrack);
      } 
      

    pc.onicecandidate = async (e) => {
      console.log("receiving ice candidate locally");
        if (e.candidate) {
          socket.emit("add-ice-candidate", {
            candidate: e.candidate,
            type: "sender",
            roomId
          })
        }
      };

     pc.onnegotiationneeded = async () => {
      console.log("on negotiated needed, sending offer");
       const sdp = await pc.createOffer();
       pc.setLocalDescription(sdp);
         socket.emit("offer", {
           sdp,
           roomId,
         });
     }
    });

    socket.on("offer", async ({ roomId, sdp: remoteSdp }) => {
      console.log("received offer.");
      setLobby(false);
      const pc = new RTCPeerConnection();
     
      pc.setRemoteDescription(remoteSdp);
      const sdp = await pc.createAnswer();
      pc.setLocalDescription(sdp);
      const stream = new MediaStream();
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
      setRemoteMediaStream(stream);

      setReceivingPC(pc);
    

    //  pc.onicecandidate = async (e) => {
    //   console.log("on ice candidate on receiving side.");
    //     if (e.candidate) {
    //       socket.emit("add-ice-candidate", {
    //         candidate: e.candidate,
    //         type: "receiver",
    //       })
    //     }
    //   };

      pc.ontrack = (e) => {
        alert("on Track");
        // if (type === "audio") {
        //   // @ts-expect-error
        //   remoteVideoRef.current?.srcObject.addTrack(track);
        // } else {
        //   // @ts-ignore
        //   remoteVideoRef.current?.srcObject.addTrack(track);
        // }
        // remoteVideoRef.current?.play();
      };
      pc.onicecandidate = async (e) => {
        if(!e.candidate){
          return
        }

        console.log("on ice candidate receiving side");
        if(e.candidate){
          socket.emit("add-ice-candidate", {
            candidate: e.candidate,
            type: "receiver",
            roomId
          })
        }
      }

      socket.emit("answer", {
        roomId,
        sdp: sdp,
      });

      setTimeout(() => {
        const track1 = pc.getTransceivers()[0].receiver.track;
        const track2 = pc.getTransceivers()[1].receiver.track;
        console.log(track1);
        if(track1.kind === "video"){
          setRemoteAudioTrack(track2);
          setRemoteVideoTrack(track1);
        } else {
          setRemoteAudioTrack(track2);
          setRemoteVideoTrack(track1);
        }
        // @ts-ignore
        remoteVideoRef.current?.srcObject.addTrack(track1);
        // @ts-ignore
        remoteVideoRef.current?.srcObject.addTrack(track2);
        remoteVideoRef.current?.play();

      }, 5000)
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
          if(!pc) {
            console.error("receiving pc not found");
          } else {
            console.error(pc.ontrack);
          }
          pc?.addIceCandidate(candidate);
          return pc;
        });
      } else {
        setSendingPC(pc => {
          if(!pc){
            console.error("sending pc not found");
          } else  {
            // console.error(pc.ontrack);
          }
          pc?.addIceCandidate(candidate);
          return pc;
        });
      }
    })

    setSocket(socket);
  }, [name]);

  useEffect(() => {
    if (localVideoRef.current) {
      if (localVideoTrack) {
        localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
        localVideoRef.current.play();
      }
    }
  }, [localVideoRef]);

  return (
    <div>
      hi {name}
      <video autoPlay width={400} height={400} ref={localVideoRef} />
      {lobby ? "Waiting you to connect to Someone": null}
      <br />
      <video autoPlay width={400} height={400} ref={remoteVideoRef} />
    </div>
  );
};