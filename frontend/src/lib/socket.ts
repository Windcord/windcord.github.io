import { io, type Socket } from "socket.io-client";
import { getSocketUrl } from "./runtimeConfig";

let socket: Socket | null = null;
const socketUrl = getSocketUrl();

export const getSocket = (): Socket | null => socket;

export const connectSocket = (token: string): Socket => {
  if (socket) {
    socket.auth = { token };
    return socket;
  }

  socket = io(socketUrl, {
    auth: { token },
    withCredentials: true
  });

  return socket;
};

export const disconnectSocket = (): void => {
  socket?.disconnect();
  socket = null;
};
