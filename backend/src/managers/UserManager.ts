import { Socket } from "socket.io";
import { RoomManager } from "./roomManager";

export interface User {
  socket: Socket;
  name: string;
}

export class UserManager {
  private users: User[];
  private queue: string[];
  private roomManager: RoomManager;
  constructor() {
    this.users = [];
    this.queue = [];
    this.roomManager = new RoomManager();
  }

  addUser(socket: Socket, name: string) {
    this.users.push({
      socket,
      name,
    });
    this.queue.push(socket.id);
    socket.send("lobby");
    this.clearQueue();
    this.initHandlers(socket);
  }

  removeUser(socketId: string) {
    const user = this.users.find(x => x.socket.id == socketId);

    this.users = this.users.filter((x) => x.socket.id !== socketId);
    this.queue = this.queue.filter(x => x !== socketId);
  }

  clearQueue() {
    console.log("inside queue");
    console.log(this.users.length);
    if (this.users.length < 2 || this.queue.length < 2) {
      return;
    }
  
    const id1 = this.queue.shift();
    const id2 = this.queue.shift()
    console.log("id is"+ id1 + " " + id2);
    const user1 = this.users.find((x) => x.socket.id === id1);
    const user2 = this.users.find((x) => x.socket.id === id2);
    if (!user1 || !user2) {
      return;
    }

    console.log("creating room");
    const room = this.roomManager.createRoom(user1, user2);
    this.clearQueue();
  }

  initHandlers(socket: Socket) {
    socket.on("offer", ({ sdp, roomId }: { sdp: string; roomId: string }) => {
      console.log("offer received");
      console.log(roomId);
      this.roomManager.onOffer(roomId, sdp, socket.id);
    });

    socket.on("answer", ({ sdp, roomId }: { sdp: string; roomId: string }) => {
      console.log("answer recieved");
      this.roomManager.onAnswer(roomId, sdp, socket.id);
    });

    socket.on("add-ice-candidate", ({candidate, roomId, type}) => {
      this.roomManager.onIceCandidate(roomId, socket.id, candidate, type);
    });

  }
}
