"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserManager = void 0;
const roomManager_1 = require("./roomManager");
class UserManager {
    constructor() {
        this.users = [];
        this.queue = [];
        this.roomManager = new roomManager_1.RoomManager();
    }
    addUser(socket, name) {
        this.users.push({
            socket,
            name,
        });
        this.queue.push(socket.id);
        socket.emit("lobby");
        this.clearQueue();
        this.initHandlers(socket);
    }
    removeUser(socketId) {
        const user = this.users.find(x => x.socket.id === socketId);
        this.users = this.users.filter((x) => x.socket.id !== socketId);
        this.queue = this.queue.filter(x => x === socketId);
    }
    clearQueue() {
        console.log("inside clear queue");
        console.log(this.users.length);
        if (this.users.length < 2 || this.queue.length < 2) {
            return;
        }
        const id1 = this.queue.pop();
        const id2 = this.queue.pop();
        console.log("id is " + id1 + " " + id2);
        const user1 = this.users.find((x) => x.socket.id === id1);
        const user2 = this.users.find((x) => x.socket.id === id2);
        if (!user1 || !user2) {
            return;
        }
        console.log("creating room");
        const room = this.roomManager.createRoom(user1, user2);
        this.clearQueue();
    }
    initHandlers(socket) {
        socket.on("offer", ({ sdp, roomId }) => {
            console.log("offer received");
            console.log(roomId);
            this.roomManager.onOffer(roomId, sdp, socket.id);
        });
        socket.on("answer", ({ sdp, roomId }) => {
            console.log("answer recieved");
            this.roomManager.onAnswer(roomId, sdp, socket.id);
        });
        socket.on("add-ice-candidate", ({ candidate, roomId, type }) => {
            this.roomManager.onIceCandidate(roomId, socket.id, candidate, type);
        });
    }
}
exports.UserManager = UserManager;
